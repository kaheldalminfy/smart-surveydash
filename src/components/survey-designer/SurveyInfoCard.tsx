import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SurveyFormData } from "./types";

interface SurveyInfoCardProps {
  survey: SurveyFormData;
  setSurvey: React.Dispatch<React.SetStateAction<SurveyFormData>>;
  programs: any[];
  getUniqueAcademicYears: () => string[];
  getUniqueSemesters: () => string[];
}

const SurveyInfoCard = ({ survey, setSurvey, programs, getUniqueAcademicYears, getUniqueSemesters }: SurveyInfoCardProps) => {
  const { t, language } = useLanguage();

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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="program">{t('designer.program')}</Label>
            <select id="program" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.programId} onChange={(e) => setSurvey({...survey, programId: e.target.value})}>
              <option value="">{t('designer.selectProgram')}</option>
              {programs.map((program) => (<option key={program.id} value={program.id}>{program.name}</option>))}
            </select>
          </div>
          <div>
            <Label htmlFor="anonymous">{language === 'ar' ? "نوع الاستبيان" : "Survey Type"}</Label>
            <select id="anonymous" className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={survey.isAnonymous ? "anonymous" : "identified"}
              onChange={(e) => setSurvey({...survey, isAnonymous: e.target.value === "anonymous"})}>
              <option value="anonymous">{language === 'ar' ? "مجهول الهوية" : "Anonymous"}</option>
              <option value="identified">{language === 'ar' ? "محدد الهوية" : "Identified"}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="targetEnrollment" className="text-sm font-medium">
                {t('designer.targetEnrollment')} ({language === 'ar' ? "اختياري" : "optional"})
              </Label>
              <Input id="targetEnrollment" type="number" min="0" placeholder={language === 'ar' ? "مثال: 100" : "e.g. 100"}
                value={survey.targetEnrollment} onChange={(e) => setSurvey({...survey, targetEnrollment: e.target.value})} className="max-w-[200px]" />
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? "أدخل عدد الطلبة لحساب نسبة الاستجابة بدقة في التقارير" : "Enter student count for accurate response rate in reports"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SurveyInfoCard;
