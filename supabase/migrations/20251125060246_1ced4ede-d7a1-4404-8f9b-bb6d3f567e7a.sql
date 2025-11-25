-- تحديث سياسة INSERT لجدول answers أيضاً

DROP POLICY IF EXISTS "Public can submit answers" ON answers;

CREATE POLICY "Allow anonymous and authenticated to submit answers"
ON answers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);