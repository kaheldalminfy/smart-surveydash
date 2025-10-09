-- تحديث هيكل قاعدة البيانات لدعم الميزات الجديدة

-- إضافة حقول جديدة لجدول surveys
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.survey_templates(id),
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0.00;

-- إنشاء جدول قوالب الاستبيانات
CREATE TABLE IF NOT EXISTS public.survey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    category TEXT NOT NULL, -- 'course_evaluation', 'satisfaction', 'quality', 'custom'
    questions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول إعدادات النظام
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول سجلات التدقيق
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
    is_read BOOLEAN DEFAULT false,
    related_id UUID, -- ID of related survey, complaint, etc.
    related_type TEXT, -- 'survey', 'complaint', 'recommendation'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إضافة حقول جديدة لجدول questions لدعم المزيد من أنواع الأسئلة
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS validation_rules JSONB,
ADD COLUMN IF NOT EXISTS display_logic JSONB,
ADD COLUMN IF NOT EXISTS help_text TEXT;

-- إضافة حقول جديدة لجدول responses
ALTER TABLE public.responses 
ADD COLUMN IF NOT EXISTS completion_time INTEGER, -- in seconds
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- إدراج قوالب افتراضية
INSERT INTO public.survey_templates (name, name_en, description, category, questions, created_by) VALUES
('تقييم المقرر الدراسي', 'Course Evaluation', 'قالب لتقييم جودة المقررات الدراسية', 'course_evaluation', 
'[
  {"text": "أهداف المقرر واضحة ومحددة", "type": "likert", "required": true},
  {"text": "محتوى المقرر مناسب لمستوى الطلاب", "type": "likert", "required": true},
  {"text": "طرق التدريس المستخدمة فعالة", "type": "likert", "required": true},
  {"text": "التقييم عادل ويقيس تحقق أهداف المقرر", "type": "likert", "required": true},
  {"text": "ما هي اقتراحاتك لتحسين المقرر؟", "type": "text", "required": false}
]'::jsonb, NULL),

('رضا الطلاب العام', 'Student Satisfaction', 'قالب لقياس مستوى رضا الطلاب عن البرنامج', 'satisfaction',
'[
  {"text": "أنا راضٍ عن جودة التعليم في البرنامج", "type": "likert", "required": true},
  {"text": "الخدمات الأكاديمية متوفرة وفعالة", "type": "likert", "required": true},
  {"text": "أعضاء هيئة التدريس متعاونون ومتاحون", "type": "likert", "required": true},
  {"text": "المرافق والتجهيزات مناسبة", "type": "likert", "required": true},
  {"text": "هل تنصح الآخرين بالالتحاق بهذا البرنامج؟", "type": "mcq", "options": ["نعم بشدة", "نعم", "محايد", "لا", "لا بشدة"], "required": true}
]'::jsonb, NULL),

('تقييم عضو هيئة التدريس', 'Faculty Evaluation', 'قالب لتقييم أداء أعضاء هيئة التدريس', 'quality',
'[
  {"text": "عضو هيئة التدريس ملتزم بمواعيد المحاضرات", "type": "likert", "required": true},
  {"text": "يشرح المادة بوضوح ويجيب على الأسئلة", "type": "likert", "required": true},
  {"text": "يستخدم طرق تدريس متنوعة وفعالة", "type": "likert", "required": true},
  {"text": "يقدم تغذية راجعة مفيدة للطلاب", "type": "likert", "required": true},
  {"text": "ما هي نقاط القوة لدى عضو هيئة التدريس؟", "type": "text", "required": false}
]'::jsonb, NULL);

-- إدراج إعدادات النظام الافتراضية
INSERT INTO public.system_settings (key, value, description) VALUES
('email_notifications', '{"enabled": true, "smtp_host": "", "smtp_port": 587}', 'إعدادات الإشعارات عبر البريد الإلكتروني'),
('survey_settings', '{"default_anonymous": true, "auto_close_days": 30}', 'إعدادات الاستبيانات الافتراضية'),
('report_settings', '{"auto_generate": true, "include_charts": true}', 'إعدادات التقارير'),
('ai_settings', '{"enabled": false, "api_key": "", "model": "gpt-3.5-turbo"}', 'إعدادات الذكاء الاصطناعي')
ON CONFLICT (key) DO NOTHING;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_surveys_program_status ON public.surveys(program_id, status);
CREATE INDEX IF NOT EXISTS idx_responses_survey_submitted ON public.responses(survey_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs(user_id, action, created_at);

-- إضافة RLS policies للجداول الجديدة
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for survey_templates
CREATE POLICY "Everyone can view active templates" ON public.survey_templates 
    FOR SELECT USING (is_active = true);
CREATE POLICY "Coordinators can manage templates" ON public.survey_templates 
    FOR ALL USING (
        public.has_role(auth.uid(), 'coordinator') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- Policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings 
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON public.notifications 
    FOR UPDATE USING (user_id = auth.uid());

-- Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs 
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- إنشاء دالة لتسجيل أحداث التدقيق
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
        auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;

-- إنشاء دالة لإرسال الإشعارات
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_related_id UUID DEFAULT NULL,
    p_related_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, title, message, type, related_id, related_type
    ) VALUES (
        p_user_id, p_title, p_message, p_type, p_related_id, p_related_type
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- إنشاء trigger لتحديث عدد الاستجابات
CREATE OR REPLACE FUNCTION public.update_survey_response_count()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.surveys 
        SET response_count = response_count + 1
        WHERE id = NEW.survey_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.surveys 
        SET response_count = GREATEST(response_count - 1, 0)
        WHERE id = OLD.survey_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_survey_response_count
    AFTER INSERT OR DELETE ON public.responses
    FOR EACH ROW EXECUTE FUNCTION public.update_survey_response_count();

-- إضافة trigger لتحديث updated_at للجداول الجديدة
CREATE TRIGGER update_survey_templates_updated_at 
    BEFORE UPDATE ON public.survey_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
