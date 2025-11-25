-- إصلاح INSERT policy لجدول responses للسماح بإرسال الاستبيانات

-- حذف السياسة القديمة إن وجدت
DROP POLICY IF EXISTS "Public can submit responses" ON responses;

-- إنشاء سياسة جديدة للسماح للجميع بإرسال ردود على الاستبيانات النشطة
CREATE POLICY "Anyone can submit responses to active surveys"
ON responses
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = responses.survey_id
    AND surveys.status = 'active'::survey_status
  )
);