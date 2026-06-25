ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

UPDATE public.questions
SET is_archived = false
WHERE is_archived IS NULL;

CREATE INDEX IF NOT EXISTS idx_questions_active_order
ON public.questions (survey_id, order_index)
WHERE is_archived = false;
