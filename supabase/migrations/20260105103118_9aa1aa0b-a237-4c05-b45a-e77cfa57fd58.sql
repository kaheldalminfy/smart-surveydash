
-- Create trigger to prevent deleting questions with answers
CREATE OR REPLACE FUNCTION prevent_question_modification_with_answers()
RETURNS TRIGGER AS $$
DECLARE
  answer_count INTEGER;
BEGIN
  -- Check if there are any answers for this question
  SELECT COUNT(*) INTO answer_count FROM answers WHERE question_id = OLD.id;
  
  IF answer_count > 0 THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'لا يمكن حذف السؤال لأنه يحتوي على % إجابة. يرجى حذف الإجابات أولاً أو إنشاء استبيان جديد.', answer_count;
    ELSIF TG_OP = 'UPDATE' AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'لا يمكن تغيير معرف السؤال لأنه يحتوي على % إجابة.', answer_count;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger on questions table
DROP TRIGGER IF EXISTS prevent_question_delete_with_answers ON questions;
CREATE TRIGGER prevent_question_delete_with_answers
BEFORE DELETE OR UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION prevent_question_modification_with_answers();

-- Also create a trigger to prevent deleting responses with answers
CREATE OR REPLACE FUNCTION prevent_response_deletion_with_answers()
RETURNS TRIGGER AS $$
DECLARE
  answer_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO answer_count FROM answers WHERE response_id = OLD.id;
  
  IF answer_count > 0 THEN
    RAISE EXCEPTION 'لا يمكن حذف الاستجابة لأنها تحتوي على % إجابة.', answer_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_response_delete_with_answers ON responses;
CREATE TRIGGER prevent_response_delete_with_answers
BEFORE DELETE ON responses
FOR EACH ROW
EXECUTE FUNCTION prevent_response_deletion_with_answers();
