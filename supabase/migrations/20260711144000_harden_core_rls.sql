-- Remove legacy permissive policies. PostgreSQL ORs permissive policies, so
-- leaving even one old broad policy would bypass the newer role-aware rules.

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view profiles" ON public.profiles;

-- Surveys: replace all historical read/write variants with one explicit set.
DROP POLICY IF EXISTS "Everyone can view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Public can view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Anyone can view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can view all surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated users to view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can view surveys based on role" ON public.surveys;
DROP POLICY IF EXISTS "Public reads currently active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Managed users read surveys" ON public.surveys;

DROP POLICY IF EXISTS "Coordinators can create surveys for their program" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated users to create surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can create surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authorized users create surveys" ON public.surveys;

DROP POLICY IF EXISTS "Coordinators can update their surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated users to update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authorized users update surveys" ON public.surveys;

DROP POLICY IF EXISTS "Coordinators can delete their surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow survey creators to delete surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can delete surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authorized users delete unanswered surveys" ON public.surveys;

CREATE POLICY "Public reads currently active surveys"
ON public.surveys
FOR SELECT
TO anon, authenticated
USING (
  status = 'active'::public.survey_status
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

CREATE POLICY "Managed users read surveys"
ON public.surveys
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'dean'::public.app_role)
  OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
  OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
);

CREATE POLICY "Authorized users create surveys"
ON public.surveys
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'dean'::public.app_role)
    OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
    OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
  )
);

CREATE POLICY "Authorized users update surveys"
ON public.surveys
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'dean'::public.app_role)
  OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
  OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'dean'::public.app_role)
  OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
  OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
);

CREATE POLICY "Authorized users delete unanswered surveys"
ON public.surveys
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, program_id)
  OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, program_id)
);

-- Questions
DROP POLICY IF EXISTS "Everyone can view questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions for active surveys" ON public.questions;
DROP POLICY IF EXISTS "Allow authenticated users to view questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Survey creators can manage questions" ON public.questions;
DROP POLICY IF EXISTS "Allow authenticated users to create questions" ON public.questions;
DROP POLICY IF EXISTS "Allow authenticated users to update questions" ON public.questions;
DROP POLICY IF EXISTS "Allow authenticated users to delete questions" ON public.questions;
DROP POLICY IF EXISTS "Users can create questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions" ON public.questions;
DROP POLICY IF EXISTS "Public reads active survey questions" ON public.questions;
DROP POLICY IF EXISTS "Managed users read survey questions" ON public.questions;
DROP POLICY IF EXISTS "Authorized users create questions" ON public.questions;
DROP POLICY IF EXISTS "Authorized users update questions" ON public.questions;
DROP POLICY IF EXISTS "Authorized users delete unanswered questions" ON public.questions;

CREATE POLICY "Public reads active survey questions"
ON public.questions
FOR SELECT
TO anon, authenticated
USING (
  NOT is_archived
  AND EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = questions.survey_id
      AND survey.status = 'active'::public.survey_status
      AND (survey.start_date IS NULL OR survey.start_date <= now())
      AND (survey.end_date IS NULL OR survey.end_date >= now())
  )
);

CREATE POLICY "Managed users read survey questions"
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = questions.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

CREATE POLICY "Authorized users create questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = questions.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

CREATE POLICY "Authorized users update questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = questions.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = questions.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

CREATE POLICY "Authorized users delete unanswered questions"
ON public.questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = questions.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

-- Responses and answers are immutable through table APIs. Anonymous and
-- authenticated clients must use submit_survey_response(), which is atomic.
DROP POLICY IF EXISTS "Everyone can submit responses" ON public.responses;
DROP POLICY IF EXISTS "Anyone can submit responses to active surveys" ON public.responses;
DROP POLICY IF EXISTS "Public can submit responses to active surveys" ON public.responses;
DROP POLICY IF EXISTS "Public can submit responses" ON public.responses;
DROP POLICY IF EXISTS "Allow anonymous and authenticated to submit responses" ON public.responses;
DROP POLICY IF EXISTS "Allow anyone to submit responses" ON public.responses;
DROP POLICY IF EXISTS "Allow authenticated users to create responses" ON public.responses;
DROP POLICY IF EXISTS "Users can create responses" ON public.responses;
DROP POLICY IF EXISTS "Allow authenticated users to update responses" ON public.responses;
DROP POLICY IF EXISTS "Users can update responses" ON public.responses;
DROP POLICY IF EXISTS "Allow authenticated users to view responses" ON public.responses;
DROP POLICY IF EXISTS "Coordinators can view responses for their program surveys" ON public.responses;
DROP POLICY IF EXISTS "Users can view responses" ON public.responses;
DROP POLICY IF EXISTS "Users can view responses based on role" ON public.responses;
DROP POLICY IF EXISTS "Managed users read survey responses" ON public.responses;

