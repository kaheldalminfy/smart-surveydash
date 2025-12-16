-- Allow coordinators and admins to delete complaints
CREATE POLICY "Coordinators can delete complaints" 
ON public.complaints 
FOR DELETE 
USING (has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR has_role(auth.uid(), 'admin'::app_role));