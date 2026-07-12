-- Protect survey history and make public submissions atomic and idempotent.
-- This migration is append-only and does not delete existing responses or answers.

ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS is_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_token uuid;

-- Responses created by the old two-request flow are complete only when at least
-- one answer exists. Empty orphan responses remain available for diagnosis but
-- are excluded from reports after the application update.
UPDATE public.responses AS response
SET is_complete = EXISTS (
  SELECT 1
  FROM public.answers AS answer
  WHERE answer.response_id = response.id
)
WHERE response.is_complete IS DISTINCT FROM (EXISTS (
  SELECT 1
  FROM public.answers AS answer
  WHERE answer.response_id = response.id
));

CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_submission_token
  ON public.responses (submission_token)
  WHERE submission_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_responses_complete_survey_submitted
  ON public.responses (survey_id, submitted_at DESC)
  WHERE is_complete = true;

CREATE INDEX IF NOT EXISTS idx_answers_response_question
  ON public.answers (response_id, question_id);

CREATE INDEX IF NOT EXISTS idx_answers_question_id
  ON public.answers (question_id);

CREATE OR REPLACE FUNCTION public.protect_answered_question_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.answers WHERE question_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'answered_question_delete_forbidden'
        USING ERRCODE = 'P0001',
              HINT = 'Archive the answered question instead of deleting it.';
    END IF;

    RETURN OLD;
  END IF;

  IF (
    NEW.text IS DISTINCT FROM OLD.text
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.options IS DISTINCT FROM OLD.options
  ) AND EXISTS (
    SELECT 1 FROM public.answers WHERE question_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'answered_question_semantic_update_forbidden'
      USING ERRCODE = 'P0001',
            HINT = 'Create a new question version and archive the answered version.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_answered_question_history ON public.questions;
CREATE TRIGGER protect_answered_question_history
BEFORE UPDATE OR DELETE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.protect_answered_question_history();

CREATE OR REPLACE FUNCTION public.protect_survey_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.responses WHERE survey_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'answered_survey_delete_forbidden'
        USING ERRCODE = 'P0001',
              HINT = 'Close the survey instead of deleting its response history.';
    END IF;

    RETURN OLD;
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'survey_owner_change_forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_survey_history ON public.surveys;
CREATE TRIGGER protect_survey_history
BEFORE UPDATE OR DELETE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.protect_survey_history();

CREATE OR REPLACE FUNCTION public.validate_survey_answer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  response_survey_id uuid;
  question_record public.questions%ROWTYPE;
  choices jsonb;
BEGIN
  SELECT survey_id
  INTO response_survey_id
  FROM public.responses
  WHERE id = NEW.response_id;

  IF response_survey_id IS NULL THEN
    RAISE EXCEPTION 'answer_response_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT *
  INTO question_record
  FROM public.questions
  WHERE id = NEW.question_id;

  IF NOT FOUND OR question_record.survey_id IS DISTINCT FROM response_survey_id THEN
    RAISE EXCEPTION 'answer_question_survey_mismatch' USING ERRCODE = '23514';
  END IF;

  IF question_record.is_archived OR question_record.type = 'section'::public.question_type THEN
    RAISE EXCEPTION 'answer_question_not_accepting_responses' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.answers
    WHERE response_id = NEW.response_id
      AND question_id = NEW.question_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'duplicate_answer_for_question' USING ERRCODE = '23505';
  END IF;

  IF question_record.type IN ('likert'::public.question_type, 'rating'::public.question_type) THEN
    IF NEW.numeric_value IS NULL THEN
      IF btrim(COALESCE(NEW.value, '')) !~ '^[1-5]$' THEN
        RAISE EXCEPTION 'numeric_answer_out_of_range' USING ERRCODE = '23514';
      END IF;
      NEW.numeric_value := btrim(NEW.value)::integer;
    END IF;

    IF NEW.numeric_value < 1 OR NEW.numeric_value > 5 THEN
      RAISE EXCEPTION 'numeric_answer_out_of_range' USING ERRCODE = '23514';
    END IF;

    NEW.value := NEW.numeric_value::text;
  ELSIF question_record.type = 'mcq'::public.question_type THEN
    NEW.value := btrim(COALESCE(NEW.value, ''));
    NEW.numeric_value := NULL;

    choices := CASE
      WHEN jsonb_typeof(question_record.options) = 'array' THEN question_record.options
      WHEN jsonb_typeof(question_record.options -> 'choices') = 'array' THEN question_record.options -> 'choices'
      ELSE '[]'::jsonb
    END;

    IF NEW.value = '' OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(choices) AS allowed(choice)
      WHERE btrim(allowed.choice) = NEW.value
    ) THEN
      RAISE EXCEPTION 'mcq_answer_not_in_options' USING ERRCODE = '23514';
    END IF;
  ELSE
    NEW.value := btrim(COALESCE(NEW.value, ''));
    NEW.numeric_value := NULL;

    IF length(NEW.value) > 10000 THEN
      RAISE EXCEPTION 'text_answer_too_long' USING ERRCODE = '22001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_survey_answer ON public.answers;
