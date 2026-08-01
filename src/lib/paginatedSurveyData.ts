import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const PAGE_SIZE = 500;
const MAX_ROWS = 100_000;

export type SurveyAnswerRow = Tables<"answers">;
export type SurveyQuestionRow = Tables<"questions">;
export type SurveyResponseWithAnswers = Tables<"responses"> & {
  answers: SurveyAnswerRow[];
};

export const isMissingCompletionColumn = (error: { code?: string; message?: string; details?: string }) => {
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return (error.code === "42703" || error.code === "PGRST204")
    && message.includes("is_complete");
};

export const mapWithConcurrency = async <T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>,
) => {
  if (items.length === 0) return [];

  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(Math.floor(concurrency), items.length));

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }));

  return results;
};

interface FetchSurveyQuestionsOptions {
  includeSections?: boolean;
}

export const fetchAllSurveyQuestions = async (
  surveyId: string,
  { includeSections = false }: FetchSurveyQuestionsOptions = {},
) => {
  const rows: SurveyQuestionRow[] = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    let query = supabase
      .from("questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("order_index", { ascending: true })
      .order("id", { ascending: true });

    if (!includeSections) query = query.neq("type", "section");

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }

  throw new Error("Question export limit exceeded");
};

const fetchResponsePages = async (surveyId: string, requireComplete: boolean) => {
  const rows: SurveyResponseWithAnswers[] = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    let query = supabase
      .from("responses")
      .select("*, answers(*)")
      .eq("survey_id", surveyId)
      .order("submitted_at", { ascending: true })
      .order("id", { ascending: true });

    if (requireComplete) query = query.eq("is_complete", true);

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data || []) as SurveyResponseWithAnswers[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }

  throw new Error("Response export limit exceeded");
};

export const fetchAllCompleteSurveyResponses = async (surveyId: string) => {
  try {
    const rows = await fetchResponsePages(surveyId, true);
    return rows.filter(response => response.answers.length > 0);
  } catch (error) {
    if (!isMissingCompletionColumn(error as { code?: string; message?: string; details?: string })) {
      throw error;
    }

    // Compatibility for the deployment window before the integrity migration.
    const legacyRows = await fetchResponsePages(surveyId, false);
    return legacyRows.filter(response => response.answers.length > 0);
  }
};
