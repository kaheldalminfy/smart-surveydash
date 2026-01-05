
-- Temporarily disable the trigger to allow deletion of empty responses
DROP TRIGGER IF EXISTS prevent_response_deletion_trigger ON responses;

-- Delete empty responses for surveys that have no saved statistics
DELETE FROM responses 
WHERE id IN (
  SELECT r.id 
  FROM responses r 
  WHERE r.survey_id IN ('65f46e28-21fe-4e7d-ad8a-450c277525e9', 'e4eb99d4-b83a-4a5b-9ad4-970878d0df95')
  AND NOT EXISTS (SELECT 1 FROM answers a WHERE a.response_id = r.id)
);

-- Re-enable the trigger
CREATE TRIGGER prevent_response_deletion_trigger
  BEFORE DELETE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_response_deletion_with_answers();
