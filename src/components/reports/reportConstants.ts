export const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
export const MCQ_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16'];

export const getMeanLevel = (mean: number) => {
  if (mean >= 4.5) return { label: 'ممتاز', color: 'bg-green-500' };
  if (mean >= 3.5) return { label: 'جيد جداً', color: 'bg-green-400' };
  if (mean >= 2.5) return { label: 'متوسط', color: 'bg-yellow-500' };
  if (mean >= 1.5) return { label: 'ضعيف', color: 'bg-orange-500' };
  return { label: 'ضعيف جداً', color: 'bg-red-500' };
};
