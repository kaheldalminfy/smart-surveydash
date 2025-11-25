-- حل نهائي للمشكلة: تحديث سياسة INSERT لجدول responses

-- حذف السياسة الحالية
DROP POLICY IF EXISTS "Public can submit responses" ON responses;

-- إنشاء سياسة صحيحة تسمح للجميع (مسجلين وغير مسجلين)
CREATE POLICY "Allow anonymous and authenticated to submit responses"
ON responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);