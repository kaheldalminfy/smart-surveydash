-- تحديث نظام الأذونات والأدوار
-- إضافة جدول الأدوار المحسن
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إدراج الأدوار الأساسية
INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES
('super_admin', 'مدير النظام', 'صلاحيات كاملة على النظام', 
 '["manage_users", "manage_roles", "manage_surveys", "manage_reports", "manage_complaints", "manage_archives", "system_settings"]'::jsonb, true),
('admin', 'مدير', 'صلاحيات إدارية عامة', 
 '["manage_surveys", "manage_reports", "manage_complaints", "view_analytics", "manage_users_limited"]'::jsonb, true),
('survey_manager', 'مدير الاستبيانات', 'إدارة الاستبيانات والتقارير', 
 '["create_surveys", "edit_surveys", "view_responses", "generate_reports", "manage_distribution"]'::jsonb, true),
('analyst', 'محلل البيانات', 'تحليل البيانات والتقارير', 
 '["view_surveys", "view_responses", "view_analytics", "generate_reports", "export_data"]'::jsonb, true),
('coordinator', 'منسق البرنامج', 'إدارة برنامج محدد', 
 '["create_surveys_program", "view_responses_program", "manage_complaints_program", "view_analytics_program"]'::jsonb, true),
('faculty', 'عضو هيئة تدريس', 'عرض التقارير والمشاركة في الاستبيانات', 
 '["view_surveys", "respond_surveys", "view_reports_limited"]'::jsonb, true),
('student', 'طالب', 'المشاركة في الاستبيانات وتقديم الشكاوى', 
 '["respond_surveys", "submit_complaints", "view_own_responses"]'::jsonb, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = timezone('utc'::text, now());

-- إضافة جدول ربط المستخدمين بالأدوار
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id, program_id)
);

