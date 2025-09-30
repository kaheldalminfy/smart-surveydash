import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const SurveyComplete = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-elegant">
        <CardContent className="pt-12 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">شكراً لمشاركتك!</h2>
            <p className="text-muted-foreground">
              تم إرسال إجاباتك بنجاح. نقدر وقتك ومساهمتك في تحسين جودة التعليم.
            </p>
          </div>
          <Link to="/">
            <Button variant="hero" size="lg" className="w-full">
              العودة للصفحة الرئيسية
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveyComplete;
