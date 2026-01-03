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
      // Load survey details - public surveys don't need authentication
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      console.log("Survey data:", surveyData);
      console.log("Survey error:", surveyError);

      if (surveyError) {
        console.error("Survey error:", surveyError);
        toast({
          title: "خطأ في التحميل",
          description: "فشل في تحميل الاستبيان. يرجى التأكد من أن الاستبيان موجود",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (!surveyData) {
        toast({
          title: "الاستبيان غير موجود",
          description: "لم يتم العثور على الاستبيان المطلوب",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Check if survey is active
      if (surveyData.status !== "active") {
        toast({
          title: "الاستبيان غير متاح",
          description: "هذا الاستبيان غير نشط حالياً. يرجى التواصل مع منسق البرنامج.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      console.log("Survey loaded successfully:", surveyData.title);
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
      console.error("Load survey error:", error);
      toast({
        title: "خطأ في التحميل",
        description: error.message || "فشل في تحميل الاستبيان. يرجى التحقق من أن الاستبيان موجود وفي حالة 'نشط'",
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
      // إعادة تحميل الأسئلة من قاعدة البيانات للتأكد من صحتها
      const { data: freshQuestions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", id)
        .order("order_index");

      if (questionsError) {
        console.error("Failed to reload questions:", questionsError);
        throw new Error("فشل في التحقق من الأسئلة. يرجى إعادة تحميل الصفحة.");
      }

      if (!freshQuestions || freshQuestions.length === 0) {
        throw new Error("لا توجد أسئلة في هذا الاستبيان");
      }

      // إنشاء خريطة للأسئلة الصالحة
      const validQuestionIds = new Set(freshQuestions.map(q => q.id));
      
      // التحقق من أن جميع الإجابات تتطابق مع أسئلة موجودة
      const invalidResponses = Object.keys(responses).filter(qId => !validQuestionIds.has(qId));
      if (invalidResponses.length > 0) {
        console.warn("Found responses for non-existent questions:", invalidResponses);
      }

      // Try to get current user, but don't fail if not logged in
      let userId = null;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!authError && user) {
          userId = user.id;
        }
      } catch (authError) {
        console.log("User not authenticated, proceeding as anonymous:", authError);
      }

      console.log("Current user ID:", userId);
      console.log("Survey is_anonymous:", survey?.is_anonymous);

      // Create response record - generate UUID locally to avoid SELECT permission issue
      const responseId = crypto.randomUUID();
      
      const { error: responseError } = await supabase
        .from("responses")
        .insert({
          id: responseId,
          survey_id: id,
          respondent_id: survey?.is_anonymous || !userId ? null : userId,
        });

      console.log("Response ID:", responseId);
      console.log("Response error:", responseError);

      if (responseError) {
        console.error("Response insert error details:", {
          message: responseError.message,
          details: responseError.details,
          hint: responseError.hint,
          code: responseError.code
        });
        throw responseError;
      }

      // Create answer records using freshly loaded questions
      // Filter out section questions - they don't need answers
      const questionsWithAnswers = freshQuestions.filter(q => q.type !== 'section');
      
      const answersData = questionsWithAnswers.map(question => {
        const responseValue = responses[question.id];
        return {
          response_id: responseId,
          question_id: question.id,
          value: responseValue !== undefined && responseValue !== null ? String(responseValue) : null,
          numeric_value: responseValue !== undefined && responseValue !== null && !isNaN(Number(responseValue)) ? Number(responseValue) : null,
        };
      }).filter(answer => answer.value !== null || answer.numeric_value !== null);

      console.log("Questions with answers count:", questionsWithAnswers.length);
      console.log("Inserting answers:", answersData);
      console.log("Answers count:", answersData.length);

      if (answersData.length === 0) {
        console.warn("No answers to insert!");
      }

      const { error: answersError } = await supabase
        .from("answers")
        .insert(answersData);

      console.log("Answers insert completed, count:", answersData.length);
      console.log("Answers error:", answersError);

      if (answersError) {
        console.error("Answers insert error details:", {
          message: answersError.message,
          details: answersError.details,
          hint: answersError.hint,
          code: answersError.code
        });
        throw answersError;
      }

      toast({
        title: "تم إرسال الاستبيان",
        description: "شكراً لك على مشاركتك في الاستبيان",
      });

      navigate("/survey-complete", { state: { surveyId: id } });

    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "خطأ في الإرسال",
        description: error.message || "حدث خطأ أثناء إرسال الاستبيان. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    // استخدام question.id + order_index للتأكد من عدم التعارض
    const uniqueKey = `${question.id}-${question.order_index}`;
    const value = responses[question.id];

    switch (question.type) {
      case "section":
        // Section headers don't need input
        return null;
        
      case "likert":
        const likertOptions = [
          { label: "غير موافق بشدة", value: "1" },
          { label: "غير موافق", value: "2" },
          { label: "محايد", value: "3" },
          { label: "موافق", value: "4" },
          { label: "موافق بشدة", value: "5" }
        ];
        
        return (
          <RadioGroup 
            key={uniqueKey}
            value={String(value) || ""} 
            onValueChange={(val) => handleResponseChange(question.id, val)}
            className="space-y-3"
          >
            {likertOptions.map((option, index) => {
              const optionId = `q-${question.id}-opt-${index}-${question.order_index}`;
              const isSelected = String(value) === option.value;
              
              return (
                <div 
                  key={optionId} 
                  className={`flex items-center space-x-2 space-x-reverse p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/30'
                  }`}
                  onClick={() => handleResponseChange(question.id, option.value)}
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={optionId}
                    checked={isSelected}
                  />
                  <Label 
                    htmlFor={optionId} 
                    className="flex-1 cursor-pointer font-medium text-base"
                  >
                    {option.label}
                  </Label>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              );
            })}
          </RadioGroup>
        );

      case "mcq":
        const mcqOptions = question.options?.choices || [];
        
        return (
          <RadioGroup 
            key={uniqueKey}
            value={String(value) || ""} 
            onValueChange={(val) => handleResponseChange(question.id, val)}
            className="space-y-3"
          >
            {mcqOptions.map((option: string, index: number) => {
              const optionId = `q-${question.id}-opt-${index}-${question.order_index}`;
              const isSelected = String(value) === option;
              
              return (
                <div 
                  key={optionId} 
                  className={`flex items-center space-x-2 space-x-reverse p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/30'
                  }`}
                  onClick={() => handleResponseChange(question.id, option)}
                >
                  <RadioGroupItem 
                    value={option} 
                    id={optionId}
                    checked={isSelected}
                  />
                  <Label 
                    htmlFor={optionId} 
                    className="flex-1 cursor-pointer font-medium text-base"
                  >
                    {option}
                  </Label>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              );
            })}
          </RadioGroup>
        );

      case "rating":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={`rating-${question.id}-${rating}`}
                  type="button"
                  onClick={() => handleResponseChange(question.id, rating)}
                  className={`p-3 rounded-xl transition-all transform hover:scale-110 ${
                    value >= rating 
                      ? 'text-accent scale-110' 
                      : 'text-muted-foreground hover:text-accent/70'
                  }`}
                >
                  <Star className="h-10 w-10 fill-current" />
                </button>
              ))}
            </div>
            <div className="text-center">
              <span className="text-lg font-semibold text-primary">
                {value ? `${value} من 5 نجوم` : 'اختر التقييم'}
              </span>
            </div>
          </div>
        );

      case "text":
        return (
          <Textarea
            key={uniqueKey}
            placeholder="اكتب إجابتك هنا بالتفصيل..."
            value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            rows={8}
            className="resize-none text-base p-4 border-2 focus:border-primary"
          />
        );

      default:
        return (
          <Input
            key={uniqueKey}
            placeholder="اكتب إجابتك هنا..."
            value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className="text-base p-4 border-2 focus:border-primary"
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

  if (!survey) {
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">لا توجد أسئلة</h2>
            <p className="text-muted-foreground">هذا الاستبيان لا يحتوي على أسئلة حالياً. يرجى المحاولة لاحقاً.</p>
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
        {/* Survey Header - Fixed */}
        <Card className="mb-6 bg-card/95 backdrop-blur shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{survey.title}</CardTitle>
                {survey.description && (
                  <p className="text-muted-foreground text-base">{survey.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {survey.is_anonymous && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    استبيان مجهول
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-foreground">
              السؤال {currentQuestionIndex + 1} من {questions.length}
            </h2>
            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className={`shadow-elegant transition-all ${hasError ? 'border-2 border-red-500 animate-pulse' : 'border'} ${currentQuestion?.type === 'section' ? 'bg-primary/5 border-primary/30' : ''}`}>
          <CardHeader className={`border-b ${currentQuestion?.type === 'section' ? 'bg-primary/10' : 'bg-accent/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={currentQuestion?.type === 'section' ? 'default' : 'outline'} className="text-xs">
                    {currentQuestion?.type === 'section' ? 'عنوان قسم' : `سؤال ${currentQuestionIndex + 1}`}
                  </Badge>
                  {currentQuestion?.is_required && currentQuestion?.type !== 'section' && (
                    <Badge variant="destructive" className="text-xs">
                      * مطلوب
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-8">
            <div className="min-h-[350px]">
              <h3 className={`font-bold mb-6 text-foreground leading-relaxed ${currentQuestion?.type === 'section' ? 'text-2xl text-primary' : 'text-xl'}`}>
                {currentQuestion?.text}
              </h3>

              {currentQuestion?.help_text && (
                <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 leading-relaxed">{currentQuestion.help_text}</p>
                </div>
              )}

              {currentQuestion && currentQuestion.type !== 'section' && renderQuestionInput(currentQuestion)}
              
              {currentQuestion?.type === 'section' && (
                <p className="text-muted-foreground text-center mt-8">
                  اضغط على "التالي" للمتابعة إلى أسئلة هذا القسم
                </p>
              )}

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
