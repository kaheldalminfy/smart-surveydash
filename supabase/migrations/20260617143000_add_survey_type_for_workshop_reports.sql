ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS survey_type TEXT NOT NULL DEFAULT 'course_evaluation';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'surveys_survey_type_check'
      AND conrelid = 'public.surveys'::regclass
  ) THEN
    ALTER TABLE public.surveys
    ADD CONSTRAINT surveys_survey_type_check
    CHECK (survey_type IN ('course_evaluation', 'workshop', 'program', 'general'));
  END IF;
END $$;

UPDATE public.surveys
SET survey_type = 'workshop'
WHERE lower(title) = lower('Interpreting Booth Simulation Workshop');

COMMENT ON COLUMN public.surveys.survey_type IS 'Controls report wording and analytics context: course_evaluation, workshop, program, or general.';
