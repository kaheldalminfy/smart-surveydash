import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Home } from "lucide-react";

const ComplaintSubmitted = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">تم إرسال الشكوى بنجاح</CardTitle>
          <CardDescription className="text-base mt-2">
            شكراً لك على تواصلك معنا
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent p-4 rounded-lg">
            <p className="text-sm text-center">
              تم استلام شكواك وسيتم مراجعتها من قبل الفريق المختص في أقرب وقت ممكن.
              سنتواصل معك عبر البريد الإلكتروني بخصوص حالة شكواك.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">الخطوات التالية:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 mr-6">
              <li>• سيتم مراجعة شكواك خلال 3-5 أيام عمل</li>
              <li>• ستصلك رسالة تأكيد على بريدك الإلكتروني</li>
              <li>• سيتم التواصل معك لأي معلومات إضافية إذا لزم الأمر</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => navigate("/")}
              className="w-full"
              variant="hero"
            >
              <Home className="h-4 w-4 ml-2" />
              العودة للصفحة الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplaintSubmitted;