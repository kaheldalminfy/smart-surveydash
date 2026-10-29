-- Transactional regression: no test responses or changes survive ROLLBACK.
BEGIN;
CREATE TEMP TABLE survey_status_fixture AS
SELECT id FROM public.surveys
WHERE id = '181d1535-8093-4715-bc02-d9a7423b3d61';
GRANT SELECT ON survey_status_fixture TO anon;

DO $$ BEGIN
  IF (SELECT count(*) FROM survey_status_fixture) <> 1 THEN
    RAISE EXCEPTION 'Missing regression survey';
  END IF;
END $$;

-- Active surveys with expired end dates remain readable and accept submissions.
UPDATE public.surveys SET status = 'active',
  start_date = NULL, end_date = now() - interval '1 day'
WHERE id IN (SELECT id FROM survey_status_fixture);
SET LOCAL ROLE anon;
DO $$
DECLARE sid uuid; payload jsonb; rid uuid;
BEGIN
  SELECT id INTO sid FROM survey_status_fixture;
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = sid) THEN
    RAISE EXCEPTION 'Active expired survey must remain public';
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'question_id', id,
    'value', CASE WHEN type IN ('likert', 'rating') THEN '3'
      WHEN type = 'mcq' THEN CASE WHEN jsonb_typeof(options) = 'array'
        THEN options->>0 ELSE options->'choices'->>0 END
      ELSE 'Regression test' END,
    'numeric_value', CASE WHEN type IN ('likert', 'rating') THEN 3 ELSE NULL END
  )) INTO payload FROM public.questions
  WHERE survey_id = sid AND NOT is_archived AND type <> 'section';
  IF payload IS NULL THEN RAISE EXCEPTION 'Active questions must remain public'; END IF;
  rid := public.submit_survey_response(sid, payload, gen_random_uuid());
  IF rid IS NULL THEN RAISE EXCEPTION 'Active expired survey submission failed'; END IF;
END $$;
RESET ROLE;

-- Active surveys are not hidden by a future start date either.
UPDATE public.surveys SET start_date = now() + interval '1 day', end_date = NULL
WHERE id IN (SELECT id FROM survey_status_fixture);
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id IN (SELECT id FROM survey_status_fixture))
     OR NOT EXISTS (SELECT 1 FROM public.questions WHERE survey_id IN (SELECT id FROM survey_status_fixture)) THEN
    RAISE EXCEPTION 'Active future survey and questions must remain public';
  END IF;
END $$;
RESET ROLE;

-- Closed and draft surveys remain private and reject submissions.
DO $$
DECLARE sid uuid; state public.survey_status;
BEGIN
  SELECT id INTO sid FROM survey_status_fixture;
  FOREACH state IN ARRAY ARRAY['closed', 'draft']::public.survey_status[] LOOP
    UPDATE public.surveys SET status = state WHERE id = sid;
    SET LOCAL ROLE anon;
    IF EXISTS (SELECT 1 FROM public.surveys WHERE id = sid)
       OR EXISTS (SELECT 1 FROM public.questions WHERE survey_id = sid) THEN
      RAISE EXCEPTION 'Inactive survey must not be public';
    END IF;
    BEGIN
      PERFORM public.submit_survey_response(sid, '[]'::jsonb, gen_random_uuid());
      RAISE EXCEPTION 'Inactive survey must reject submissions';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'survey_not_accepting_responses' THEN RAISE; END IF;
    END;
    RESET ROLE;
  END LOOP;
END $$;
ROLLBACK;