CREATE TRIGGER validate_survey_answer
BEFORE INSERT OR UPDATE OF response_id, question_id, value, numeric_value
ON public.answers
FOR EACH ROW
EXECUTE FUNCTION public.validate_survey_answer();

CREATE OR REPLACE FUNCTION public.submit_survey_response(
  p_survey_id uuid,
  p_answers jsonb,
  p_submission_token uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  survey_record public.surveys%ROWTYPE;
  answer_item jsonb;
  response_id_value uuid;
  existing_response record;
BEGIN
  SELECT *
  INTO survey_record
  FROM public.surveys
  WHERE id = p_survey_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'survey_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF survey_record.status IS DISTINCT FROM 'active'::public.survey_status
     OR (survey_record.start_date IS NOT NULL AND survey_record.start_date > now())
     OR (survey_record.end_date IS NOT NULL AND survey_record.end_date < now()) THEN
    RAISE EXCEPTION 'survey_not_accepting_responses' USING ERRCODE = 'P0001';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'answers_must_be_an_array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_answers) = 0 OR jsonb_array_length(p_answers) > 500 THEN
    RAISE EXCEPTION 'invalid_answer_count' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) AS submitted(item)
    WHERE jsonb_typeof(submitted.item) <> 'object'
       OR COALESCE(submitted.item ->> 'question_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'invalid_answer_question_id' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT submitted.item ->> 'question_id'
    FROM jsonb_array_elements(p_answers) AS submitted(item)
    GROUP BY submitted.item ->> 'question_id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_answer_question_id' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) AS submitted(item)
    LEFT JOIN public.questions AS question
      ON question.id = (submitted.item ->> 'question_id')::uuid
    WHERE question.id IS NULL
       OR question.survey_id IS DISTINCT FROM p_survey_id
       OR question.is_archived
       OR question.type = 'section'::public.question_type
  ) THEN
    RAISE EXCEPTION 'answer_contains_invalid_question' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.questions AS required_question
    WHERE required_question.survey_id = p_survey_id
      AND NOT required_question.is_archived
      AND required_question.type <> 'section'::public.question_type
      AND required_question.is_required
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_answers) AS submitted(item)
        WHERE submitted.item ->> 'question_id' = required_question.id::text
          AND (
            NULLIF(btrim(submitted.item ->> 'value'), '') IS NOT NULL
            OR NULLIF(btrim(submitted.item ->> 'numeric_value'), '') IS NOT NULL
          )
      )
  ) THEN
    RAISE EXCEPTION 'required_answers_missing' USING ERRCODE = '23514';
  END IF;

  IF p_submission_token IS NOT NULL THEN
    SELECT id, survey_id, is_complete
    INTO existing_response
    FROM public.responses
    WHERE submission_token = p_submission_token;

    IF FOUND THEN
      IF existing_response.survey_id IS DISTINCT FROM p_survey_id THEN
        RAISE EXCEPTION 'submission_token_already_used' USING ERRCODE = '23505';
      END IF;

      IF existing_response.is_complete THEN
        RETURN existing_response.id;
      END IF;

      RAISE EXCEPTION 'incomplete_submission_token_conflict' USING ERRCODE = '23505';
    END IF;
  END IF;

  response_id_value := gen_random_uuid();

  INSERT INTO public.responses (
    id,
    survey_id,
    respondent_id,
    submitted_at,
    is_complete,
    submission_token
  ) VALUES (
    response_id_value,
    p_survey_id,
    CASE WHEN COALESCE(survey_record.is_anonymous, true) THEN NULL ELSE auth.uid() END,
    now(),
    false,
    p_submission_token
  );

  FOR answer_item IN
    SELECT submitted.item
    FROM jsonb_array_elements(p_answers) AS submitted(item)
  LOOP
    INSERT INTO public.answers (
      response_id,
      question_id,
      value,
      numeric_value
    ) VALUES (
      response_id_value,
      (answer_item ->> 'question_id')::uuid,
      answer_item ->> 'value',
      NULLIF(btrim(answer_item ->> 'numeric_value'), '')::integer
    );
  END LOOP;

  UPDATE public.responses
  SET is_complete = true
  WHERE id = response_id_value;

  RETURN response_id_value;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_survey_response(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(uuid, jsonb, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_survey_questions(
  p_survey_id uuid,
  p_questions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  survey_record public.surveys%ROWTYPE;
  existing_question public.questions%ROWTYPE;
  question_item jsonb;
  question_id_value uuid;
  persisted_id uuid;
  question_text_value text;
  question_type_value text;
  question_options_value jsonb;
  question_choices_value jsonb;
  question_order_value integer;
  question_required_value boolean;
  result_value jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO survey_record
  FROM public.surveys
  WHERE id = p_survey_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'survey_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF survey_record.created_by IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'dean'::public.app_role)
     AND NOT public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey_record.program_id)
     AND NOT public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey_record.program_id) THEN
    RAISE EXCEPTION 'survey_question_management_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_questions IS NULL OR jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'questions_must_be_an_array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_questions) > 500 THEN
    RAISE EXCEPTION 'too_many_questions' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_questions) AS submitted(item)
    WHERE jsonb_typeof(submitted.item) <> 'object'
       OR COALESCE(submitted.item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR COALESCE(submitted.item ->> 'order_index', '') !~ '^[0-9]+$'
       OR submitted.item ->> 'type' NOT IN ('section', 'likert', 'text', 'mcq', 'rating')
       OR length(btrim(COALESCE(submitted.item ->> 'text', ''))) = 0
       OR length(btrim(COALESCE(submitted.item ->> 'text', ''))) > 2000
  ) THEN
    RAISE EXCEPTION 'invalid_question_payload' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT submitted.item ->> 'id'
    FROM jsonb_array_elements(p_questions) AS submitted(item)
    GROUP BY submitted.item ->> 'id'
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT submitted.item ->> 'order_index'
    FROM jsonb_array_elements(p_questions) AS submitted(item)
    GROUP BY submitted.item ->> 'order_index'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_question_id_or_order' USING ERRCODE = '22023';
  END IF;

  -- Lock current active questions so concurrent saves cannot interleave.
  PERFORM id
  FROM public.questions
  WHERE survey_id = p_survey_id
    AND NOT is_archived
  FOR UPDATE;

  FOR question_item IN
    SELECT submitted.item
    FROM jsonb_array_elements(p_questions) AS submitted(item)
    ORDER BY (submitted.item ->> 'order_index')::integer
  LOOP
    question_id_value := (question_item ->> 'id')::uuid;
    question_text_value := btrim(question_item ->> 'text');
    question_type_value := question_item ->> 'type';
    question_order_value := (question_item ->> 'order_index')::integer;
    question_required_value := question_type_value <> 'section'
      AND COALESCE((question_item ->> 'is_required')::boolean, true);
    question_options_value := CASE
      WHEN NOT (question_item ? 'options') OR question_item -> 'options' = 'null'::jsonb THEN NULL
      ELSE question_item -> 'options'
    END;

    IF question_type_value = 'mcq' THEN
      question_choices_value := CASE
        WHEN jsonb_typeof(question_options_value) = 'array' THEN question_options_value
        WHEN jsonb_typeof(question_options_value -> 'choices') = 'array' THEN question_options_value -> 'choices'
        ELSE '[]'::jsonb
      END;

      IF jsonb_array_length(question_choices_value) = 0 THEN
        RAISE EXCEPTION 'mcq_question_requires_options' USING ERRCODE = '23514';
      END IF;
    END IF;

    SELECT *
    INTO existing_question
    FROM public.questions
    WHERE id = question_id_value
      AND survey_id = p_survey_id;

    IF FOUND THEN
      IF (
        existing_question.text IS DISTINCT FROM question_text_value
        OR existing_question.type::text IS DISTINCT FROM question_type_value
        OR existing_question.options IS DISTINCT FROM question_options_value
      ) AND EXISTS (
        SELECT 1 FROM public.answers WHERE question_id = existing_question.id
      ) THEN
        persisted_id := gen_random_uuid();

        INSERT INTO public.questions (
          id,
          survey_id,
          text,
          type,
          options,
          order_index,
          is_required,
          is_archived
        ) VALUES (
          persisted_id,
          p_survey_id,
          question_text_value,
          question_type_value::public.question_type,
          question_options_value,
          question_order_value,
          question_required_value,
          false
        );

        UPDATE public.questions
        SET is_archived = true
        WHERE id = existing_question.id;
      ELSE
        persisted_id := existing_question.id;

        UPDATE public.questions
        SET text = question_text_value,
            type = question_type_value::public.question_type,
            options = question_options_value,
            order_index = question_order_value,
            is_required = question_required_value,
            is_archived = false
        WHERE id = existing_question.id;
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.questions WHERE id = question_id_value
      ) THEN
        RAISE EXCEPTION 'question_id_belongs_to_another_survey' USING ERRCODE = '23505';
      END IF;

      persisted_id := question_id_value;

      INSERT INTO public.questions (
        id,
        survey_id,
        text,
        type,
        options,
        order_index,
        is_required,
        is_archived
      ) VALUES (
        persisted_id,
        p_survey_id,
        question_text_value,
        question_type_value::public.question_type,
        question_options_value,
        question_order_value,
        question_required_value,
        false
      );
    END IF;

    result_value := result_value || jsonb_build_array(
      jsonb_build_object(
        'input_id', question_id_value,
        'persisted_id', persisted_id
      )
    );
  END LOOP;

  UPDATE public.questions AS existing
  SET is_archived = true
  WHERE existing.survey_id = p_survey_id
    AND NOT existing.is_archived
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_questions) AS submitted(item)
      WHERE submitted.item ->> 'id' = existing.id::text
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(result_value) AS persisted(item)
      WHERE persisted.item ->> 'persisted_id' = existing.id::text
    )
    AND EXISTS (
      SELECT 1 FROM public.answers WHERE question_id = existing.id
    );

  DELETE FROM public.questions AS existing
  WHERE existing.survey_id = p_survey_id
    AND NOT existing.is_archived
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_questions) AS submitted(item)
      WHERE submitted.item ->> 'id' = existing.id::text
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(result_value) AS persisted(item)
      WHERE persisted.item ->> 'persisted_id' = existing.id::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.answers WHERE question_id = existing.id
    );

  RETURN result_value;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_survey_questions(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_survey_questions(uuid, jsonb) TO authenticated;

COMMENT ON COLUMN public.responses.is_complete IS
  'True only after the response and all submitted answers are committed successfully.';

COMMENT ON COLUMN public.responses.submission_token IS
  'Client-generated idempotency token used to prevent duplicate survey submissions.';

COMMENT ON FUNCTION public.submit_survey_response(uuid, jsonb, uuid) IS
  'Validates and commits one response and all answers atomically.';

COMMENT ON FUNCTION public.sync_survey_questions(uuid, jsonb) IS
  'Synchronizes survey questions transactionally and versions answered questions instead of overwriting history.';
