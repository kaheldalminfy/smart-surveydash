import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TakeSurvey = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [survey, setSurvey] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    if (id) {
      loadSurvey();
    }
  }, [id]);

  const loadSurvey = async () => {
    setLoading(true);
    const { data: surveyData, error: surveyError } = await supabase
      .from("surveys")
      .select("*, programs(name)")
      .eq("id", id)
      .single();

    if (surveyError || !surveyData) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الاستبيان",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("survey_id", id)
      .order("order_index");

    if (questionsError) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الأسئلة",
        variant: "destructive",
      });
      return;
    }

    setSurvey(surveyData);
    setQuestions(questionsData || []);
    setLoading(false);
  };

  const likertOptions = [
    { value: "1", label: "غير موافق بشدة" },
    { value: "2", label: "غير موافق" },
    { value: "3", label: "محايد" },
    { value: "4", label: "موافق" },
    { value: "5", label: "موافق بشدة" },
  ];

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      await submitSurvey();
    }
  };

  const submitSurvey = async () => {
    setSubmitting(true);
    try {
      // Create response
      const { data: responseData, error: responseError } = await supabase
        .from("responses")
        .insert({
          survey_id: id,
          respondent_id: null, // Anonymous
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Create answers
      const answersData = questions.map((question, index) => ({
        response_id: responseData.id,
        question_id: question.id,
        value: answers[index] || "",
        numeric_value: question.type === "likert" || question.type === "rating" 
          ? parseInt(answers[index] || "0") 
          : null,
      }));

      const { error: answersError } = await supabase
        .from("answers")
        .insert(answersData);

      if (answersError) throw answersError;

      navigate("/survey-complete");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال الاستبيان",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!survey || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">لا توجد أسئلة في هذا الاستبيان</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            <CardDescription>
              {survey.programs?.name} • {survey.description}
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
                disabled={submitting}
              >
                {submitting ? (
                  "جاري الإرسال..."
                ) : currentQuestion === questions.length - 1 ? (
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
