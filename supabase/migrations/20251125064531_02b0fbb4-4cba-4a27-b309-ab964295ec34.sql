-- Fix RLS policy to allow anonymous complaint submissions
-- Drop existing policy
DROP POLICY IF EXISTS "Students can submit complaints" ON public.complaints;

-- Create new policy that allows both authenticated and anonymous users to submit complaints
CREATE POLICY "Anyone can submit complaints" 
ON public.complaints 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);