CREATE POLICY "Managed users read survey responses"
ON public.responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = responses.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

DROP POLICY IF EXISTS "Everyone can submit answers" ON public.answers;
DROP POLICY IF EXISTS "Anyone can submit answers to active surveys" ON public.answers;
DROP POLICY IF EXISTS "Public can submit answers to active surveys" ON public.answers;
DROP POLICY IF EXISTS "Public can submit answers" ON public.answers;
DROP POLICY IF EXISTS "Allow anonymous and authenticated to submit answers" ON public.answers;
DROP POLICY IF EXISTS "Allow anyone to submit answers" ON public.answers;
DROP POLICY IF EXISTS "Coordinators can view answers" ON public.answers;
DROP POLICY IF EXISTS "Users can view answers based on role" ON public.answers;
DROP POLICY IF EXISTS "Managed users read survey answers" ON public.answers;

CREATE POLICY "Managed users read survey answers"
ON public.answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.responses AS response
    JOIN public.surveys AS survey ON survey.id = response.survey_id
    WHERE response.id = answers.response_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

REVOKE INSERT, UPDATE, DELETE ON public.responses FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.answers FROM anon, authenticated;

-- Reports
DROP POLICY IF EXISTS "Coordinators can view program reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view reports based on role" ON public.reports;
DROP POLICY IF EXISTS "Managed users read reports" ON public.reports;
DROP POLICY IF EXISTS "Coordinators can create reports" ON public.reports;
DROP POLICY IF EXISTS "Managed users create reports" ON public.reports;
DROP POLICY IF EXISTS "Coordinators and admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Managed users update reports" ON public.reports;
DROP POLICY IF EXISTS "Managed users delete reports" ON public.reports;

CREATE POLICY "Managed users read reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = reports.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

CREATE POLICY "Managed users create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = reports.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

CREATE POLICY "Managed users update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = reports.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = reports.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

CREATE POLICY "Managed users delete reports"
ON public.reports
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.surveys AS survey
    WHERE survey.id = reports.survey_id
      AND (
        survey.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'dean'::public.app_role)
        OR public.has_role_in_program(auth.uid(), 'coordinator'::public.app_role, survey.program_id)
        OR public.has_role_in_program(auth.uid(), 'program_manager'::public.app_role, survey.program_id)
      )
  )
);

-- Complaints: keep public submission, but prevent clients from inserting an
-- already-resolved complaint or overriding system-owned resolution fields.
DROP POLICY IF EXISTS "Students can submit complaints" ON public.complaints;
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.complaints;
DROP POLICY IF EXISTS "Allow authenticated users to create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Public submits valid complaints" ON public.complaints;
DROP POLICY IF EXISTS "Allow authenticated users to view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Allow authenticated users to update complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can update complaints" ON public.complaints;

CREATE POLICY "Public submits valid complaints"
ON public.complaints
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'::public.complaint_status
  AND length(btrim(subject)) BETWEEN 1 AND 500
  AND length(btrim(description)) BETWEEN 1 AND 10000
  AND length(COALESCE(student_email, '')) <= 320
  AND (student_id IS NULL OR student_id = auth.uid())
  AND resolution_notes IS NULL
  AND resolved_at IS NULL
  AND resolved_by IS NULL
);

-- Legacy broad archive access bypassed the later program-aware policies.
DROP POLICY IF EXISTS "Allow authenticated users to view archives" ON public.archives;
DROP POLICY IF EXISTS "Allow authenticated users to create archives" ON public.archives;

-- Only non-sensitive branding keys are readable outside the admin settings UI.
DROP POLICY IF EXISTS "Everyone can view settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users read safe settings" ON public.system_settings;
CREATE POLICY "Authenticated users read safe settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (key IN ('college_logo', 'college_name'));

-- These legacy SECURITY DEFINER helpers are not called by the application and
-- must not be executable by arbitrary clients. Guard the statements because
-- older environments may not contain both optional helpers.
DO $$
BEGIN
  IF to_regprocedure('public.create_notification(uuid,text,text,text,uuid,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, uuid, text) TO service_role';
  END IF;

  IF to_regprocedure('public.log_audit_event(text,text,uuid,jsonb,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb) TO service_role';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM anon, authenticated;
