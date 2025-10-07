-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'faculty', 'dean');

-- Create survey_status enum
CREATE TYPE public.survey_status AS ENUM ('draft', 'active', 'closed');

-- Create question_type enum
CREATE TYPE public.question_type AS ENUM ('likert', 'mcq', 'text', 'rating');

-- Create complaint_type enum
CREATE TYPE public.complaint_type AS ENUM ('academic', 'administrative', 'technical', 'other');

-- Create complaint_status enum
CREATE TYPE public.complaint_status AS ENUM ('pending', 'in_progress', 'resolved', 'closed');

-- Create recommendation_status enum
CREATE TYPE public.recommendation_status AS ENUM ('pending', 'in_progress', 'completed', 'postponed');

-- Create programs table
CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    program_id UUID REFERENCES public.programs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    program_id UUID REFERENCES public.programs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role, program_id)
);

-- Create surveys table
CREATE TABLE public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    status public.survey_status DEFAULT 'draft',
    is_anonymous BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    qr_code TEXT,
    survey_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type public.question_type NOT NULL,
    options JSONB,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create responses table
CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create answers table
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    value TEXT,
    numeric_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id),
    student_name TEXT,
    student_email TEXT,
    type public.complaint_type NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.complaint_status DEFAULT 'pending',
    attachments JSONB,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    semester TEXT,
    academic_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create recommendations table
CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- 'survey' or 'complaint'
    source_id UUID, -- survey_id or complaint_id
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.recommendation_status DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES auth.users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    semester TEXT,
    academic_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE,
    generated_by_ai BOOLEAN DEFAULT false,
    pdf_url TEXT,
    excel_url TEXT,
    summary TEXT,
    recommendations_text TEXT,
    statistics JSONB,
    semester TEXT,
    academic_year TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    generated_by UUID REFERENCES auth.users(id)
);

-- Create archive table for storing historical data
CREATE TABLE public.archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    program_id UUID REFERENCES public.programs(id),
    data_type TEXT NOT NULL, -- 'survey', 'complaint', 'recommendation'
    data JSONB NOT NULL,
    is_frozen BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    archived_by UUID REFERENCES auth.users(id)
);

-- Insert default programs
INSERT INTO public.programs (name, name_en) VALUES
('برنامج القانون', 'Law Program'),
('برنامج التسويق', 'Marketing Program'),
('برنامج إدارة الأعمال', 'Business Administration Program'),
('برنامج التمويل والمصارف', 'Finance and Banking Program'),
('برنامج إدارة المشاريع', 'Project Management Program'),
('برنامج إدارة الرعاية الصحية', 'Healthcare Management Program'),
('برنامج اللغة الإنجليزية والتواصل العالمي', 'English Language and Global Communication Program'),
('برنامج ماجستير إدارة الرعاية الصحية', 'Healthcare Management Masters Program');

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Create function to check if user has role in specific program
CREATE OR REPLACE FUNCTION public.has_role_in_program(_user_id UUID, _role public.app_role, _program_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id 
        AND role = _role 
        AND (program_id = _program_id OR program_id IS NULL)
    )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);

-- RLS Policies for programs
CREATE POLICY "Everyone can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for surveys
CREATE POLICY "Everyone can view active surveys" ON public.surveys FOR SELECT USING (true);
CREATE POLICY "Coordinators can create surveys for their program" ON public.surveys 
    FOR INSERT WITH CHECK (
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin')
    );
CREATE POLICY "Coordinators can update their surveys" ON public.surveys 
    FOR UPDATE USING (
        created_by = auth.uid() OR
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin')
    );
CREATE POLICY "Coordinators can delete their surveys" ON public.surveys 
    FOR DELETE USING (
        created_by = auth.uid() OR
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for questions
CREATE POLICY "Everyone can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Survey creators can manage questions" ON public.questions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = questions.survey_id 
            AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
    );

-- RLS Policies for responses
CREATE POLICY "Everyone can submit responses" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Coordinators can view responses for their program surveys" ON public.responses 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = responses.survey_id 
            AND (
                public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'dean')
            )
        )
    );

-- RLS Policies for answers
CREATE POLICY "Everyone can submit answers" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Coordinators can view answers" ON public.answers 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.responses r
            JOIN public.surveys s ON s.id = r.survey_id
            WHERE r.id = answers.response_id 
            AND (
                public.has_role_in_program(auth.uid(), 'coordinator', s.program_id) OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'dean')
            )
        )
    );

-- RLS Policies for complaints
CREATE POLICY "Students can submit complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Coordinators can view program complaints" ON public.complaints 
    FOR SELECT USING (
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'dean') OR
        student_id = auth.uid()
    );
CREATE POLICY "Coordinators can update program complaints" ON public.complaints 
    FOR UPDATE USING (
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for recommendations
CREATE POLICY "Coordinators can view program recommendations" ON public.recommendations 
    FOR SELECT USING (
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'dean') OR
        assigned_to = auth.uid()
    );
CREATE POLICY "Coordinators can manage recommendations" ON public.recommendations 
    FOR ALL USING (
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for reports
CREATE POLICY "Coordinators can view program reports" ON public.reports 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = reports.survey_id 
            AND (
                public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'dean')
            )
        )
    );
CREATE POLICY "Coordinators can create reports" ON public.reports 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE id = reports.survey_id 
            AND (
                public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
                public.has_role(auth.uid(), 'admin')
            )
        )
    );

-- RLS Policies for archives
CREATE POLICY "Coordinators can view program archives" ON public.archives 
    FOR SELECT USING (
        public.has_role_in_program(auth.uid(), 'coordinator', program_id) OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'dean')
    );
CREATE POLICY "Admins can manage archives" ON public.archives 
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON public.recommendations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();