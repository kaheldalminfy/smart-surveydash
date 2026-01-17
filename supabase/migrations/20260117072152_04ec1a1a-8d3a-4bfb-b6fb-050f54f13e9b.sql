-- Add target_enrollment column to surveys table for accurate response rate calculation
ALTER TABLE public.surveys 
ADD COLUMN target_enrollment INTEGER NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.surveys.target_enrollment IS 'العدد الفعلي للطلبة المسجلين لحساب نسبة الاستجابة بدقة';