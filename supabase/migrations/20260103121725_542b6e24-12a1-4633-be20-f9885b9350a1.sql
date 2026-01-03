-- Fix PUBLIC_DATA_EXPOSURE: Restrict profiles table access

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy: Users can only view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create policy: Coordinators can view profiles in their program
CREATE POLICY "Coordinators can view program profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'coordinator'
    AND (program_id = profiles.program_id OR program_id IS NULL)
  )
);

-- Create policy: Dean can view all profiles
CREATE POLICY "Dean can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'dean'));