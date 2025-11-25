-- Create storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for complaint attachments
CREATE POLICY "Anyone can upload complaint attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'complaint-attachments');

CREATE POLICY "Only admins and coordinators can view attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'complaint-attachments' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'coordinator'::app_role)
  )
);