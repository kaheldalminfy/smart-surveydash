-- حل مشكلة إرسال الاستبيانات للمستخدمين غير المسجلين (من الهاتف)
-- المشكلة: سياسة RLS على جدول responses تمنع المستخدمين غير المسجلين من الإرسال

-- حذف السياسة القديمة التي تتطلب المصادقة
DROP POLICY IF EXISTS "Anyone can submit responses to active surveys" ON public.responses;

-- إنشاء سياسة جديدة تسمح للجميع (مسجلين وغير مسجلين) بإرسال الردود للاستبيانات النشطة
CREATE POLICY "Public can submit responses to active surveys"
ON public.responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM surveys
    WHERE surveys.id = responses.survey_id
    AND surveys.status = 'active'
  )
);

-- تحديث سياسة answers أيضاً للسماح للجميع بإرسال الإجابات
DROP POLICY IF EXISTS "Anyone can submit answers to active surveys" ON public.answers;

CREATE POLICY "Public can submit answers to active surveys"
ON public.answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM responses r
    JOIN surveys s ON s.id = r.survey_id
    WHERE r.id = answers.response_id
    AND s.status = 'active'
  )
);