-- Drop the existing policy that allows viewing all surveys
DROP POLICY IF EXISTS "Everyone can view active surveys" ON public.surveys;

-- Create a new policy that only allows public access to active surveys
CREATE POLICY "Public can view active surveys" 
ON public.surveys 
FOR SELECT 
USING (status = 'active');

-- Allow authenticated users to view all surveys (for coordinators/admins)
CREATE POLICY "Authenticated users can view all surveys" 
ON public.surveys 
FOR SELECT 
USING (auth.uid() IS NOT NULL);