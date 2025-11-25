-- إصلاح سياسة INSERT لجدول answers

DROP POLICY IF EXISTS "Anyone can submit answers to active surveys" ON answers;

-- إنشاء سياسة أبسط
CREATE POLICY "Public can submit answers"
ON answers
FOR INSERT
WITH CHECK (true);