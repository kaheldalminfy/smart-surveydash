-- Create academic calendar table for managing semesters and academic years
CREATE TABLE public.academic_calendar (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(academic_year, semester)
);

-- Enable Row Level Security
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

-- Everyone can view academic calendar
CREATE POLICY "Everyone can view academic calendar" 
ON public.academic_calendar 
FOR SELECT 
USING (true);

-- Only admins can manage academic calendar
CREATE POLICY "Only admins can manage academic calendar" 
ON public.academic_calendar 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_academic_calendar_updated_at
BEFORE UPDATE ON public.academic_calendar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default academic calendar entries
INSERT INTO public.academic_calendar (academic_year, semester, start_date, end_date, is_current) VALUES
('2024-2025', 'الفصل الأول', '2024-09-01', '2025-01-15', false),
('2024-2025', 'الفصل الثاني', '2025-01-20', '2025-06-01', true),
('2024-2025', 'الفصل الصيفي', '2025-06-15', '2025-08-15', false),
('2023-2024', 'الفصل الأول', '2023-09-01', '2024-01-15', false),
('2023-2024', 'الفصل الثاني', '2024-01-20', '2024-06-01', false),
('2023-2024', 'الفصل الصيفي', '2024-06-15', '2024-08-15', false);