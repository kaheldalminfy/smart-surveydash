ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS accreditation_indicator_id uuid REFERENCES public.accreditation_indicators(id), ADD COLUMN IF NOT EXISTS responsible_person text, ADD COLUMN IF NOT EXISTS evidence_notes text;
CREATE UNIQUE INDEX IF NOT EXISTS recommendations_accreditation_scope_unique ON public.recommendations (accreditation_indicator_id, program_id, academic_year) NULLS NOT DISTINCT WHERE source_type = 'accreditation';
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_accreditation_link CHECK (source_type <> 'accreditation' OR (accreditation_indicator_id IS NOT NULL AND academic_year IS NOT NULL));
CREATE OR REPLACE FUNCTION public.validate_accreditation_recommendation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE framework_type public.accreditation_type;
BEGIN
  IF NEW.source_type = 'accreditation' THEN
    SELECT f.type INTO framework_type FROM public.accreditation_indicators i JOIN public.accreditation_standards s ON s.id=i.standard_id JOIN public.accreditation_frameworks f ON f.id=s.framework_id WHERE i.id=NEW.accreditation_indicator_id;
    IF framework_type IS NULL OR (framework_type='institutional' AND NEW.program_id IS NOT NULL) OR (framework_type='programmatic' AND NEW.program_id IS NULL) THEN RAISE EXCEPTION 'Invalid accreditation improvement scope'; END IF;
    IF NEW.academic_year !~ '^[0-9]{4}-[0-9]{4}$' THEN RAISE EXCEPTION 'Invalid academic year'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_accreditation_recommendation BEFORE INSERT OR UPDATE ON public.recommendations FOR EACH ROW EXECUTE FUNCTION public.validate_accreditation_recommendation();
DROP POLICY IF EXISTS "Only coordinators can manage recommendations" ON public.recommendations;
CREATE POLICY "Only coordinators can manage recommendations" ON public.recommendations FOR ALL TO authenticated USING (source_type <> 'accreditation' AND (public.has_role_in_program(auth.uid(),'coordinator',program_id) OR public.has_role(auth.uid(),'admin'))) WITH CHECK (source_type <> 'accreditation' AND (public.has_role_in_program(auth.uid(),'coordinator',program_id) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "View accreditation improvement actions" ON public.recommendations FOR SELECT TO authenticated USING (source_type='accreditation' AND public.can_view_accreditation_scope(program_id));
CREATE POLICY "Manage accreditation improvement actions" ON public.recommendations FOR ALL TO authenticated USING (source_type='accreditation' AND public.can_edit_accreditation_scope(program_id)) WITH CHECK (source_type='accreditation' AND public.can_edit_accreditation_scope(program_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;