export type SemesterKey = "fall" | "spring";

export const normalizeSemester = (value?: string | null): SemesterKey | null => {
  const v = (value || "").trim().toLowerCase();
  if (!v) return null;
  if (v.includes("خريف") || v.includes("fall") || v.includes("autumn")) return "fall";
  if (v.includes("ربيع") || v.includes("spring")) return "spring";
  return null;
};

export const meanOf = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export const performanceLevel = (mean: number | null, ar = true) => {
  if (mean == null) return "—";
  if (mean >= 4.5) return ar ? "ممتاز" : "Excellent";
  if (mean >= 3.5) return ar ? "جيد جدًا" : "Very good";
  if (mean >= 2.5) return ar ? "متوسط" : "Average";
  if (mean >= 1.5) return ar ? "ضعيف" : "Poor";
  return ar ? "ضعيف جدًا" : "Very poor";
};

export const aggregateQuestions = (surveys: { questions: { text: string; values: number[] }[] }[]) => {
  const map = new Map<string, number[]>();
  surveys.forEach((s) => s.questions.forEach((q) => {
    const key = q.text.trim();
    map.set(key, [...(map.get(key) ?? []), ...q.values]);
  }));
  return Array.from(map, ([text, values]) => ({ text, mean: meanOf(values), count: values.length }))
    .filter((q) => q.count > 0)
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
};
