import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SurveyResponseWarningProps {
  responseCount: number;
  hasExistingAnswers: boolean;
}

const SurveyResponseWarning = ({ responseCount, hasExistingAnswers }: SurveyResponseWarningProps) => {
  const { language } = useLanguage();

  if (responseCount <= 0) return null;

  return (
    <Alert variant={hasExistingAnswers ? "destructive" : "default"} className="border-2">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="font-bold">
        {hasExistingAnswers
          ? (language === 'ar' ? "⚠️ تحذير هام: استبيان له إجابات محفوظة" : "⚠️ Warning: Survey has saved answers")
          : (language === 'ar' ? "ℹ️ معلومة: استبيان له استجابات" : "ℹ️ Note: Survey has responses")}
      </AlertTitle>
      <AlertDescription>
        {hasExistingAnswers ? (
          <div className="mt-2 space-y-2">
            <p>{language === 'ar' ? `هذا الاستبيان لديه ${responseCount} استجابة مع إجابات محفوظة.` : `This survey has ${responseCount} responses with saved answers.`}</p>
            <p className="text-destructive font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {language === 'ar' ? "لا يمكن حذف أو تعديل الأسئلة الموجودة للحفاظ على سلامة البيانات." : "Cannot modify existing questions to preserve data integrity."}
            </p>
            <p>{language === 'ar' ? "إذا كنت تريد تعديل الأسئلة، يُرجى إنشاء استبيان جديد." : "To modify questions, please create a new survey."}</p>
          </div>
        ) : (
          <p className="mt-2">
            {language === 'ar'
              ? `هذا الاستبيان لديه ${responseCount} استجابة. يمكنك تعديل الإعدادات العامة فقط.`
              : `This survey has ${responseCount} responses. You can only modify general settings.`}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SurveyResponseWarning;
