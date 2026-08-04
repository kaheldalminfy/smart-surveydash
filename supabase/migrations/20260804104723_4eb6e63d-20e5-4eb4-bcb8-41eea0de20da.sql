ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS course_name text;

UPDATE public.recommendations
SET course_name = NULLIF(btrim(split_part(title, ' - ', 2)), '')
WHERE course_name IS NULL
  AND source_type = 'survey'
  AND position(' - ' in title) > 0;

CREATE INDEX IF NOT EXISTS recommendations_source_id_idx
  ON public.recommendations (source_id);