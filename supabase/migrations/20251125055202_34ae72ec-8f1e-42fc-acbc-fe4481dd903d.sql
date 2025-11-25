-- الخطوة 2: تحديث RLS policies لدعم الدور الجديد

-- تحديث policies للجدول surveys
DROP POLICY IF EXISTS "Authenticated users can view all surveys" ON surveys;
CREATE POLICY "Users can view surveys based on role"
ON surveys
FOR SELECT
TO authenticated
USING (
  has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR
  has_role_in_program(auth.uid(), 'program_manager'::app_role, program_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'dean'::app_role) OR
  status = 'active'::survey_status
);

-- تحديث policies للجدول reports
DROP POLICY IF EXISTS "Coordinators can view program reports" ON reports;
CREATE POLICY "Users can view reports based on role"
ON reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = reports.survey_id
    AND (
      has_role_in_program(auth.uid(), 'coordinator'::app_role, surveys.program_id) OR
      has_role_in_program(auth.uid(), 'program_manager'::app_role, surveys.program_id) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'dean'::app_role)
    )
  )
);

-- تحديث policies للجدول responses
DROP POLICY IF EXISTS "Coordinators can view responses for their program surveys" ON responses;
CREATE POLICY "Users can view responses based on role"
ON responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = responses.survey_id
    AND (
      has_role_in_program(auth.uid(), 'coordinator'::app_role, surveys.program_id) OR
      has_role_in_program(auth.uid(), 'program_manager'::app_role, surveys.program_id) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'dean'::app_role)
    )
  )
);

-- تحديث policies للجدول answers
DROP POLICY IF EXISTS "Coordinators can view answers" ON answers;
CREATE POLICY "Users can view answers based on role"
ON answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM responses r
    JOIN surveys s ON s.id = r.survey_id
    WHERE r.id = answers.response_id
    AND (
      has_role_in_program(auth.uid(), 'coordinator'::app_role, s.program_id) OR
      has_role_in_program(auth.uid(), 'program_manager'::app_role, s.program_id) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'dean'::app_role)
    )
  )
);

-- تحديث policies للجدول complaints
DROP POLICY IF EXISTS "Coordinators can view program complaints" ON complaints;
CREATE POLICY "Users can view complaints based on role"
ON complaints
FOR SELECT
TO authenticated
USING (
  has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR
  has_role_in_program(auth.uid(), 'program_manager'::app_role, program_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'dean'::app_role) OR
  (student_id = auth.uid())
);

DROP POLICY IF EXISTS "Coordinators can update program complaints" ON complaints;
CREATE POLICY "Only coordinators can update complaints"
ON complaints
FOR UPDATE
TO authenticated
USING (
  has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- تحديث policies للجدول recommendations
DROP POLICY IF EXISTS "Coordinators can view program recommendations" ON recommendations;
CREATE POLICY "Users can view recommendations based on role"
ON recommendations
FOR SELECT
TO authenticated
USING (
  has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR
  has_role_in_program(auth.uid(), 'program_manager'::app_role, program_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'dean'::app_role) OR
  (assigned_to = auth.uid())
);

DROP POLICY IF EXISTS "Coordinators can manage recommendations" ON recommendations;
CREATE POLICY "Only coordinators can manage recommendations"
ON recommendations
FOR ALL
TO authenticated
USING (
  has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- تحديث policies للجدول archives
DROP POLICY IF EXISTS "Coordinators can view program archives" ON archives;
CREATE POLICY "Users can view archives based on role"
ON archives
FOR SELECT
TO authenticated
USING (
  has_role_in_program(auth.uid(), 'coordinator'::app_role, program_id) OR
  has_role_in_program(auth.uid(), 'program_manager'::app_role, program_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'dean'::app_role)
);