import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { SurveyFormData } from "./types";

interface SurveySettingsSidebarProps {
  survey: SurveyFormData;
  setSurvey: React.Dispatch<React.SetStateAction<SurveyFormData>>;
}

const SurveySettingsSidebar = ({ survey, setSurvey }: SurveySettingsSidebarProps) => {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? "الإعدادات" : "Settings"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="start-date">{t('designer.startDate')}</Label>
            <Input id="start-date" type="date" value={survey.startDate} onChange={(e) => setSurvey({...survey, startDate: e.target.value})} />
          </div>
          <div>
            <Label htmlFor="end-date">{t('designer.endDate')}</Label>
            <Input id="end-date" type="date" value={survey.endDate} onChange={(e) => setSurvey({...survey, endDate: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? "نصائح للتصميم" : "Design Tips"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-900">{language === 'ar' ? "استخدم لغة واضحة" : "Use clear language"}</p>
            <p className="text-blue-700">{language === 'ar' ? "اكتب أسئلة مباشرة وسهلة الفهم" : "Write direct and easy-to-understand questions"}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="font-medium text-green-900">{language === 'ar' ? "رتب الأسئلة منطقياً" : "Order questions logically"}</p>
            <p className="text-green-700">{language === 'ar' ? "ابدأ بالأسئلة العامة ثم المحددة" : "Start with general then specific questions"}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="font-medium text-amber-900">{language === 'ar' ? "اختبر الاستبيان" : "Test your survey"}</p>
            <p className="text-amber-700">{language === 'ar' ? "استخدم المعاينة قبل النشر" : "Use preview before publishing"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveySettingsSidebar;
