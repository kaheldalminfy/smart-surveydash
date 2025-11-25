-- تحديث INSERT policy لجدول answers

-- حذف السياسة القديمة إن وجدت
DROP POLICY IF EXISTS "Public can submit answers to active surveys" ON answers;

-- إنشاء سياسة جديدة للسماح بإدخال الإجابات على الاستبيانات النشطة
CREATE POLICY "Anyone can submit answers to active surveys"
ON answers
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM responses r
    JOIN surveys s ON s.id = r.survey_id
    WHERE r.id = answers.response_id
    AND s.status = 'active'::survey_status
  )
);