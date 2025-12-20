-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Allow anonymous and authenticated to submit answers" ON public.answers;
DROP POLICY IF EXISTS "Allow anonymous and authenticated to submit responses" ON public.responses;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Allow anyone to submit answers" 
ON public.answers 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Allow anyone to submit responses" 
ON public.responses 
FOR INSERT 
TO public
WITH CHECK (true);