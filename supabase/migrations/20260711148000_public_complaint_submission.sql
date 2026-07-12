-- Make anonymous complaint submission idempotent and allow only declared,
-- short-lived attachment uploads.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS submission_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_submission_token
  ON public.complaints (submission_token)
  WHERE submission_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_normalized_email_created_at
  ON public.complaints (lower(student_email), created_at DESC)
  WHERE student_email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_public_complaint(
  p_complaint_id uuid,
  p_submission_token uuid,
  p_student_name text,
  p_student_email text,
  p_complainant_academic_id text,
  p_complainant_type text,
  p_program_id uuid,
  p_complaint_category text,
  p_subject text,
  p_description text,
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing_id uuid;
  attachment jsonb;
  attachment_path text;
  normalized_email text := lower(btrim(COALESCE(p_student_email, '')));
BEGIN
  SELECT id INTO existing_id
  FROM public.complaints
  WHERE submission_token = p_submission_token;
  IF FOUND THEN
    RETURN existing_id;
  END IF;

  IF p_complaint_id IS NULL OR p_submission_token IS NULL THEN
    RAISE EXCEPTION 'complaint_identifiers_required' USING ERRCODE = '22023';
  END IF;

  IF length(btrim(COALESCE(p_student_name, ''))) NOT BETWEEN 3 AND 200
     OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR length(normalized_email) > 320
     OR length(btrim(COALESCE(p_subject, ''))) NOT BETWEEN 5 AND 500
     OR length(btrim(COALESCE(p_description, ''))) NOT BETWEEN 10 AND 10000
     OR length(btrim(COALESCE(p_complainant_academic_id, ''))) > 100 THEN
    RAISE EXCEPTION 'invalid_complaint_fields' USING ERRCODE = '22023';
  END IF;

  IF p_complainant_type NOT IN ('student', 'employee', 'faculty', 'staff', 'other')
     OR p_complaint_category NOT IN ('academic', 'administrative', 'technical', 'other') THEN
    RAISE EXCEPTION 'invalid_complaint_classification' USING ERRCODE = '22023';
  END IF;

  IF p_program_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.programs WHERE id = p_program_id) THEN
    RAISE EXCEPTION 'complaint_program_not_found' USING ERRCODE = '23503';
  END IF;

  IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array'
     OR jsonb_array_length(p_attachments) > 5 THEN
    RAISE EXCEPTION 'invalid_complaint_attachments' USING ERRCODE = '22023';
  END IF;

  FOR attachment IN SELECT item FROM jsonb_array_elements(p_attachments) AS files(item)
  LOOP
    attachment_path := attachment ->> 'path';
    IF jsonb_typeof(attachment) <> 'object'
       OR length(btrim(COALESCE(attachment ->> 'name', ''))) NOT BETWEEN 1 AND 255
       OR COALESCE(attachment ->> 'type', '') NOT IN (
         'application/pdf', 'image/jpeg', 'image/png',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       )
       OR attachment_path !~* (
         '^' || p_complaint_id::text ||
         '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|doc|docx)$'
       ) THEN
      RAISE EXCEPTION 'invalid_complaint_attachment_metadata' USING ERRCODE = '22023';
    END IF;

    IF COALESCE(attachment ->> 'size', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'invalid_complaint_attachment_size' USING ERRCODE = '22023';
    END IF;

    IF (attachment ->> 'size')::bigint < 1
       OR (attachment ->> 'size')::bigint > 5242880 THEN
      RAISE EXCEPTION 'invalid_complaint_attachment_size' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.complaints
    WHERE lower(student_email) = normalized_email
      AND created_at > now() - interval '30 seconds'
  ) THEN
    RAISE EXCEPTION 'complaint_rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.complaints (
    id,
    submission_token,
    student_id,
    student_name,
    student_email,
    complainant_academic_id,
    complainant_type,
    program_id,
    complaint_category,
    type,
    subject,
    description,
    status,
    attachments
  ) VALUES (
    p_complaint_id,
    p_submission_token,
    auth.uid(),
    btrim(p_student_name),
    normalized_email,
    NULLIF(btrim(COALESCE(p_complainant_academic_id, '')), ''),
    p_complainant_type,
    p_program_id,
    p_complaint_category,
    p_complaint_category::public.complaint_type,
    btrim(p_subject),
    btrim(p_description),
    'pending'::public.complaint_status,
    p_attachments
  );

  RETURN p_complaint_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_public_complaint_attachments(
  p_complaint_id uuid,
  p_submission_token uuid,
  p_successful_paths jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  complaint_record public.complaints%ROWTYPE;
BEGIN
  IF p_successful_paths IS NULL OR jsonb_typeof(p_successful_paths) <> 'array'
     OR jsonb_array_length(p_successful_paths) > 5
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements(p_successful_paths) AS path(item)
       WHERE jsonb_typeof(path.item) <> 'string'
     ) THEN
    RAISE EXCEPTION 'invalid_successful_attachment_paths' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO complaint_record
  FROM public.complaints
  WHERE id = p_complaint_id
    AND submission_token = p_submission_token
    AND created_at > now() - interval '30 minutes'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'complaint_upload_session_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p_successful_paths) AS submitted(path)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(complaint_record.attachments, '[]'::jsonb)) AS expected(item)
      WHERE expected.item ->> 'path' = submitted.path
    )
  ) THEN
    RAISE EXCEPTION 'attachment_path_not_declared' USING ERRCODE = '23514';
  END IF;

  UPDATE public.complaints
  SET attachments = COALESCE((
    SELECT jsonb_agg(expected.item ORDER BY expected.item ->> 'path')
    FROM jsonb_array_elements(COALESCE(complaint_record.attachments, '[]'::jsonb)) AS expected(item)
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p_successful_paths) AS submitted(path)
      WHERE submitted.path = expected.item ->> 'path'
    )
  ), '[]'::jsonb)
  WHERE id = p_complaint_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_upload_complaint_attachment(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.complaints AS complaint
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(complaint.attachments, '[]'::jsonb)) AS attachment(item)
    WHERE complaint.created_at > now() - interval '15 minutes'
      AND attachment.item ->> 'path' = p_object_name
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_complaint_attachment(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.complaints AS complaint
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(complaint.attachments, '[]'::jsonb)) AS attachment(item)
    WHERE attachment.item ->> 'path' = p_object_name
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, complaint.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, complaint.program_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.submit_public_complaint(uuid, uuid, text, text, text, text, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_complaint(uuid, uuid, text, text, text, text, uuid, text, text, text, jsonb) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_public_complaint_attachments(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_public_complaint_attachments(uuid, uuid, jsonb) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.can_upload_complaint_attachment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_complaint_attachment(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_complaint_attachment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_complaint_attachment(text) TO authenticated;

REVOKE INSERT ON public.complaints FROM anon;

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY[
      'application/pdf', 'image/jpeg', 'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
WHERE id = 'complaint-attachments';

DROP POLICY IF EXISTS "Anyone can upload complaint attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload complaint attachments" ON storage.objects;
DROP POLICY IF EXISTS "Declared complaint attachments can be uploaded" ON storage.objects;
CREATE POLICY "Declared complaint attachments can be uploaded"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'complaint-attachments'
  AND public.can_upload_complaint_attachment(name)
);

DROP POLICY IF EXISTS "Only admins and coordinators can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users view complaint attachments" ON storage.objects;
CREATE POLICY "Authorized users view complaint attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND public.can_manage_complaint_attachment(name)
);

DROP POLICY IF EXISTS "Authorized users delete complaint attachments" ON storage.objects;
CREATE POLICY "Authorized users delete complaint attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND public.can_manage_complaint_attachment(name)
);

COMMENT ON FUNCTION public.submit_public_complaint(uuid, uuid, text, text, text, text, uuid, text, text, text, jsonb) IS
  'Validates and idempotently creates one public complaint with declared attachment metadata.';
