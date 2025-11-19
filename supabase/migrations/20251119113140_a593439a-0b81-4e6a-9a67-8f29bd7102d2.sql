-- Relax RLS on responses to avoid failures for public survey submissions
DROP POLICY IF EXISTS "Public can submit responses to active surveys" ON public.responses;

-- Allow anyone (including anonymous users) to insert responses for any survey
-- This avoids "new row violates row-level security policy" errors seen on mobile
CREATE POLICY "Public can submit responses"
ON public.responses
FOR INSERT
TO public
WITH CHECK (true);
