-- إنشاء enum لنوع التقرير إذا لم يكن موجوداً
DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('survey', 'program');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- تحديث جدول reports لإضافة الحقول الجديدة
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS report_type report_type DEFAULT 'survey',
ADD COLUMN IF NOT EXISTS logo_url text;

-- تحديث جدول complaints لإضافة الحقول المطلوبة
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS complainant_academic_id text,
ADD COLUMN IF NOT EXISTS complainant_job_id text;

-- إنشاء جدول courses للمقررات الدراسية
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  code text NOT NULL,
  description text,
  semester text,
  academic_year text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS على جدول courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Everyone can view courses" ON courses;
DROP POLICY IF EXISTS "Coordinators can manage courses" ON courses;

-- سياسات courses
CREATE POLICY "Everyone can view courses"
ON courses FOR SELECT
USING (true);

CREATE POLICY "Coordinators can manage courses"
ON courses FOR ALL
USING (
  has_role_in_program(auth.uid(), 'coordinator', program_id) 
  OR has_role(auth.uid(), 'admin')
);

-- إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- إنشاء جدول لربط الاستبيانات بالمقررات
CREATE TABLE IF NOT EXISTS survey_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(survey_id, course_id)
);

-- Enable RLS على جدول survey_courses
ALTER TABLE survey_courses ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Everyone can view survey courses" ON survey_courses;
DROP POLICY IF EXISTS "Coordinators can manage survey courses" ON survey_courses;

-- سياسات survey_courses
CREATE POLICY "Everyone can view survey courses"
ON survey_courses FOR SELECT
USING (true);

CREATE POLICY "Coordinators can manage survey courses"
ON survey_courses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = survey_courses.survey_id
    AND (surveys.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- إنشاء جدول لتخزين إعدادات النظام (مثل شعار الكلية)
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS على جدول system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Everyone can view settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can manage settings" ON system_settings;

-- سياسات system_settings
CREATE POLICY "Everyone can view settings"
ON system_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage settings"
ON system_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- إدراج الشعار الافتراضي
INSERT INTO system_settings (key, value, description)
VALUES ('college_logo', '', 'شعار الكلية')
ON CONFLICT (key) DO NOTHING;