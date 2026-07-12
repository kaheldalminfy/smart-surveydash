import Papa from 'papaparse';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_QUESTIONS = 500;
const QUESTION_TYPES = new Set(['section', 'likert', 'text', 'mcq', 'rating']);

export interface SurveyExportData {
  title: string;
  description: string;
  reportType?: "course_evaluation" | "workshop" | "program" | "general";
  programId?: string;
  isAnonymous: boolean;
  questions: Array<{
    text: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
}

interface CsvQuestionRow {
  'رقم السؤال'?: string;
  'نص السؤال'?: string;
  'نوع السؤال'?: string;
  'مطلوب'?: string;
  'خيارات'?: string;
}

const safeFileName = (value: string) => value
  .replace(/[\\/:*?"<>|]/g, '_')
  .trim()
  .substring(0, 60) || 'استبيان';

const downloadTextFile = (contents: string, mimeType: string, fileName: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const validateImportFile = (file: File) => {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error('حجم الملف أكبر من الحد المسموح (5 ميجابايت)');
  }
};

const validateSurveyData = (value: unknown): SurveyExportData => {
  if (!value || typeof value !== 'object') throw new Error('صيغة الملف غير صحيحة');

  const candidate = value as Partial<SurveyExportData>;
  if (typeof candidate.title !== 'string' || !candidate.title.trim()) {
    throw new Error('عنوان الاستبيان مفقود');
  }
  if (!Array.isArray(candidate.questions) || candidate.questions.length > MAX_QUESTIONS) {
    throw new Error('قائمة الأسئلة غير صحيحة أو تتجاوز 500 سؤال');
  }

  const questions = candidate.questions.map((question, index) => {
    if (!question || typeof question !== 'object') {
      throw new Error(`بيانات السؤال ${index + 1} غير صحيحة`);
    }
    const text = typeof question.text === 'string' ? question.text.trim() : '';
    const type = typeof question.type === 'string' ? question.type : 'text';
    if (!QUESTION_TYPES.has(type) || (type !== 'section' && !text) || text.length > 2000) {
      throw new Error(`بيانات السؤال ${index + 1} غير صحيحة`);
    }

    const options = Array.isArray(question.options)
      ? question.options.map(option => String(option).trim()).filter(Boolean).slice(0, 100)
      : undefined;

    return {
      text,
      type,
      required: type === 'section' ? false : question.required !== false,
      options,
    };
  });

  return {
    title: candidate.title.trim().substring(0, 500),
    description: typeof candidate.description === 'string' ? candidate.description.substring(0, 5000) : '',
    reportType: candidate.reportType,
    programId: candidate.programId,
    isAnonymous: candidate.isAnonymous !== false,
    questions,
  };
};

export const exportSurveyToJSON = (survey: SurveyExportData): void => {
  const fileName = `استبيان_${safeFileName(survey.title)}_${Date.now()}.json`;
  downloadTextFile(JSON.stringify(survey, null, 2), 'application/json;charset=utf-8', fileName);
};

export const exportSurveyToCSV = (survey: SurveyExportData): void => {
  const questionsData = survey.questions.map((question, index) => ({
    'رقم السؤال': index + 1,
    'نص السؤال': question.text,
    'نوع السؤال': question.type,
    'مطلوب': question.required ? 'نعم' : 'لا',
    'خيارات': question.options ? question.options.join(' | ') : '',
  }));
  const csv = `\uFEFF${Papa.unparse(questionsData, { escapeFormulae: true })}`;
  const fileName = `استبيان_${safeFileName(survey.title)}_${Date.now()}.csv`;
  downloadTextFile(csv, 'text/csv;charset=utf-8', fileName);
};

export const importSurveyFromJSON = async (file: File): Promise<SurveyExportData> => {
  validateImportFile(file);
  const contents = await file.text();
  return validateSurveyData(JSON.parse(contents) as unknown);
};

export const importSurveyFromCSV = async (file: File): Promise<SurveyExportData> => {
  validateImportFile(file);
  const contents = await file.text();
  const result = Papa.parse<CsvQuestionRow>(contents, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (result.errors.length > 0) {
    throw new Error(`فشل تحليل CSV: ${result.errors[0].message}`);
  }
  if (result.data.length > MAX_QUESTIONS) {
    throw new Error('عدد الأسئلة يتجاوز 500 سؤال');
  }

  return validateSurveyData({
    title: 'استبيان مستورد',
    description: '',
    isAnonymous: true,
    questions: result.data.map(row => ({
      text: row['نص السؤال'] || '',
      type: row['نوع السؤال'] || 'text',
      required: row['مطلوب'] === 'نعم',
      options: row['خيارات']
        ? row['خيارات'].split('|').map(option => option.trim()).filter(Boolean)
        : undefined,
    })),
  });
};
