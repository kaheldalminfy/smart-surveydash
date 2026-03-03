import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ComplaintSubmitted = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('complaintSubmitted.title')}</CardTitle>
          <CardDescription className="text-base mt-2">{t('complaintSubmitted.thankYou')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent p-4 rounded-lg">
            <p className="text-sm text-center">{t('complaintSubmitted.reviewNote')}</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{t('complaintSubmitted.nextSteps')}</h3>
            <ul className="text-sm text-muted-foreground space-y-1 mr-6">
              <li>{t('complaintSubmitted.step1')}</li>
              <li>{t('complaintSubmitted.step2')}</li>
              <li>{t('complaintSubmitted.step3')}</li>
            </ul>
          </div>
          <div className="pt-4">
            <Button onClick={() => navigate("/")} className="w-full" variant="hero">
              <Home className="h-4 w-4 ml-2" />
              {t('complaintSubmitted.backHome')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplaintSubmitted;