-- إضافة جدول سجل الأذونات
CREATE TABLE IF NOT EXISTS permission_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  permission_required VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_program_id ON user_roles(program_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_permission_logs_user_id ON permission_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_logs_created_at ON permission_logs(created_at);

-- تحديث جدول profiles لإضافة معلومات الدور
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_role_id UUID REFERENCES roles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- دالة للحصول على أذونات المستخدم
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  user_permissions JSONB := '[]'::jsonb;
  role_record RECORD;
BEGIN
  -- جمع جميع الأذونات من الأدوار النشطة للمستخدم
  FOR role_record IN
    SELECT r.permissions
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid 
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  LOOP
    user_permissions := user_permissions || role_record.permissions;
  END LOOP;
  
  -- إزالة التكرارات
  SELECT jsonb_agg(DISTINCT value)
  INTO user_permissions
  FROM jsonb_array_elements_text(user_permissions) AS value;
  
  RETURN COALESCE(user_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من صلاحية المستخدم
CREATE OR REPLACE FUNCTION check_user_permission(user_uuid UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  user_permissions := get_user_permissions(user_uuid);
  RETURN user_permissions ? required_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتسجيل محاولات الوصول
CREATE OR REPLACE FUNCTION log_permission_check(
  user_uuid UUID,
  action_name TEXT,
  resource_type_name TEXT,
  resource_uuid UUID DEFAULT NULL,
  permission_name TEXT DEFAULT NULL,
  was_granted BOOLEAN DEFAULT false,
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO permission_logs (
    user_id, action, resource_type, resource_id, 
    permission_required, granted, ip_address, user_agent
  ) VALUES (
    user_uuid, action_name, resource_type_name, resource_uuid,
    permission_name, was_granted, client_ip, client_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتعيين دور للمستخدم
CREATE OR REPLACE FUNCTION assign_user_role(
  user_uuid UUID,
  role_name TEXT,
  program_uuid UUID DEFAULT NULL,
  assigned_by_uuid UUID DEFAULT NULL,
  expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  role_uuid UUID;
BEGIN
  -- الحصول على معرف الدور
  SELECT id INTO role_uuid FROM roles WHERE name = role_name;
  
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Role % not found', role_name;
  END IF;
  
  -- إدراج أو تحديث تعيين الدور
  INSERT INTO user_roles (user_id, role_id, program_id, assigned_by, expires_at)
  VALUES (user_uuid, role_uuid, program_uuid, assigned_by_uuid, expires_at_param)
  ON CONFLICT (user_id, role_id, program_id) 
  DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = timezone('utc'::text, now()),
    expires_at = EXCLUDED.expires_at,
    is_active = true;
  
  -- تحديث الدور الأساسي في profiles إذا لم يكن موجوداً
  UPDATE profiles 
  SET primary_role_id = role_uuid, role_assigned_at = timezone('utc'::text, now())
  WHERE id = user_uuid AND primary_role_id IS NULL;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإلغاء دور المستخدم
CREATE OR REPLACE FUNCTION revoke_user_role(
  user_uuid UUID,
  role_name TEXT,
  program_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  role_uuid UUID;
BEGIN
  -- الحصول على معرف الدور
  SELECT id INTO role_uuid FROM roles WHERE name = role_name;
  
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Role % not found', role_name;
  END IF;
  
  -- إلغاء تفعيل الدور
  UPDATE user_roles 
  SET is_active = false
  WHERE user_id = user_uuid 
    AND role_id = role_uuid 
    AND (program_id = program_uuid OR (program_id IS NULL AND program_uuid IS NULL));
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث سياسات الأمان (RLS)

-- سياسة الأمان لجدول الأدوار
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Only super admins can modify roles" ON roles
  FOR ALL USING (
    check_user_permission(auth.uid(), 'manage_roles')
  );

-- سياسة الأمان لجدول user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR 
    check_user_permission(auth.uid(), 'manage_users') OR
    check_user_permission(auth.uid(), 'manage_roles')
  );

CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL USING (
    check_user_permission(auth.uid(), 'manage_users') OR
    check_user_permission(auth.uid(), 'manage_roles')
  );

-- سياسة الأمان لجدول permission_logs
ALTER TABLE permission_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permission logs" ON permission_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    check_user_permission(auth.uid(), 'manage_users') OR
    check_user_permission(auth.uid(), 'system_settings')
  );

CREATE POLICY "System can insert permission logs" ON permission_logs
  FOR INSERT WITH CHECK (true);

-- تحديث سياسات الجداول الموجودة لاستخدام نظام الأذونات الجديد

-- سياسات الاستبيانات
DROP POLICY IF EXISTS "Users can view surveys" ON surveys;
CREATE POLICY "Users can view surveys" ON surveys
  FOR SELECT USING (
    check_user_permission(auth.uid(), 'view_surveys') OR
    check_user_permission(auth.uid(), 'manage_surveys') OR
    (status = 'active' AND check_user_permission(auth.uid(), 'respond_surveys'))
  );

DROP POLICY IF EXISTS "Users can create surveys" ON surveys;
CREATE POLICY "Users can create surveys" ON surveys
  FOR INSERT WITH CHECK (
    check_user_permission(auth.uid(), 'create_surveys') OR
    check_user_permission(auth.uid(), 'manage_surveys')
  );

DROP POLICY IF EXISTS "Users can update surveys" ON surveys;
CREATE POLICY "Users can update surveys" ON surveys
  FOR UPDATE USING (
    check_user_permission(auth.uid(), 'edit_surveys') OR
    check_user_permission(auth.uid(), 'manage_surveys') OR
    (created_by = auth.uid() AND check_user_permission(auth.uid(), 'create_surveys'))
  );

-- سياسات الاستجابات
DROP POLICY IF EXISTS "Users can view responses" ON responses;
CREATE POLICY "Users can view responses" ON responses
  FOR SELECT USING (
    check_user_permission(auth.uid(), 'view_responses') OR
    check_user_permission(auth.uid(), 'manage_surveys') OR
    (respondent_id = auth.uid() AND check_user_permission(auth.uid(), 'view_own_responses'))
  );

DROP POLICY IF EXISTS "Users can create responses" ON responses;
CREATE POLICY "Users can create responses" ON responses
  FOR INSERT WITH CHECK (
    check_user_permission(auth.uid(), 'respond_surveys')
  );

-- سياسات الشكاوى
DROP POLICY IF EXISTS "Users can view complaints" ON complaints;
CREATE POLICY "Users can view complaints" ON complaints
  FOR SELECT USING (
    check_user_permission(auth.uid(), 'manage_complaints') OR
    (submitted_by = auth.uid() AND check_user_permission(auth.uid(), 'submit_complaints'))
  );

DROP POLICY IF EXISTS "Users can create complaints" ON complaints;
CREATE POLICY "Users can create complaints" ON complaints
  FOR INSERT WITH CHECK (
    check_user_permission(auth.uid(), 'submit_complaints')
  );

DROP POLICY IF EXISTS "Users can update complaints" ON complaints;
CREATE POLICY "Users can update complaints" ON complaints
  FOR UPDATE USING (
    check_user_permission(auth.uid(), 'manage_complaints')
  );

-- إنشاء view لعرض معلومات المستخدمين مع أدوارهم
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.program_id,
  prog.name as program_name,
  r.name as role_name,
  r.display_name as role_display_name,
  r.permissions,
  ur.assigned_at,
  ur.expires_at,
  ur.is_active,
  p.last_login_at,
  p.login_count
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id AND ur.is_active = true
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN programs prog ON p.program_id = prog.id
ORDER BY p.full_name;

-- تحديث trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إنشاء دالة لتحديث آخر تسجيل دخول
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET 
    last_login_at = timezone('utc'::text, now()),
    login_count = COALESCE(login_count, 0) + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعيين أدوار افتراضية للمستخدمين الموجودين
DO $$
DECLARE
  user_record RECORD;
  student_role_id UUID;
BEGIN
  -- الحصول على معرف دور الطالب
  SELECT id INTO student_role_id FROM roles WHERE name = 'student';
  
  -- تعيين دور الطالب للمستخدمين الذين ليس لديهم أدوار
  FOR user_record IN
    SELECT p.id, p.program_id
    FROM profiles p
    LEFT JOIN user_roles ur ON p.id = ur.user_id AND ur.is_active = true
    WHERE ur.id IS NULL
  LOOP
    INSERT INTO user_roles (user_id, role_id, program_id, is_active)
    VALUES (user_record.id, student_role_id, user_record.program_id, true)
    ON CONFLICT DO NOTHING;
    
    UPDATE profiles 
    SET primary_role_id = student_role_id, role_assigned_at = timezone('utc'::text, now())
    WHERE id = user_record.id AND primary_role_id IS NULL;
  END LOOP;
END $$;
