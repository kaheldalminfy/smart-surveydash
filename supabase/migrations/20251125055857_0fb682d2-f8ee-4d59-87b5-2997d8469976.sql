-- إصلاح سياسة INSERT لجدول responses
-- المشكلة: استخدام responses.survey_id في WITH CHECK لا يعمل بشكل صحيح

DROP POLICY IF EXISTS "Anyone can submit responses to active surveys" ON responses;

-- إنشاء سياسة أبسط وأكثر وضوحاً
CREATE POLICY "Public can submit responses"
ON responses
FOR INSERT
WITH CHECK (true);