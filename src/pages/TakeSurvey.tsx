import { useState, useEffect, useRef } from "react";
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
  CheckCircle, Clock, AlertCircle, ArrowRight, ArrowLeft, Send, Star, HelpCircle, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

interface Question {
  id: string;
  text: string;
  type: string;
  order_index: number;
  is_required: boolean;
  help_text?: string;
  options?: { choices?: string[]; scale?: string[] } | string[] | null;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  is_anonymous: boolean;
  status: string;
}

type ResponseValue = string | number;

const isMissingSubmissionRpcError = (error: { code?: string; message?: string; details?: string }) => {
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return error.code === "PGRST202"
    || (message.includes("submit_survey_response") && message.includes("function"));
};

const questionMeaningChanged = (
  localQuestion: Question,
  freshQuestion: Pick<Question, "text" | "type" | "order_index" | "is_required"> & { options: unknown },
) => localQuestion.text !== freshQuestion.text
  || localQuestion.type !== freshQuestion.type
  || localQuestion.order_index !== freshQuestion.order_index
  || localQuestion.is_required !== freshQuestion.is_required
  || JSON.stringify(localQuestion.options ?? null) !== JSON.stringify(freshQuestion.options ?? null);

const TakeSurvey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<'ar' | 'en', Record<string, string>>>({ ar: {}, en: {} });
  const [isTranslating, setIsTranslating] = useState(false);
  const submissionToken = useRef(crypto.randomUUID());

  const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s || '');
  const hasLatin = (s: string) => /[A-Za-z]/.test(s || '');
  const detectLang = (s: string): 'ar' | 'en' | null => {
    if (hasArabic(s)) return 'ar';
    if (hasLatin(s)) return 'en';
    return null;
  };
  const tr = (text: string | undefined | null): string => {
    if (!text) return '';
    const src = detectLang(text);
    if (!src || src === language) return text;
    return translations[language]?.[text] ?? text;
  };


  useEffect(() => { if (id) loadSurvey(); }, [id]);

  // Auto-translate survey content when language differs from source
  useEffect(() => {
    if (!survey || questions.length === 0) return;
    const collected: string[] = [];
    const push = (s?: string | null) => {
      if (!s) return;
      const src = detectLang(s);
      if (!src || src === language) return;
      if (translations[language]?.[s]) return;
      if (!collected.includes(s)) collected.push(s);
    };
    push(survey.title);
    push(survey.description);
    questions.forEach(q => {
      push(q.text);
      push(q.help_text);
      const opts = Array.isArray(q.options) ? q.options : q.options?.choices;
      if (Array.isArray(opts)) opts.forEach(o => push(String(o)));
    });
    if (collected.length === 0) return;

    let cancelled = false;
    (async () => {
      setIsTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-survey', {
          body: { texts: collected, targetLang: language },
        });
        if (cancelled) return;
        if (error) throw error;
        const arr: string[] = data?.translations ?? [];
        setTranslations(prev => {
          const next = { ...prev, [language]: { ...prev[language] } };
          collected.forEach((orig, i) => {
            if (arr[i]) next[language][orig] = arr[i];
          });
          return next;
        });
      } catch (e) {
        console.warn('Translation failed', e);
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [language, survey, questions]);


  const loadSurvey = async () => {
    setIsLoading(true);
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys").select("*").eq("id", id).maybeSingle();
      if (surveyError) {
        toast({ title: t('common.error'), description: t('takeSurvey.notFoundDesc'), variant: "destructive" });
        navigate("/"); return;
      }
      if (!surveyData) {
        toast({ title: t('takeSurvey.notFound'), description: t('takeSurvey.notFoundDesc'), variant: "destructive" });
        navigate("/"); return;
      }
      if (surveyData.status !== "active") {
        toast({ title: t('takeSurvey.inactive'), description: t('takeSurvey.inactiveDesc'), variant: "destructive" });
        navigate("/"); return;
      }
      setSurvey(surveyData);
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions").select("*").eq("survey_id", id).eq("is_archived", false).order("order_index");
      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('takeSurvey.notFoundDesc'), variant: "destructive" });
      navigate("/");
    } finally { setIsLoading(false); }
  };

  const handleResponseChange = (questionId: string, value: ResponseValue) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    if (validationErrors[questionId]) {
      setValidationErrors(prev => { const newErrors = { ...prev }; delete newErrors[questionId]; return newErrors; });
    }
  };

  const validateCurrentQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return true;
    if (currentQuestion.type === 'section') return true;
    if (currentQuestion.is_required && (responses[currentQuestion.id] === undefined || responses[currentQuestion.id] === null || responses[currentQuestion.id] === "")) {
      setValidationErrors(prev => ({ ...prev, [currentQuestion.id]: t('takeSurvey.questionRequired') }));
      return false;
    }
    return true;
  };

  const nextQuestion = () => { if (validateCurrentQuestion() && currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1); };
  const previousQuestion = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1); };

  const isAnswered = (val: ResponseValue | undefined) =>
    val !== undefined && val !== null && String(val).trim() !== "";

  const submitWithLegacyFlow = async (
    answersData: Array<{ question_id: string; value: string; numeric_value: number | null }>,
    userId: string | null,
  ) => {
    const responseId = crypto.randomUUID();
    const { error: responseError } = await supabase.from("responses").insert({
      id: responseId,
      survey_id: id!,
      respondent_id: survey?.is_anonymous || !userId ? null : userId,
    });
    if (responseError) throw responseError;

    const { error: answersError } = await supabase.from("answers").insert(
      answersData.map(answer => ({ ...answer, response_id: responseId })),
    );

    if (answersError) {
      // Best-effort cleanup for environments where the atomic RPC has not yet
      // been applied. The migration remains the authoritative integrity fix.
      await supabase.from("responses").delete().eq("id", responseId);
      throw answersError;
    }

    const { error: completionError } = await supabase
      .from("responses")
      .update({ is_complete: true })
      .eq("id", responseId);

    if (completionError) {
      // The legacy anonymous policy may not allow this update. The answers are
      // already committed, so do not report a failed submission and invite a
      // duplicate retry. The integrity migration backfills this flag safely.
      console.warn("Could not mark legacy response as complete", completionError);
    }
  };

  const submitSurvey = async () => {
    // Initial client-side check against current local questions
    const missingRequiredQuestions = questions.filter(
      q => q.type !== 'section' && q.is_required && !isAnswered(responses[q.id])
    );
    if (missingRequiredQuestions.length > 0) {
      toast({
        title: t('takeSurvey.requiredQuestions'),
        description: `${language === 'ar' ? 'يرجى الإجابة على جميع الأسئلة المطلوبة قبل الإرسال' : 'Please answer all required questions before submitting'} (${missingRequiredQuestions.length})`,
        variant: "destructive"
      });
      const firstMissingIndex = questions.findIndex(
        q => q.type !== 'section' && q.is_required && !isAnswered(responses[q.id])
      );
      if (firstMissingIndex !== -1) setCurrentQuestionIndex(firstMissingIndex);
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: freshQuestions, error: questionsError } = await supabase
        .from("questions").select("*").eq("survey_id", id).eq("is_archived", false).order("order_index");
      if (questionsError) throw new Error(language === 'ar' ? "فشل في التحقق من الأسئلة" : "Failed to verify questions");
      if (!freshQuestions || freshQuestions.length === 0) throw new Error(language === 'ar' ? "لا توجد أسئلة في هذا الاستبيان" : "No questions in this survey");
      const dbQuestionMap = new Map(freshQuestions.map(q => [q.id, q]));
      const localQuestionIds = new Set(questions.map(q => q.id));
      const questionsChanged =
        questions.some(q => !dbQuestionMap.has(q.id)) ||
        freshQuestions.some(q => !localQuestionIds.has(q.id)) ||
        questions.some(q => {
          const freshQuestion = dbQuestionMap.get(q.id);
          return freshQuestion ? questionMeaningChanged(q, freshQuestion) : true;
        });
      if (questionsChanged) {
        toast({ title: t('common.error'), description: language === 'ar' ? "تغيرت أسئلة الاستبيان. يرجى إعادة تحميل الصفحة" : "Survey questions changed. Please reload.", variant: "destructive" });
        setQuestions(freshQuestions); setResponses({}); setCurrentQuestionIndex(0); setIsSubmitting(false); return;
      }

      // SERVER-TRUTH validation: verify all required questions from DB are answered
      const missingFromDb = freshQuestions.filter(
        q => q.type !== 'section' && q.is_required && !isAnswered(responses[q.id])
      );
      if (missingFromDb.length > 0) {
        toast({
          title: t('takeSurvey.requiredQuestions'),
          description: `${language === 'ar' ? 'يجب الإجابة على جميع الأسئلة المطلوبة. الأسئلة الناقصة:' : 'All required questions must be answered. Missing:'} ${missingFromDb.length}`,
          variant: "destructive"
        });
        const firstMissingId = missingFromDb[0].id;
        const idx = questions.findIndex(q => q.id === firstMissingId);
        if (idx !== -1) setCurrentQuestionIndex(idx);
        setIsSubmitting(false);
        return;
      }

      let userId: string | null = null;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!authError && user) userId = user.id;
      } catch {
        userId = null;
      }

      // Build answers from FRESH DB questions (source of truth)
      const seen = new Set<string>();
      const questionsWithAnswers = freshQuestions.filter(q => q.type !== 'section' && !seen.has(q.id) && (seen.add(q.id), true));
      const answersData = questionsWithAnswers
        .map(question => {
          const responseValue = responses[question.id];
          const hasValue = isAnswered(responseValue);
          return hasValue ? {
            question_id: question.id,
            value: String(responseValue),
            numeric_value: hasValue && !isNaN(Number(responseValue)) ? Number(responseValue) : null,
          } : null;
        })
        .filter((answer): answer is { question_id: string; value: string; numeric_value: number | null } => answer !== null);

      if (answersData.length === 0) throw new Error(language === 'ar' ? "لا توجد إجابات للإرسال" : "No answers to submit");

      const { error: submissionError } = await supabase.rpc("submit_survey_response", {
        p_survey_id: id!,
        p_answers: answersData,
        p_submission_token: submissionToken.current,
      });

      if (submissionError) {
        if (isMissingSubmissionRpcError(submissionError)) {
          await submitWithLegacyFlow(answersData, userId);
        } else {
          throw submissionError;
        }
      }

      toast({ title: t('takeSurvey.submitted'), description: t('takeSurvey.thankYou') });
      navigate("/survey-complete", { state: { surveyId: id } });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "حدث خطأ أثناء الإرسال" : "Error submitting survey"), variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const likertOptions = [
    { label: `1 - ${t('takeSurvey.stronglyDisagree')}`, value: "1" },
    { label: `2 - ${t('takeSurvey.disagree')}`, value: "2" },
    { label: `3 - ${t('takeSurvey.neutral')}`, value: "3" },
    { label: `4 - ${t('takeSurvey.agree')}`, value: "4" },
    { label: `5 - ${t('takeSurvey.stronglyAgree')}`, value: "5" }
  ];


  const renderQuestionInput = (question: Question) => {
    const uniqueKey = `${question.id}-${question.order_index}`;
    const value = responses[question.id];

    switch (question.type) {
      case "section": return null;
      case "likert":
        return (
          <RadioGroup key={uniqueKey} value={value == null ? "" : String(value)} onValueChange={(val) => handleResponseChange(question.id, val)} className="space-y-3">
            {likertOptions.map((option, index) => {
              const optionId = `q-${question.id}-opt-${index}-${question.order_index}`;
              const isSelected = String(value) === option.value;
              return (
                <div key={optionId} className={`flex items-center space-x-2 space-x-reverse p-4 border-2 rounded-lg transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'}`}
                  onClick={() => handleResponseChange(question.id, option.value)}>
                  <RadioGroupItem value={option.value} id={optionId} checked={isSelected} />
                  <Label htmlFor={optionId} className="flex-1 cursor-pointer font-medium text-base">{option.label}</Label>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              );
            })}
          </RadioGroup>
        );
      case "mcq": {
        const mcqOptions = Array.isArray(question.options)
          ? question.options
          : question.options?.choices || [];
        return (
          <RadioGroup key={uniqueKey} value={value == null ? "" : String(value)} onValueChange={(val) => handleResponseChange(question.id, val)} className="space-y-3">
            {mcqOptions.map((option: string, index: number) => {
              const optionId = `q-${question.id}-opt-${index}-${question.order_index}`;
              const isSelected = String(value) === option;
              return (
                <div key={optionId} className={`flex items-center space-x-2 space-x-reverse p-4 border-2 rounded-lg transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'}`}
                  onClick={() => handleResponseChange(question.id, option)}>
                  <RadioGroupItem value={option} id={optionId} checked={isSelected} />
                  <Label htmlFor={optionId} className="flex-1 cursor-pointer font-medium text-base">{tr(option)}</Label>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              );
            })}
          </RadioGroup>
        );
      }
      case "rating":
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={`rating-${question.id}-${rating}`} type="button" onClick={() => handleResponseChange(question.id, rating)}
                  className={`p-3 rounded-xl transition-all transform hover:scale-110 ${Number(value) >= rating ? 'text-accent scale-110' : 'text-muted-foreground hover:text-accent/70'}`}>
                  <Star className="h-10 w-10 fill-current" />
                </button>
              ))}
            </div>
            <div className="text-center">
              <span className="text-lg font-semibold text-primary">
                {value ? `${value} ${t('takeSurvey.starsOf5')}` : t('takeSurvey.selectRating')}
              </span>
            </div>
          </div>
        );
      case "text":
        return (
          <Textarea key={uniqueKey} placeholder={t('takeSurvey.answerPlaceholder')} value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)} rows={8} className="resize-none text-base p-4 border-2 focus:border-primary" />
        );
      default:
        return (
          <Input key={uniqueKey} placeholder={t('takeSurvey.answerPlaceholder')} value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)} className="text-base p-4 border-2 focus:border-primary" />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center relative">
        <div className="absolute top-4 right-4"><LanguageToggle /></div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('takeSurvey.loading')}</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center relative">
        <div className="absolute top-4 right-4"><LanguageToggle /></div>
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('takeSurvey.notFound')}</h2>
            <p className="text-muted-foreground">{t('takeSurvey.notFoundDesc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center relative">
        <div className="absolute top-4 right-4"><LanguageToggle /></div>
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{language === 'ar' ? "لا توجد أسئلة" : "No Questions"}</h2>
            <p className="text-muted-foreground">{language === 'ar' ? "هذا الاستبيان لا يحتوي على أسئلة حالياً." : "This survey has no questions currently."}</p>
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
        <Card className="mb-6 bg-card/95 backdrop-blur shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{tr(survey.title)}</CardTitle>
                {survey.description && <p className="text-muted-foreground text-base">{tr(survey.description)}</p>}
                {isTranslating && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {language === 'ar' ? 'جارٍ الترجمة…' : 'Translating…'}
                  </p>
                )}

              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <LanguageToggle />
                {survey.is_anonymous && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    {t('takeSurvey.anonymous')}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-foreground">
              {t('takeSurvey.questionOf')} {currentQuestionIndex + 1} {t('takeSurvey.of')} {questions.length}
            </h2>
            <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Card className={`shadow-elegant transition-all ${hasError ? 'border-2 border-red-500 animate-pulse' : 'border'} ${currentQuestion?.type === 'section' ? 'bg-primary/5 border-primary/30' : ''}`}>
          <CardHeader className={`border-b ${currentQuestion?.type === 'section' ? 'bg-primary/10' : 'bg-accent/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={currentQuestion?.type === 'section' ? 'default' : 'outline'} className="text-xs">
                    {currentQuestion?.type === 'section' ? t('designer.section') : `${t('takeSurvey.questionOf')} ${currentQuestionIndex + 1}`}
                  </Badge>
                  {currentQuestion?.is_required && currentQuestion?.type !== 'section' && (
                    <Badge variant="destructive" className="text-xs">* {t('designer.required')}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-8">
            <div className="min-h-[350px]">
              <h3 className={`font-bold mb-6 text-foreground leading-relaxed ${currentQuestion?.type === 'section' ? 'text-2xl text-primary' : 'text-xl'}`}>
                {tr(currentQuestion?.text)}
              </h3>
              {currentQuestion?.help_text && (
                <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 leading-relaxed">{tr(currentQuestion.help_text)}</p>

                </div>
              )}
              {currentQuestion && currentQuestion.type !== 'section' && renderQuestionInput(currentQuestion)}
              {currentQuestion?.type === 'section' && (
                <p className="text-muted-foreground text-center mt-8">
                  {language === 'ar' ? 'اضغط على "التالي" للمتابعة إلى أسئلة هذا القسم' : 'Click "Next" to continue to this section\'s questions'}
                </p>
              )}
              {hasError && (
                <div className="flex items-center gap-2 mt-4 text-red-600">
                  <AlertCircle className="h-4 w-4" /><span className="text-sm">{hasError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0}>
                <ArrowLeft className="h-4 w-4 ml-2" />{t('takeSurvey.previous')}
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{language === 'ar' ? 'الوقت:' : 'Time:'} {Math.floor((Date.now() - startTime) / 60000)} {language === 'ar' ? 'دقيقة' : 'min'}</span>
              </div>
              {currentQuestionIndex === questions.length - 1 ? (
                <Button variant="hero" onClick={submitSurvey} disabled={isSubmitting} className="min-w-32">
                  {isSubmitting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>{t('takeSurvey.submitting')}</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 ml-2" />{t('takeSurvey.submit')}</>
                  )}
                </Button>
              ) : (
                <Button onClick={nextQuestion}>{t('takeSurvey.next')}<ArrowRight className="h-4 w-4 mr-2" /></Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>{language === 'ar' ? "كلية العلوم الإنسانية والاجتماعية - منظومة الاستبيانات الذكية" : "College of Humanities and Social Sciences - Smart Survey System"}</p>
        </div>
      </div>
    </div>
  );
};

export default TakeSurvey;
