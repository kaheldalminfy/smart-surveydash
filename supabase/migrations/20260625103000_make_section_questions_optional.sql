UPDATE public.questions
SET is_required = false
WHERE type = 'section'
  AND is_required IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.normalize_section_question_required()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'section' THEN
    NEW.is_required := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS normalize_section_question_required ON public.questions;
CREATE TRIGGER normalize_section_question_required
BEFORE INSERT OR UPDATE OF type, is_required ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_section_question_required();
