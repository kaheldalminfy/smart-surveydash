-- Replace delete-then-insert role updates with one validated transaction.

CREATE OR REPLACE FUNCTION public.set_user_roles(
  p_user_id uuid,
  p_roles jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'target_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_roles IS NULL OR jsonb_typeof(p_roles) <> 'array' OR jsonb_array_length(p_roles) > 50 THEN
    RAISE EXCEPTION 'invalid_roles_payload' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_roles) AS submitted(item)
    WHERE jsonb_typeof(submitted.item) <> 'object'
       OR submitted.item ->> 'role' NOT IN ('admin', 'coordinator', 'faculty', 'dean', 'program_manager')
       OR (
         submitted.item ->> 'role' IN ('coordinator', 'program_manager')
         AND NULLIF(submitted.item ->> 'program_id', '') IS NULL
       )
       OR (
         submitted.item ->> 'role' NOT IN ('coordinator', 'program_manager')
         AND NULLIF(submitted.item ->> 'program_id', '') IS NOT NULL
       )
       OR (
         NULLIF(submitted.item ->> 'program_id', '') IS NOT NULL
         AND COALESCE(submitted.item ->> 'program_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       )
  ) THEN
    RAISE EXCEPTION 'invalid_role_entry' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT submitted.item ->> 'role', COALESCE(submitted.item ->> 'program_id', '')
    FROM jsonb_array_elements(p_roles) AS submitted(item)
    GROUP BY submitted.item ->> 'role', COALESCE(submitted.item ->> 'program_id', '')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_role_entry' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_roles) AS submitted(item)
    WHERE NULLIF(submitted.item ->> 'program_id', '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.programs
        WHERE id = (submitted.item ->> 'program_id')::uuid
      )
  ) THEN
    RAISE EXCEPTION 'role_program_not_found' USING ERRCODE = '23503';
  END IF;

  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;

  -- Never allow the system to end up without an administrator.
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role
      AND user_id <> p_user_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_roles) AS submitted(item)
    WHERE submitted.item ->> 'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'cannot_remove_last_admin' USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_user_id;

  INSERT INTO public.user_roles (user_id, role, program_id)
  SELECT
    p_user_id,
    (submitted.item ->> 'role')::public.app_role,
    NULLIF(submitted.item ->> 'program_id', '')::uuid
  FROM jsonb_array_elements(p_roles) AS submitted(item);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_roles(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_roles(uuid, jsonb) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

COMMENT ON FUNCTION public.set_user_roles(uuid, jsonb) IS
  'Atomically replaces one user role set after admin, duplicate, program and last-admin validation.';
