-- إنشاء الأنواع (Enums) للاعتماد
CREATE TYPE accreditation_type AS ENUM ('institutional', 'programmatic');
CREATE TYPE accreditation_scope AS ENUM ('national', 'international');
CREATE TYPE accreditation_importance AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE accreditation_compliance AS ENUM ('compliant', 'partial', 'non_compliant');
CREATE TYPE accreditation_response_status AS ENUM ('draft', 'submitted', 'reviewed', 'approved');

-- جدول أُطر الاعتماد
CREATE TABLE public.accreditation_frameworks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    name_en text,
    type accreditation_type NOT NULL DEFAULT 'programmatic',
    scope accreditation_scope NOT NULL DEFAULT 'national',
    version text,
    description text,
    source_file_url text,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- جدول المعايير
CREATE TABLE public.accreditation_standards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id uuid REFERENCES public.accreditation_frameworks(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    weight decimal(5,2) DEFAULT 1.0,
    created_at timestamptz DEFAULT now()
);

-- جدول المؤشرات
CREATE TABLE public.accreditation_indicators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id uuid REFERENCES public.accreditation_standards(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    objective text,
    responsible_party text,
    importance_level accreditation_importance DEFAULT 'medium',
    required_evidence jsonb DEFAULT '[]'::jsonb,
    response_guidelines text,
    response_template text,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- جدول استجابات المؤشرات
CREATE TABLE public.indicator_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id uuid REFERENCES public.accreditation_indicators(id) ON DELETE CASCADE NOT NULL,
    program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
    academic_year text,
    semester text,
    response_text text,
    status accreditation_response_status DEFAULT 'draft',
    compliance_level accreditation_compliance,
    compliance_percentage integer DEFAULT 0 CHECK (compliance_percentage >= 0 AND compliance_percentage <= 100),
    ai_feedback text,
    ai_score integer CHECK (ai_score >= 0 AND ai_score <= 100),
    strengths jsonb DEFAULT '[]'::jsonb,
    gaps jsonb DEFAULT '[]'::jsonb,
    improvement_notes text,
    submitted_by uuid REFERENCES auth.users(id),
    reviewed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- جدول مرفقات الأدلة
CREATE TABLE public.indicator_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id uuid REFERENCES public.indicator_responses(id) ON DELETE CASCADE NOT NULL,
    evidence_type text,
    title text NOT NULL,
    description text,
    file_url text,
    file_type text,
    uploaded_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.accreditation_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_evidence ENABLE ROW LEVEL SECURITY;

-- سياسات أُطر الاعتماد
CREATE POLICY "Everyone can view active frameworks"
ON public.accreditation_frameworks FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dean'));

CREATE POLICY "Coordinators can manage frameworks for their program"
ON public.accreditation_frameworks FOR ALL
USING (
    has_role(auth.uid(), 'admin') OR 
    has_role_in_program(auth.uid(), 'coordinator', program_id) OR
    (program_id IS NULL AND has_role(auth.uid(), 'coordinator'))
)
WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role_in_program(auth.uid(), 'coordinator', program_id) OR
    (program_id IS NULL AND has_role(auth.uid(), 'coordinator'))
);

-- سياسات المعايير
CREATE POLICY "Everyone can view standards"
ON public.accreditation_standards FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.accreditation_frameworks f
        WHERE f.id = framework_id AND (f.is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dean'))
    )
);

CREATE POLICY "Coordinators can manage standards"
ON public.accreditation_standards FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.accreditation_frameworks f
        WHERE f.id = framework_id AND (
            has_role(auth.uid(), 'admin') OR 
            has_role_in_program(auth.uid(), 'coordinator', f.program_id) OR
            (f.program_id IS NULL AND has_role(auth.uid(), 'coordinator'))
        )
    )
);

-- سياسات المؤشرات
CREATE POLICY "Everyone can view indicators"
ON public.accreditation_indicators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.accreditation_standards s
        JOIN public.accreditation_frameworks f ON f.id = s.framework_id
        WHERE s.id = standard_id AND (f.is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'dean'))
    )
);

CREATE POLICY "Coordinators can manage indicators"
ON public.accreditation_indicators FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.accreditation_standards s
        JOIN public.accreditation_frameworks f ON f.id = s.framework_id
        WHERE s.id = standard_id AND (
            has_role(auth.uid(), 'admin') OR 
            has_role_in_program(auth.uid(), 'coordinator', f.program_id) OR
            (f.program_id IS NULL AND has_role(auth.uid(), 'coordinator'))
        )
    )
);

-- سياسات الاستجابات
CREATE POLICY "Users can view responses based on role"
ON public.indicator_responses FOR SELECT
USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'dean') OR
    has_role_in_program(auth.uid(), 'coordinator', program_id) OR
    has_role_in_program(auth.uid(), 'program_manager', program_id) OR
    submitted_by = auth.uid()
);

CREATE POLICY "Coordinators can manage responses"
ON public.indicator_responses FOR ALL
USING (
    has_role(auth.uid(), 'admin') OR 
    has_role_in_program(auth.uid(), 'coordinator', program_id) OR
    submitted_by = auth.uid()
)
WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role_in_program(auth.uid(), 'coordinator', program_id) OR
    submitted_by = auth.uid()
);

-- سياسات الأدلة
CREATE POLICY "Users can view evidence based on response access"
ON public.indicator_evidence FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.indicator_responses r
        WHERE r.id = response_id AND (
            has_role(auth.uid(), 'admin') OR 
            has_role(auth.uid(), 'dean') OR
            has_role_in_program(auth.uid(), 'coordinator', r.program_id) OR
            has_role_in_program(auth.uid(), 'program_manager', r.program_id) OR
            r.submitted_by = auth.uid()
        )
    )
);

CREATE POLICY "Coordinators can manage evidence"
ON public.indicator_evidence FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.indicator_responses r
        WHERE r.id = response_id AND (
            has_role(auth.uid(), 'admin') OR 
            has_role_in_program(auth.uid(), 'coordinator', r.program_id) OR
            r.submitted_by = auth.uid()
        )
    )
);

-- إنشاء bucket لملفات الاعتماد
INSERT INTO storage.buckets (id, name, public) 
VALUES ('accreditation-files', 'accreditation-files', false)
ON CONFLICT (id) DO NOTHING;

-- سياسات Storage للملفات
CREATE POLICY "Authenticated users can upload accreditation files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'accreditation-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view accreditation files"
ON storage.objects FOR SELECT
USING (bucket_id = 'accreditation-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own accreditation files"
ON storage.objects FOR DELETE
USING (bucket_id = 'accreditation-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_frameworks_updated_at
BEFORE UPDATE ON public.accreditation_frameworks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
BEFORE UPDATE ON public.indicator_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();