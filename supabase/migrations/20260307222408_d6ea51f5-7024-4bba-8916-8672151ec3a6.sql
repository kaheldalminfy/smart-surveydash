-- Restrict complaint-attachments INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can upload complaint attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload complaint attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'complaint-attachments'
  AND auth.role() = 'authenticated'
);
