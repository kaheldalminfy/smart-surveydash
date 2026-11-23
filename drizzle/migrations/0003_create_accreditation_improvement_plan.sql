CREATE OR REPLACE FUNCTION public.create_accreditation_improvement_plan(p_framework_id uuid, p_program_id uuid, p_year text, p_language text DEFAULT 'ar') RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE f_type public.accreditation_type; added integer;
BEGIN
 IF NOT public.can_edit_accreditation_scope(p_program_id) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_year IS NULL OR p_year !~ '^[0-9]{4}-[0-9]{4}$' OR p_language NOT IN ('ar','en') THEN RAISE EXCEPTION 'Invalid input'; END IF;
 SELECT type INTO f_type FROM public.accreditation_frameworks WHERE id=p_framework_id;
 IF f_type IS NULL OR (f_type='institutional' AND p_program_id IS NOT NULL) OR (f_type='programmatic' AND p_program_id IS NULL) THEN RAISE EXCEPTION 'Invalid framework scope'; END IF;
 INSERT INTO public.recommendations (title,description,source_type,source_id,accreditation_indicator_id,program_id,academic_year,status,priority,responsible_person,due_date,evidence_notes)
 SELECT i.code || ' — ' || i.name,
 CASE WHEN p_language='ar' THEN 'استكمال تقييم المؤشر ومعالجة الفجوات وإرفاق الأدلة المطلوبة.' ELSE 'Complete the indicator assessment, address gaps and attach the required evidence.' END,
 'accreditation',i.id,i.id,p_program_id,p_year,'pending','high',COALESCE(r.responsible_person,i.responsible_party),r.due_date,NULL
 FROM public.accreditation_indicators i JOIN public.accreditation_standards s ON s.id=i.standard_id
 LEFT JOIN public.indicator_responses r ON r.indicator_id=i.id AND r.program_id IS NOT DISTINCT FROM p_program_id AND r.academic_year=p_year
 WHERE s.framework_id=p_framework_id AND (COALESCE(r.compliance_percentage,0)<100 OR
 (SELECT count(*) FROM public.indicator_evidence e WHERE e.response_id=r.id AND e.file_url IS NOT NULL AND e.file_url<>'') < GREATEST(1,CASE WHEN jsonb_typeof(i.required_evidence)='array' THEN jsonb_array_length(i.required_evidence) ELSE 0 END))
 ON CONFLICT (accreditation_indicator_id,program_id,academic_year) WHERE source_type='accreditation' DO NOTHING;
 GET DIAGNOSTICS added = ROW_COUNT;
 RETURN added;
END $$;
REVOKE ALL ON FUNCTION public.create_accreditation_improvement_plan(uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_accreditation_improvement_plan(uuid,uuid,text,text) TO authenticated,service_role;