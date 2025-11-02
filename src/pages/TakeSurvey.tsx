import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Send,
  Star,
  HelpCircle,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  text: string;
  type: string;
  order_index: number;
  is_required: boolean;
  help_text?: string;
  options?: any;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  status: string;
  settings?: any;
}

const TakeSurvey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadSurvey();
    }
  }, [id]);

  const loadSurvey = async () => {
    setIsLoading(true);
    try {
      // Load survey details
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .single();

      if (surveyError) throw surveyError;

      // Allow viewing active surveys for public, all statuses for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user && surveyData.status !== "active") {
        toast({
          title: "الاستبيان غير متاح",
          description: "هذا الاستبيان غير نشط حالياً",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      console.log("Survey loaded:", surveyData);

      setSurvey(surveyData);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", id)
        .order("order_index");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الاستبيان",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error for this question
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateCurrentQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return true;

    // Check if required question has a valid response
    if (currentQuestion.is_required && 
        (responses[currentQuestion.id] === undefined || 
         responses[currentQuestion.id] === null || 
         responses[currentQuestion.id] === "")) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: "هذا السؤال مطلوب"
      }));
      return false;
    }

    return true;
  };

  const nextQuestion = () => {
    if (validateCurrentQuestion() && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitSurvey = async () => {
    // Validate all required questions - check if response exists and is not empty
    const missingRequiredQuestions = questions.filter(
      q => q.is_required && (
        responses[q.id] === undefined || 
        responses[q.id] === null || 
        responses[q.id] === ""
      )
    );

    console.log("All responses:", responses);
    console.log("Required questions:", questions.filter(q => q.is_required));
    console.log("Missing required questions:", missingRequiredQuestions);

    if (missingRequiredQuestions.length > 0) {
      toast({
        title: "أسئلة مطلوبة",
        description: `يرجى الإجابة على جميع الأسئلة المطلوبة (${missingRequiredQuestions.length} سؤال متبقي)`,
        variant: "destructive",
      });
      
      // Navigate to first missing required question
      const firstMissingIndex = questions.findIndex(
        q => q.is_required && (
          responses[q.id] === undefined || 
          responses[q.id] === null || 
          responses[q.id] === ""
        )
      );
      if (firstMissingIndex !== -1) {
        setCurrentQuestionIndex(firstMissingIndex);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create response record
      const { data: responseData, error: responseError } = await supabase
        .from("responses")
        .insert({
          survey_id: id,
          respondent_id: survey?.is_anonymous ? null : user?.id,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Create answer records
      const answersData = questions.map(question => {
        const responseValue = responses[question.id];
        return {
          response_id: responseData.id,
          question_id: question.id,
          value: responseValue ? String(responseValue) : null,
          numeric_value: !isNaN(Number(responseValue)) ? Number(responseValue) : null,
        };
      });

      const { error: answersError } = await supabase
        .from("answers")
        .insert(answersData);

      if (answersError) throw answersError;

      toast({
        title: "تم إرسال الاستبيان",
        description: "شكراً لك على مشاركتك في الاستبيان",
      });

      navigate("/survey-complete");

    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال الاستبيان. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const value = responses[question.id];

    switch (question.type) {
      case "likert":
        const likertOptions = [
          "غير موافق بشدة",
          "غير موافق", 
          "محايد",
          "موافق",
          "موافق بشدة"
        ];
        
        return (
          <RadioGroup 
            value={value} 
            onValueChange={(val) => handleResponseChange(question.id, val)}
            className="space-y-3"
          >
            {likertOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={String(index + 1)} id={`${question.id}-${index}`} />
                <Label 
                  htmlFor={`${question.id}-${index}`} 
                  className="flex-1 cursor-pointer font-medium"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "mcq":
        const mcqOptions = question.options?.choices || [];
        
        return (
          <RadioGroup 
            value={value} 
            onValueChange={(val) => handleResponseChange(question.id, val)}
            className="space-y-3"
          >
            {mcqOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2 space-x-reverse p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label 
                  htmlFor={`${question.id}-${index}`} 
                  className="flex-1 cursor-pointer font-medium"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "rating":
        return (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleResponseChange(question.id, rating)}
                className={`p-2 rounded-lg transition-colors ${
                  value >= rating 
                    ? 'text-accent' 
                    : 'text-muted-foreground hover:text-accent/70'
                }`}
              >
                <Star className="h-6 w-6 fill-current" />
              </button>
            ))}
            <span className="mr-2 text-sm text-muted-foreground">
              {value ? `${value} من 5` : 'اختر التقييم'}
            </span>
          </div>
        );

      case "text":
        return (
          <Textarea
            placeholder="اكتب إجابتك هنا..."
            value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            rows={6}
            className="resize-none"
          />
        );

      default:
        return (
          <Input
            placeholder="اكتب إجابتك هنا..."
            value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الاستبيان...</p>
        </div>
      </div>
    );
  }

  if (!survey || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">الاستبيان غير موجود</h2>
            <p className="text-muted-foreground">لم يتم العثور على الاستبيان المطلوب</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentQuestion = questions[currentQuestionIndex];
  const hasError = validationErrors[currentQuestion?.id];

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              السؤال {currentQuestionIndex + 1} من {questions.length}
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

        <Card className={`shadow-elegant ${hasError ? 'border-red-500' : ''}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{survey.title}</CardTitle>
                <p className="text-muted-foreground">{survey.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {currentQuestion?.is_required && (
                  <Badge variant="destructive" className="text-xs">مطلوب</Badge>
                )}
                {survey.is_anonymous && (
                  <Badge variant="outline" className="text-xs">مجهول</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="min-h-[300px]">
              <h3 className="text-lg font-semibold mb-4">
                {currentQuestion?.text}
              </h3>

              {currentQuestion?.help_text && (
                <div className="flex items-start gap-2 mb-6 p-3 bg-blue-50 rounded-lg">
                  <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{currentQuestion.help_text}</p>
                </div>
              )}

              {currentQuestion && renderQuestionInput(currentQuestion)}

              {hasError && (
                <div className="flex items-center gap-2 mt-4 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{hasError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                السابق
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>الوقت: {Math.floor((Date.now() - startTime) / 60000)} دقيقة</span>
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button 
                  variant="hero"
                  onClick={submitSurvey} 
                  disabled={isSubmitting}
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                      إرسال الاستبيان
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={nextQuestion}>
                  التالي
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>كلية العلوم الإنسانية والاجتماعية - منظومة الاستبيانات الذكية</p>
        </div>
      </div>
    </div>
  );
};

export default TakeSurvey;
