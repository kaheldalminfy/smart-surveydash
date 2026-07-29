-- 1) Audit log table
CREATE TABLE public.response_purge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid,
  program_id uuid,
  question_id uuid,
  course_name text NOT NULL,
  actual_students integer NOT NULL,
  responses_before integer NOT NULL,
  responses_after integer NOT NULL,
  deleted_count integer NOT NULL,
  deleted_response_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  performed_by uuid,
  performed_by_name text,
  performed_by_email text,
  performed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.response_purge_log TO authenticated;
GRANT ALL ON public.response_purge_log TO service_role;

ALTER TABLE public.response_purge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and deans view all purge logs"
  ON public.response_purge_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dean'));

CREATE POLICY "Users view their own purge logs"
  ON public.response_purge_log FOR SELECT TO authenticated
  USING (performed_by = auth.uid());

-- 2) Allow deletions only inside the approved purge routine
CREATE OR REPLACE FUNCTION public.prevent_answer_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.allow_response_purge', true), '') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'لا يمكن حذف الإجابات مباشرة للحفاظ على سلامة البيانات.';
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_response_deletion_with_answers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  answer_count INTEGER;
BEGIN
  IF coalesce(current_setting('app.allow_response_purge', true), '') = 'on' THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*) INTO answer_count FROM public.answers WHERE response_id = OLD.id;

  IF answer_count > 0 THEN
    RAISE EXCEPTION 'لا يمكن حذف الاستجابة لأنها تحتوي على % إجابة.', answer_count;
  END IF;

  RETURN OLD;
END;
$$;

-- 3) Purge function
CREATE OR REPLACE FUNCTION public.purge_excess_responses(
  p_survey_id uuid,
  p_question_id uuid,
  p_filter_values text[],
  p_actual_students integer,
  p_course_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_program_id uuid;
  v_allowed boolean := false;
  v_before integer;
  v_deleted uuid[];
  v_deleted_count integer;
  v_log_id uuid;
  v_norm text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_survey_id IS NULL OR p_question_id IS NULL THEN
    RAISE EXCEPTION 'survey_and_question_required';
  END IF;
  IF p_course_name IS NULL OR btrim(p_course_name) = '' THEN
    RAISE EXCEPTION 'course_name_required';
  END IF;
  IF p_filter_values IS NULL OR array_length(p_filter_values, 1) IS NULL THEN
    RAISE EXCEPTION 'course_selection_required';
  END IF;
  IF p_actual_students IS NULL OR p_actual_students < 0 THEN
    RAISE EXCEPTION 'actual_students_required';
  END IF;

  SELECT program_id INTO v_program_id FROM public.surveys WHERE id = p_survey_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'survey_not_found';
  END IF;

  v_allowed := public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'dean')
    OR (v_program_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_uid
        AND ur.role IN ('coordinator', 'program_manager', 'faculty')
        AND (ur.program_id = v_program_id OR ur.program_id IS NULL)
    ));

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.id = p_question_id AND q.survey_id = p_survey_id) THEN
    RAISE EXCEPTION 'question_not_in_survey';
  END IF;

  SELECT array_agg(btrim(v)) INTO v_norm FROM unnest(p_filter_values) AS v;

  CREATE TEMP TABLE _matched_responses ON COMMIT DROP AS
  SELECT r.id, r.submitted_at
  FROM public.responses r
  WHERE r.survey_id = p_survey_id
    AND EXISTS (
      SELECT 1 FROM public.answers a
      WHERE a.response_id = r.id
        AND a.question_id = p_question_id
        AND (btrim(coalesce(a.value, '')) = ANY (v_norm)
             OR btrim(coalesce(a.numeric_value::text, '')) = ANY (v_norm))
    );

  SELECT count(*) INTO v_before FROM _matched_responses;

  IF v_before <= p_actual_students THEN
    RETURN jsonb_build_object('deleted_count', 0, 'responses_before', v_before, 'responses_after', v_before);
  END IF;

  SELECT array_agg(id) INTO v_deleted FROM (
    SELECT id FROM _matched_responses
    ORDER BY submitted_at DESC NULLS FIRST, id DESC
    LIMIT (v_before - p_actual_students)
  ) s;

  v_deleted_count := coalesce(array_length(v_deleted, 1), 0);

  PERFORM set_config('app.allow_response_purge', 'on', true);
  DELETE FROM public.answers WHERE response_id = ANY (v_deleted);
  DELETE FROM public.responses WHERE id = ANY (v_deleted);
  PERFORM set_config('app.allow_response_purge', 'off', true);

  INSERT INTO public.response_purge_log (
    survey_id, program_id, question_id, course_name, actual_students,
    responses_before, responses_after, deleted_count, deleted_response_ids,
    performed_by, performed_by_name, performed_by_email
  )
  SELECT p_survey_id, v_program_id, p_question_id, btrim(p_course_name), p_actual_students,
         v_before, v_before - v_deleted_count, v_deleted_count, to_jsonb(v_deleted),
         v_uid, p.full_name, p.email
  FROM (SELECT 1) x
  LEFT JOIN public.profiles p ON p.id = v_uid
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'deleted_count', v_deleted_count,
    'responses_before', v_before,
    'responses_after', v_before - v_deleted_count,
    'log_id', v_log_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_excess_responses(uuid, uuid, text[], integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_excess_responses(uuid, uuid, text[], integer, text) TO authenticated;