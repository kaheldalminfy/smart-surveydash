import * as XLSX from 'xlsx';

export interface SurveyExportData {
  title: string;
  description: string;
  programId?: string;
  isAnonymous: boolean;
  questions: Array<{
    text: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
}

export const exportSurveyToJSON = (survey: SurveyExportData): void => {
  const dataStr = JSON.stringify(survey, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `استبيان_${survey.title}_${Date.now()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const exportSurveyToCSV = (survey: SurveyExportData): void => {
  const questionsData = survey.questions.map((q, index) => ({
    'رقم السؤال': index + 1,
    'نص السؤال': q.text,
    'نوع السؤال': q.type,
    'مطلوب': q.required ? 'نعم' : 'لا',
    'خيارات': q.options ? q.options.join(' | ') : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(questionsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'أسئلة الاستبيان');
  
  XLSX.writeFile(workbook, `استبيان_${survey.title}_${Date.now()}.csv`);
};

export const importSurveyFromJSON = async (file: File): Promise<SurveyExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate structure
        if (!data.title || !data.questions || !Array.isArray(data.questions)) {
          throw new Error('صيغة الملف غير صحيحة');
        }
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsText(file);
  });
};

export const importSurveyFromCSV = async (file: File): Promise<SurveyExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const questions = jsonData.map((row: any) => ({
          text: row['نص السؤال'] || '',
          type: row['نوع السؤال'] || 'text',
          required: row['مطلوب'] === 'نعم',
          options: row['خيارات'] ? row['خيارات'].split(' | ') : undefined,
        }));
        
        resolve({
          title: 'استبيان مستورد',
          description: '',
          isAnonymous: true,
          questions,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
};
