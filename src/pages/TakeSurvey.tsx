import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2 } from "lucide-react";

const TakeSurvey = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const questions = [
    { id: 1, text: "مدى وضوح أهداف المقرر الدراسي", type: "likert" },
    { id: 2, text: "جودة المحتوى العلمي المقدم", type: "likert" },
    { id: 3, text: "فعالية طرق التدريس المستخدمة", type: "likert" },
    { id: 4, text: "مقترحات وملاحظات إضافية", type: "text" },
  ];

  const likertOptions = [
    { value: "1", label: "غير موافق بشدة" },
    { value: "2", label: "غير موافق" },
    { value: "3", label: "محايد" },
    { value: "4", label: "موافق" },
    { value: "5", label: "موافق بشدة" },
  ];

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Submit survey
      navigate("/survey-complete");
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              السؤال {currentQuestion + 1} من {questions.length}
            </h2>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-2xl">تقييم جودة المقرر</CardTitle>
            <CardDescription>
              القانون التجاري - الفصل الدراسي الأول 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="min-h-[300px]">
              <h3 className="text-lg font-semibold mb-6">
                {questions[currentQuestion].text}
              </h3>

              {questions[currentQuestion].type === "likert" && (
                <RadioGroup 
                  value={answers[currentQuestion]?.toString()}
                  onValueChange={(value) => setAnswers({...answers, [currentQuestion]: value})}
                  className="space-y-3"
                >
                  {likertOptions.map((option) => (
                    <div 
                      key={option.value}
                      className="flex items-center space-x-3 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label 
                        htmlFor={option.value} 
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {questions[currentQuestion].type === "text" && (
                <Textarea 
                  placeholder="اكتب ملاحظاتك ومقترحاتك هنا..."
                  rows={8}
                  value={answers[currentQuestion] || ""}
                  onChange={(e) => setAnswers({...answers, [currentQuestion]: e.target.value})}
                />
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                السابق
              </Button>
              <Button 
                variant={currentQuestion === questions.length - 1 ? "hero" : "default"}
                onClick={handleNext}
              >
                {currentQuestion === questions.length - 1 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                    إرسال الاستبيان
                  </>
                ) : (
                  "التالي"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TakeSurvey;
