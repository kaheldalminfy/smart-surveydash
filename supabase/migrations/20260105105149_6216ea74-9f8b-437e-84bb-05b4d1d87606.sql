
-- إضافة trigger لمنع حذف الاستبيان إذا كان له استجابات
CREATE OR REPLACE FUNCTION prevent_survey_deletion_with_responses()
RETURNS TRIGGER AS $$
DECLARE
  response_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO response_count FROM responses WHERE survey_id = OLD.id;
  
  IF response_count > 0 THEN
    RAISE EXCEPTION 'لا يمكن حذف الاستبيان لأنه يحتوي على % استجابة. يرجى أرشفة الاستبيان بدلاً من حذفه.', response_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_survey_delete_with_responses ON surveys;
CREATE TRIGGER prevent_survey_delete_with_responses
BEFORE DELETE ON surveys
FOR EACH ROW
EXECUTE FUNCTION prevent_survey_deletion_with_responses();

-- إضافة trigger لمنع حذف الإجابات مباشرة
CREATE OR REPLACE FUNCTION prevent_answer_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'لا يمكن حذف الإجابات مباشرة للحفاظ على سلامة البيانات.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_answer_delete ON answers;
CREATE TRIGGER prevent_answer_delete
BEFORE DELETE ON answers
FOR EACH ROW
EXECUTE FUNCTION prevent_answer_deletion();

-- التأكد من وجود triggers على الجداول
DROP TRIGGER IF EXISTS prevent_question_delete_with_answers ON questions;
CREATE TRIGGER prevent_question_delete_with_answers
BEFORE DELETE OR UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION prevent_question_modification_with_answers();

DROP TRIGGER IF EXISTS prevent_response_delete_with_answers ON responses;
CREATE TRIGGER prevent_response_delete_with_answers
BEFORE DELETE ON responses
FOR EACH ROW
EXECUTE FUNCTION prevent_response_deletion_with_answers();
