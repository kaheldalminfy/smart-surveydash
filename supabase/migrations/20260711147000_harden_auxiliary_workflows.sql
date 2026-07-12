-- Align archive authorization with the application and make export auditing atomic.

DROP POLICY IF EXISTS "Coordinators can manage program archive drafts" ON public.archives;
DROP POLICY IF EXISTS "Authorized users manage program archives" ON public.archives;

CREATE POLICY "Authorized users manage program archives"
ON public.archives
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'dean'::public.app_role)
  OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
  OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'dean'::public.app_role)
  OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
  OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
);

CREATE OR REPLACE FUNCTION public.record_archive_export(
  p_archive_id uuid,
  p_format text DEFAULT 'pdf'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  archive_program_id uuid;
  updated_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF p_format NOT IN ('pdf', 'xlsx', 'json') THEN
    RAISE EXCEPTION 'invalid_export_format' USING ERRCODE = '22023';
  END IF;

  SELECT program_id
  INTO archive_program_id
  FROM public.archives
  WHERE id = p_archive_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'archive_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'dean'::public.app_role)
    OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, archive_program_id)
    OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, archive_program_id)
  ) THEN
    RAISE EXCEPTION 'archive_export_forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.archives
  SET export_count = export_count + 1
  WHERE id = p_archive_id
  RETURNING export_count INTO updated_count;

  INSERT INTO public.archive_audit_log (
    archive_id,
    action,
    performed_by,
    metadata
  ) VALUES (
    p_archive_id,
    'exported',
    auth.uid(),
    jsonb_build_object('format', p_format)
  );

  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_archive_export(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_archive_export(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.archive_audit_log;
REVOKE INSERT ON public.archive_audit_log FROM anon, authenticated;

-- This legacy view is unused by the application and can otherwise bypass the
-- profile and role-table policies because views are owner-executed by default.
DO $$
BEGIN
  IF to_regclass('public.user_roles_view') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.user_roles_view SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.user_roles_view FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

COMMENT ON FUNCTION public.record_archive_export(uuid, text) IS
  'Atomically increments an archive export count and appends its audit event.';
