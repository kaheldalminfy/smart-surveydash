ALTER TABLE public.indicator_responses
  ADD COLUMN IF NOT EXISTS responsible_person text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS follow_up_notes text;

ALTER TABLE public.indicator_evidence
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS uploaded_by_name text;

CREATE UNIQUE INDEX IF NOT EXISTS indicator_responses_scope_unique
  ON public.indicator_responses (indicator_id, program_id, academic_year) NULLS NOT DISTINCT;

CREATE OR REPLACE FUNCTION public.can_view_accreditation_scope(_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _program_id IS NULL
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dean')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('coordinator','program_manager','faculty') AND ur.program_id = _program_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_accreditation_scope(_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR (_program_id IS NULL AND public.has_role(auth.uid(), 'dean'))
    OR (_program_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('coordinator','program_manager') AND ur.program_id = _program_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_accreditation_file(p_name text, p_manage boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.indicator_evidence e
    JOIN public.indicator_responses r ON r.id = e.response_id
    WHERE e.file_url = p_name
      AND CASE WHEN p_manage THEN public.can_edit_accreditation_scope(r.program_id)
               ELSE public.can_view_accreditation_scope(r.program_id) END
  )
$$;

DROP POLICY IF EXISTS "Coordinators can manage responses" ON public.indicator_responses;
DROP POLICY IF EXISTS "Users can view responses based on role" ON public.indicator_responses;
CREATE POLICY "View assessments by scope" ON public.indicator_responses FOR SELECT TO authenticated
  USING (public.can_view_accreditation_scope(program_id));
CREATE POLICY "Insert assessments by scope" ON public.indicator_responses FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_accreditation_scope(program_id));
CREATE POLICY "Update assessments by scope" ON public.indicator_responses FOR UPDATE TO authenticated
  USING (public.can_edit_accreditation_scope(program_id)) WITH CHECK (public.can_edit_accreditation_scope(program_id));
CREATE POLICY "Delete assessments by scope" ON public.indicator_responses FOR DELETE TO authenticated
  USING (public.can_edit_accreditation_scope(program_id));

DROP POLICY IF EXISTS "Coordinators can manage evidence" ON public.indicator_evidence;
DROP POLICY IF EXISTS "Users can view evidence based on response access" ON public.indicator_evidence;
CREATE POLICY "View evidence by scope" ON public.indicator_evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.indicator_responses r WHERE r.id = response_id AND public.can_view_accreditation_scope(r.program_id)));
CREATE POLICY "Insert evidence by scope" ON public.indicator_evidence FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.indicator_responses r WHERE r.id = response_id AND public.can_edit_accreditation_scope(r.program_id)));
CREATE POLICY "Delete evidence by scope" ON public.indicator_evidence FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.indicator_responses r WHERE r.id = response_id AND public.can_edit_accreditation_scope(r.program_id)));

DROP POLICY IF EXISTS "Users can view accreditation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own accreditation files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload accreditation files" ON storage.objects;
CREATE POLICY "Accreditation files upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accreditation-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Accreditation files view by scope" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accreditation-files' AND (public.can_access_accreditation_file(name, false) OR owner_id = auth.uid()::text));
CREATE POLICY "Accreditation files delete by scope" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accreditation-files' AND (public.can_access_accreditation_file(name, true) OR owner_id = auth.uid()::text));