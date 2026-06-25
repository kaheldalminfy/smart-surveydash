import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { SurveyFormData } from "./types";
import { getReportTypeOptions } from "@/utils/reportType";

interface SurveyInfoCardProps {
  survey: SurveyFormData;
  setSurvey: React.Dispatch<React.SetStateAction<SurveyFormData>>;
  programs: any[];
  getUniqueAcademicYears: () => string[];
  getUniqueSemesters: () => string[];
}

const SurveyInfoCard = ({ survey, setSurvey, programs, getUniqueAcademicYears, getUniqueSemesters }: SurveyInfoCardProps) => {
  const { t, language } = useLanguage();
  const reportTypeOptions = getReportTypeOptions(language);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ar' ? "معلومات الاستبيان" : "Survey Information"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">{t('designer.surveyTitle')}</Label>
          <Input id="title" placeholder={language === 'ar' ? "مثال: تقييم جودة المقرر - القانون التجاري" : "Example: Course Quality Evaluation - Commercial Law"}
            value={survey.title} onChange={(e) => setSurvey({...survey, title: e.target.value})} />
        </div>
        <div>
          <Label htmlFor="description">{t('designer.surveyDescription')}</Label>
          <Textarea id="description" placeholder={language === 'ar' ? "وصف مختصر للاستبيان وأهدافه" : "Brief description of survey and its objectives"} rows={3}
            value={survey.description} onChange={(e) => setSurvey({...survey, description: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reportType">{language === 'ar' ? "نوع التقرير" : "Report Type"}</Label>
            <select id="reportType" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.reportType}
              onChange={(e) => setSurvey({...survey, reportType: e.target.value as SurveyFormData["reportType"]})}>
              {reportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {reportTypeOptions.find((option) => option.value === survey.reportType)?.description}
            </p>
          </div>
          <div>
            <Label htmlFor="program">{t('designer.program')}</Label>
            <select id="program" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.programId} onChange={(e) => setSurvey({...survey, programId: e.target.value})}>
              <option value="">{t('designer.selectProgram')}</option>
              <option value="college">{language === 'ar' ? "على مستوى الكلية" : "College Level"}</option>
              {programs.map((program) => (<option key={program.id} value={program.id}>{program.name}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="anonymous">{language === 'ar' ? "هوية المشارك" : "Participant Identity"}</Label>
            <select id="anonymous" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.isAnonymous ? "anonymous" : "identified"}
              onChange={(e) => setSurvey({...survey, isAnonymous: e.target.value === "anonymous"})}>
              <option value="anonymous">{language === 'ar' ? "مجهول الهوية" : "Anonymous"}</option>
              <option value="identified">{language === 'ar' ? "محدد الهوية" : "Identified"}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="academicYear">{t('designer.academicYear')}</Label>
            <select id="academicYear" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.academicYear} onChange={(e) => setSurvey({...survey, academicYear: e.target.value})}>
              <option value="">{language === 'ar' ? "اختر السنة الأكاديمية" : "Select Academic Year"}</option>
              {getUniqueAcademicYears().map((year) => (<option key={year} value={year}>{year}</option>))}
            </select>
          </div>
          <div>
            <Label htmlFor="semester">{t('designer.semester')}</Label>
            <select id="semester" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.semester} onChange={(e) => setSurvey({...survey, semester: e.target.value})}>
              <option value="">{language === 'ar' ? "اختر الفصل الدراسي" : "Select Semester"}</option>
              {getUniqueSemesters().map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SurveyInfoCard;
