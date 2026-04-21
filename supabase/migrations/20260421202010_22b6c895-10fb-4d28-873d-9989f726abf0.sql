-- Remove duplicate answers (same response_id + question_id with identical values)
-- Caused by previous merge migration. Keep oldest row per pair.
ALTER TABLE answers DISABLE TRIGGER prevent_answer_deletion_trigger;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY response_id, question_id ORDER BY created_at NULLS LAST, id) AS rn
  FROM answers
)
DELETE FROM answers WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE answers ENABLE TRIGGER prevent_answer_deletion_trigger;

-- Add a unique constraint to prevent this from ever happening again
ALTER TABLE answers ADD CONSTRAINT answers_response_question_unique UNIQUE (response_id, question_id);