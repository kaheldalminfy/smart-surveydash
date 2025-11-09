-- Drop the old restrictive policy for public access
DROP POLICY IF EXISTS "Public can view active surveys" ON public.surveys;

-- Create a new PERMISSIVE policy that allows anyone to view active surveys
CREATE POLICY "Anyone can view active surveys"
ON public.surveys
FOR SELECT
USING (status = 'active');

-- Also ensure questions can be viewed by anyone when the survey is active
DROP POLICY IF EXISTS "Everyone can view questions" ON public.questions;

CREATE POLICY "Anyone can view questions for active surveys"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = questions.survey_id
    AND surveys.status = 'active'
  )
);

-- Ensure responses table allows public submissions
DROP POLICY IF EXISTS "Everyone can submit responses" ON public.responses;

CREATE POLICY "Anyone can submit responses to active surveys"
ON public.responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = responses.survey_id
    AND surveys.status = 'active'
  )
);

-- Ensure answers table allows public submissions
DROP POLICY IF EXISTS "Everyone can submit answers" ON public.answers;

CREATE POLICY "Anyone can submit answers to active surveys"
ON public.answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.surveys s ON s.id = r.survey_id
    WHERE r.id = answers.response_id
    AND s.status = 'active'
  )
);