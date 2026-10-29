-- Only manual status controls survey availability. Preserve all stored data and management policies.
ALTER POLICY "Public reads currently active surveys" ON public.surveys
  USING (status = 'active'::public.survey_status);

ALTER POLICY "Public reads active survey questions" ON public.questions
  USING (
    NOT is_archived
    AND EXISTS (
      SELECT 1 FROM public.surveys AS survey
      WHERE survey.id = questions.survey_id
        AND survey.status = 'active'::public.survey_status
    )
  );

-- Preserve the live atomic submission implementation, replacing only its availability gate.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.submit_survey_response(uuid,jsonb,uuid)'::regprocedure);
  patched text;
BEGIN
  patched := regexp_replace(
    definition,
    'IF survey_record.status IS DISTINCT FROM ''active''::public.survey_status[[:space:][:print:]]*?THEN[[:space:]]+RAISE EXCEPTION ''survey_not_accepting_responses''',
    'IF survey_record.status IS DISTINCT FROM ''active''::public.survey_status THEN
    RAISE EXCEPTION ''survey_not_accepting_responses'''
  );
  IF patched = definition OR patched LIKE '%survey_record.start_date%' OR patched LIKE '%survey_record.end_date%' THEN
    RAISE EXCEPTION 'Manual survey status migration could not safely replace the availability gate';
  END IF;
  EXECUTE patched;
END;
$migration$;

GRANT SELECT ON public.surveys, public.questions TO anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_survey_response(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(uuid, jsonb, uuid) TO anon, authenticated;