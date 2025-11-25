-- تحديث قيد complainant_type ليشمل جميع القيم المطلوبة
ALTER TABLE public.complaints 
DROP CONSTRAINT IF EXISTS complaints_complainant_type_check;

ALTER TABLE public.complaints 
ADD CONSTRAINT complaints_complainant_type_check 
CHECK (complainant_type = ANY (ARRAY['student'::text, 'employee'::text, 'faculty'::text, 'staff'::text, 'other'::text]));