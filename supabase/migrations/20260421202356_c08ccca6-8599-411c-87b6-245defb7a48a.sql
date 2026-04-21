
-- Remove the 1 orphan response (no answers) discovered during audit.
-- The response_deletion trigger only blocks responses WITH answers, so we don't need to disable it.
DELETE FROM responses WHERE id = '8592b47b-41da-47a8-8e05-53ff197cab3a'
  AND NOT EXISTS (SELECT 1 FROM answers WHERE response_id = '8592b47b-41da-47a8-8e05-53ff197cab3a');
