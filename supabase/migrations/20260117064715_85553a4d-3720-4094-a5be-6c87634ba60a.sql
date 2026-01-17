
-- First, drop ALL answer deletion triggers (check for different names)
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'public.answers'::regclass 
        AND tgname LIKE '%answer%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON answers', trigger_rec.tgname);
    END LOOP;
END $$;

-- Drop response deletion trigger
DROP TRIGGER IF EXISTS prevent_response_deletion_trigger ON responses;

-- Now delete the answers
DELETE FROM answers WHERE response_id = '3e20d1c5-b712-4dd6-ac71-c92069e79b78';

-- Delete the response
DELETE FROM responses WHERE id = '3e20d1c5-b712-4dd6-ac71-c92069e79b78';

-- Recreate triggers
CREATE TRIGGER prevent_answer_deletion_trigger
  BEFORE DELETE ON answers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_answer_deletion();

CREATE TRIGGER prevent_response_deletion_trigger
  BEFORE DELETE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_response_deletion_with_answers();
