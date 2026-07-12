-- Save report metadata and its survey target count in one transaction.

CREATE OR REPLACE FUNCTION public.save_report_metadata(
  p_report_id uuid,
  p_semester text,
  p_academic_year text,
  p_status public.report_status,
  p_target_enrollment integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  survey_id_value uuid;
  survey_program_id uuid;
  survey_creator_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT report.survey_id, survey.program_id, survey.created_by
  INTO survey_id_value, survey_program_id, survey_creator_id
  FROM public.reports AS report
  JOIN public.surveys AS survey ON survey.id = report.survey_id
  WHERE report.id = p_report_id
  FOR UPDATE OF report, survey;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF survey_creator_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'dean'::public.app_role)
     AND NOT public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey_program_id)
     AND NOT public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey_program_id) THEN
    RAISE EXCEPTION 'report_management_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_target_enrollment IS NOT NULL
     AND (p_target_enrollment < 1 OR p_target_enrollment > 1000000) THEN
    RAISE EXCEPTION 'invalid_target_enrollment' USING ERRCODE = '22023';
  END IF;

  IF length(COALESCE(p_semester, '')) > 100
     OR length(COALESCE(p_academic_year, '')) > 100 THEN
    RAISE EXCEPTION 'report_metadata_too_long' USING ERRCODE = '22001';
  END IF;

  UPDATE public.reports
  SET semester = NULLIF(btrim(p_semester), ''),
      academic_year = NULLIF(btrim(p_academic_year), ''),
      status = p_status
  WHERE id = p_report_id;

  UPDATE public.surveys
  SET target_enrollment = p_target_enrollment
  WHERE id = survey_id_value;
END;
$$;

REVOKE ALL ON FUNCTION public.save_report_metadata(uuid, text, text, public.report_status, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_report_metadata(uuid, text, text, public.report_status, integer) TO authenticated;

COMMENT ON FUNCTION public.save_report_metadata(uuid, text, text, public.report_status, integer) IS
  'Atomically updates report metadata and the related survey target participant count.';
