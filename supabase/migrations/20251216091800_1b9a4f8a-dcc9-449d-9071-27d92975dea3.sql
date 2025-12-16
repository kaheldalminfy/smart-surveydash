-- Drop the existing policy
DROP POLICY IF EXISTS "Only admins can manage academic calendar" ON public.academic_calendar;

-- Create new policy allowing both admin and coordinator to manage academic calendar
CREATE POLICY "Admins and coordinators can manage academic calendar" 
ON public.academic_calendar 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordinator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'coordinator'::app_role)
);