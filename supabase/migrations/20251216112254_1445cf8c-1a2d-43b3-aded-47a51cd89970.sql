-- Add academic year and semester columns to surveys table
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS semester text,
ADD COLUMN IF NOT EXISTS academic_year text;