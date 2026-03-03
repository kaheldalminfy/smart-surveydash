import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Sparkles, Save, Eye, Copy, Upload, Download, FileJson, FileSpreadsheet, FileText, ArrowRight, AlertTriangle, Lock, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardButton from "@/components/DashboardButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SurveyTemplates from "@/components/SurveyTemplates";
import SurveyPreview from "@/components/SurveyPreview";
import QRCode from "qrcode";
import { exportSurveyToJSON, exportSurveyToCSV, importSurveyFromJSON, importSurveyFromCSV } from "@/utils/surveyImportExport";
import { useLanguage } from "@/contexts/LanguageContext";

interface Question {
  id: number;
  text: string;
  type: string;
  orderIndex: number;
  options?: string[];
  required?: boolean;
}

const SurveyDesigner = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState(id || templateId ? "design" : "templates");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [survey, setSurvey] = useState({
    title: "",
    description: "",
    programId: "",
    isAnonymous: true,
    startDate: "",
    endDate: "",
    semester: "",
    academicYear: "",
    targetEnrollment: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templatePublic, setTemplatePublic] = useState(false);
  const [academicCalendar, setAcademicCalendar] = useState<any[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [hasExistingAnswers, setHasExistingAnswers] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<number | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<number | null>(null);

  useEffect(() => {
    loadPrograms();
    loadAcademicCalendar();
    if (id) {
      loadSurvey();
      checkExistingResponses();
    } else if (templateId) {
      loadTemplate();
    }
  }, [id, templateId]);

  const checkExistingResponses = async () => {
    if (!id) return;
    try {
      const { count: respCount } = await supabase
        .from("responses")
        .select("*", { count: 'exact', head: true })
        .eq("survey_id", id);
      setResponseCount(respCount || 0);
      const { data: answersData } = await supabase
        .from("responses")
        .select("id, answers(id)")
        .eq("survey_id", id)
        .limit(1);
      const hasAnswers = answersData?.some(r => r.answers && r.answers.length > 0) || false;
      setHasExistingAnswers(hasAnswers);
    } catch (error) {
      console.error("Error checking responses:", error);
    }
  };

  const loadAcademicCalendar = async () => {
    const { data } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("start_date", { ascending: false });
    if (data) setAcademicCalendar(data);
  };

  const getUniqueAcademicYears = () => {
    const startYear = 2025;
    const years = [];
    for (let i = 0; i < 100; i++) {
      years.push(`${startYear + i}-${startYear + i + 1}`);
    }
    return years;
  };

  const getUniqueSemesters = () => {
    return language === 'ar' 
      ? ['خريف', 'ربيع', 'صيفي']
      : ['Fall', 'Spring', 'Summer'];
  };

  const loadSurvey = async () => {
    if (!id) return;
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys").select("*").eq("id", id).single();
      if (surveyError) throw surveyError;
      if (surveyData) {
        setSurvey({
          title: surveyData.title,
          description: surveyData.description || "",
          programId: surveyData.program_id,
          isAnonymous: surveyData.is_anonymous,
          startDate: surveyData.start_date ? new Date(surveyData.start_date).toISOString().split('T')[0] : "",
          endDate: surveyData.end_date ? new Date(surveyData.end_date).toISOString().split('T')[0] : "",
          semester: surveyData.semester || "",
          academicYear: surveyData.academic_year || "",
          targetEnrollment: surveyData.target_enrollment ? String(surveyData.target_enrollment) : "",
        });
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions").select("*").eq("survey_id", id).order("order_index");
        if (questionsError) throw questionsError;
        if (questionsData) {
          const loadedQuestions = questionsData.map((q: any, index) => ({
            id: Date.now() + index,
            text: q.text,
            type: q.type,
            orderIndex: q.order_index,
            options: q.type === "mcq" && q.options?.choices ? q.options.choices : [],
            required: q.is_required,
          }));
          setQuestions(loadedQuestions);
        }
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: t('designer.enterTitleAndProgram'), variant: "destructive" });
      console.error("Error loading survey:", error);
    }
  };

  const loadTemplate = async () => {
    if (!templateId) return;
    try {
      const { data, error } = await supabase
        .from("survey_templates").select("*").eq("id", templateId).single();
      if (error) throw error;
      if (data && data.template_data) {
        setSurvey(prev => ({
          ...prev,
          title: data.template_data.title || "",
          description: data.template_data.description || "",
          isAnonymous: data.template_data.isAnonymous ?? true,
        }));
        if (data.template_data.questions) {
          const templateQuestions = data.template_data.questions.map((q: any, index: number) => ({
            id: Date.now() + index, text: q.text, type: q.type, orderIndex: index,
            options: q.options || [], required: q.required ?? true,
          }));
          setQuestions(templateQuestions);
        }
        toast({ title: t('common.success'), description: language === 'ar' ? `تم تحميل النموذج "${data.name}" بنجاح` : `Template "${data.name}" loaded successfully` });
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: language === 'ar' ? "فشل في تحميل النموذج" : "Failed to load template", variant: "destructive" });
    }
  };

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase.from("programs").select("*").order("name");
      if (error) {
        toast({ title: t('common.error'), description: language === 'ar' ? "فشل في تحميل البرامج" : "Failed to load programs", variant: "destructive" });
        return;
      }
      if (data) setPrograms(data);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const questionTypes = [
    { value: "section", label: t('designer.section'), description: t('designer.sectionDesc') },
    { value: "likert", label: t('designer.likert'), description: t('designer.likertDesc') },
    { value: "text", label: t('designer.text'), description: t('designer.textDesc') },
    { value: "mcq", label: t('designer.mcq'), description: t('designer.mcqDesc') },
    { value: "rating", label: t('designer.rating'), description: t('designer.ratingDesc') },
  ];

  const addSection = () => {
    setQuestions([...questions, { id: Date.now(), text: "", type: "section", orderIndex: questions.length, required: false }]);
  };

  const handleTemplateSelect = (template: any) => {
    setSurvey(prev => ({ ...prev, title: template.name, description: template.description }));
    const templateQuestions = template.questions.map((q: any, index: number) => ({
      id: Date.now() + index, text: q.text, type: q.type, orderIndex: index,
      options: q.options?.choices || q.options || [],
      required: q.is_required !== false && q.required !== false,
    }));
    setQuestions(templateQuestions);
    setCurrentTab("design");
    toast({ title: t('common.success'), description: language === 'ar' ? `تم تحميل قالب "${template.name}" بنجاح` : `Template "${template.name}" loaded` });
  };

  const handleCreateCustom = () => {
    setCurrentTab("design");
    if (questions.length === 0) {
      setQuestions([{ id: Date.now(), text: "", type: "likert", orderIndex: 0, required: true }]);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: "", type: "likert", orderIndex: questions.length, required: true }]);
  };

  const removeQuestion = (id: number) => { setQuestions(questions.filter(q => q.id !== id)); };
  const updateQuestion = (id: number, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const duplicateQuestion = (id: number) => {
    const questionToDuplicate = questions.find(q => q.id === id);
    if (questionToDuplicate) {
      const newQuestion = {
        ...questionToDuplicate, id: Date.now(),
        text: questionToDuplicate.text + (language === 'ar' ? " (نسخة)" : " (copy)"),
        orderIndex: questions.length,
      };
      setQuestions([...questions, newQuestion]);
    }
  };

  const moveQuestion = (id: number, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === id);
    if ((direction === 'up' && currentIndex > 0) || (direction === 'down' && currentIndex < questions.length - 1)) {
      const newQuestions = [...questions];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [newQuestions[currentIndex], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[currentIndex]];
      newQuestions.forEach((q, index) => { q.orderIndex = index; });
      setQuestions(newQuestions);
    }
  };

  const handleDragStart = (e: React.DragEvent, questionId: number) => {
    setDraggedQuestionId(questionId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };
  const handleDragOver = (e: React.DragEvent, questionId: number) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    if (draggedQuestionId !== null && draggedQuestionId !== questionId) setDragOverQuestionId(questionId);
  };
  const handleDragLeave = () => { setDragOverQuestionId(null); };
  const handleDrop = (e: React.DragEvent, targetQuestionId: number) => {
    e.preventDefault();
    if (draggedQuestionId === null || draggedQuestionId === targetQuestionId) return;
    const dragIndex = questions.findIndex(q => q.id === draggedQuestionId);
    const dropIndex = questions.findIndex(q => q.id === targetQuestionId);
    if (dragIndex === -1 || dropIndex === -1) return;
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(dragIndex, 1);
    newQuestions.splice(dropIndex, 0, removed);
    newQuestions.forEach((q, index) => { q.orderIndex = index; });
    setQuestions(newQuestions);
    setDraggedQuestionId(null); setDragOverQuestionId(null);
  };
  const handleDragEnd = () => { setDraggedQuestionId(null); setDragOverQuestionId(null); };

  const handleSave = async () => {
    if (!survey.title || !survey.programId) {
      toast({ title: t('common.error'), description: t('designer.enterTitleAndProgram'), variant: "destructive" });
      return;
    }
    if (questions.some(q => !q.text)) {
      toast({ title: t('common.error'), description: t('designer.enterAllQuestions'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({ title: t('common.error'), description: language === 'ar' ? "جلسة الدخول منتهية" : "Session expired", variant: "destructive" });
        navigate("/auth"); return;
      }
      if (id) {
        const { error: surveyError } = await supabase.from("surveys").update({
          title: survey.title, description: survey.description, program_id: survey.programId,
          is_anonymous: survey.isAnonymous, start_date: survey.startDate || null, end_date: survey.endDate || null,
          semester: survey.semester || null, academic_year: survey.academicYear || null,
          target_enrollment: survey.targetEnrollment ? parseInt(survey.targetEnrollment) : null,
        }).eq("id", id);
        if (surveyError) throw surveyError;
        await supabase.from("questions").delete().eq("survey_id", id);
        const questionsData = questions.map((q, index) => ({
          survey_id: id, text: q.text, type: q.type, order_index: index, is_required: q.required,
          options: q.type === "likert" ? { scale: ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"] }
            : q.type === "mcq" && q.options ? { choices: q.options } : null,
        }));
        const { error: questionsError } = await supabase.from("questions").insert(questionsData);
        if (questionsError) throw questionsError;
        toast({ title: t('common.updated'), description: t('designer.surveyUpdated') });
      } else {
        const { data: surveyData, error: surveyError } = await supabase.from("surveys").insert({
          title: survey.title, description: survey.description, program_id: survey.programId,
          is_anonymous: survey.isAnonymous, start_date: survey.startDate || null, end_date: survey.endDate || null,
          semester: survey.semester || null, academic_year: survey.academicYear || null,
          target_enrollment: survey.targetEnrollment ? parseInt(survey.targetEnrollment) : null,
          created_by: user.id, status: "draft",
        }).select().single();
        if (surveyError) throw surveyError;
        const questionsData = questions.map((q, index) => ({
          survey_id: surveyData.id, text: q.text, type: q.type, order_index: index, is_required: q.required,
          options: q.type === "likert" ? { scale: ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"] }
            : q.type === "mcq" && q.options ? { choices: q.options } : null,
        }));
        const { error: questionsError } = await supabase.from("questions").insert(questionsData);
        if (questionsError) throw questionsError;
        const surveyLink = `${window.location.origin}/take/${surveyData.id}`;
        const qrCodeDataURL = await QRCode.toDataURL(surveyLink, { width: 400, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
        await supabase.from("surveys").update({ qr_code: qrCodeDataURL, survey_link: surveyLink }).eq("id", surveyData.id);
        toast({ title: t('common.saved'), description: t('designer.surveySaved') });
      }
      navigate("/surveys");
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "حدث خطأ في الحفظ" : "Save error"), variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName) {
      toast({ title: t('common.error'), description: language === 'ar' ? "الرجاء إدخال اسم النموذج" : "Please enter template name", variant: "destructive" });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const templateData = {
        title: survey.title, description: survey.description, isAnonymous: survey.isAnonymous,
        questions: questions.map(q => ({ text: q.text, type: q.type, required: q.required, options: q.options })),
      };
      const { error } = await supabase.from("survey_templates").insert({
        name: templateName, description: templateDescription, template_data: templateData,
        is_public: templatePublic, created_by: user.id,
      });
      if (error) throw error;
      toast({ title: t('common.saved'), description: language === 'ar' ? "تم حفظ النموذج بنجاح" : "Template saved successfully" });
      setShowSaveTemplate(false); setTemplateName(""); setTemplateDescription(""); setTemplatePublic(false);
    } catch (error: any) {
      toast({ title: t('common.error'), description: language === 'ar' ? "فشل في حفظ النموذج" : "Failed to save template", variant: "destructive" });
    }
  };

  const handleAISuggestions = async () => {
    if (!survey.title) {
      toast({ title: t('common.error'), description: language === 'ar' ? "يرجى إدخال عنوان الاستبيان أولاً" : "Please enter survey title first", variant: "destructive" });
      return;
    }
    setIsAISuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-questions", {
        body: { surveyTitle: survey.title, surveyDescription: survey.description, questionType: "likert" },
      });
      if (error) throw error;
      if (data && data.questions) {
        const newQuestions = data.questions.map((q: any, index: number) => ({
          id: Date.now() + index, text: q.text, type: "likert", orderIndex: questions.length + index, options: q.choices || [], required: true,
        }));
        setQuestions([...questions, ...newQuestions]);
        toast({ title: t('common.success'), description: language === 'ar' ? `تم إضافة ${newQuestions.length} أسئلة مقترحة من الذكاء الاصطناعي` : `Added ${newQuestions.length} AI-suggested questions` });
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "فشل في الحصول على اقتراحات" : "Failed to get suggestions"), variant: "destructive" });
    } finally { setIsAISuggesting(false); }
  };

  const handlePreview = () => {
    if (!survey.title || questions.length === 0) {
      toast({ title: t('common.error'), description: language === 'ar' ? "يرجى إضافة عنوان وأسئلة للاستبيان أولاً" : "Please add title and questions first", variant: "destructive" });
      return;
    }
    setShowPreview(true);
  };

  const handleExportJSON = () => {
    if (!survey.title || questions.length === 0) {
      toast({ title: t('common.error'), description: language === 'ar' ? "لا يوجد استبيان لتصديره" : "No survey to export", variant: "destructive" }); return;
    }
    exportSurveyToJSON({ title: survey.title, description: survey.description, programId: survey.programId, isAnonymous: survey.isAnonymous,
      questions: questions.map(q => ({ text: q.text, type: q.type, required: q.required || false, options: q.options })),
    });
    toast({ title: t('common.success'), description: language === 'ar' ? "تم تصدير الاستبيان بصيغة JSON بنجاح" : "Survey exported as JSON" });
  };

  const handleExportCSV = () => {
    if (!survey.title || questions.length === 0) {
      toast({ title: t('common.error'), description: language === 'ar' ? "لا يوجد استبيان لتصديره" : "No survey to export", variant: "destructive" }); return;
    }
    exportSurveyToCSV({ title: survey.title, description: survey.description, programId: survey.programId, isAnonymous: survey.isAnonymous,
      questions: questions.map(q => ({ text: q.text, type: q.type, required: q.required || false, options: q.options })),
    });
    toast({ title: t('common.success'), description: language === 'ar' ? "تم تصدير الاستبيان بصيغة CSV بنجاح" : "Survey exported as CSV" });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let importedData;
      if (file.name.endsWith('.json')) { importedData = await importSurveyFromJSON(file); }
      else if (file.name.endsWith('.csv')) { importedData = await importSurveyFromCSV(file); }
      else {
        toast({ title: t('common.error'), description: language === 'ar' ? "صيغة الملف غير مدعومة" : "Unsupported file format", variant: "destructive" }); return;
      }
      setSurvey(prev => ({ ...prev, title: importedData.title, description: importedData.description, isAnonymous: importedData.isAnonymous, programId: importedData.programId || prev.programId }));
      const importedQuestions = importedData.questions.map((q: any, index: number) => ({
        id: Date.now() + index, text: q.text, type: q.type, orderIndex: index, options: q.options, required: q.required,
      }));
      setQuestions(importedQuestions); setCurrentTab("design");
      toast({ title: t('common.success'), description: language === 'ar' ? `تم استيراد ${importedQuestions.length} سؤال بنجاح` : `Imported ${importedQuestions.length} questions` });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "فشل في استيراد الملف" : "Import failed"), variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const likertLabels = language === 'ar' 
    ? ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"]
    : ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DashboardButton />
              <div>
                <h1 className="text-2xl font-bold">{id ? t('designer.editTitle') : t('designer.title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {currentTab === "templates" ? (language === 'ar' ? "اختر قالباً أو ابدأ من الصفر" : "Choose a template or start from scratch") : id ? (language === 'ar' ? "تعديل استبيانك" : "Edit your survey") : (language === 'ar' ? "صمم استبيانك" : "Design your survey")}
                </p>
              </div>
            </div>
            {currentTab === "design" && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
                  <FileText className="h-4 w-4 ml-2" />
                  {t('designer.saveTemplate')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 ml-2" />
                  {t('common.import')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <FileJson className="h-4 w-4 ml-2" />
                  {t('designer.exportJSON')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  {t('designer.exportCSV')}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 ml-2" />
                  {t('designer.preview')}
                </Button>
                <Button variant="accent" size="sm" onClick={handleAISuggestions} disabled={isAISuggesting || !survey.title}>
                  <Sparkles className="h-4 w-4 ml-2" />
                  {isAISuggesting ? (language === 'ar' ? "جاري الاقتراح..." : "Suggesting...") : t('designer.suggestWithAI')}
                </Button>
                <Button onClick={handleSave} variant="hero" size="sm" disabled={isLoading}>
                  <Save className="h-4 w-4 ml-2" />
                  {isLoading ? t('designer.saving') : id ? t('common.updated') : t('common.save')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="templates">{t('designer.templates')}</TabsTrigger>
            <TabsTrigger value="design">{t('designer.design')}</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <SurveyTemplates onSelectTemplate={handleTemplateSelect} onCreateCustom={handleCreateCustom} />
          </TabsContent>

          <TabsContent value="design">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {id && responseCount > 0 && (
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
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ar' ? "معلومات الاستبيان" : "Survey Information"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">{t('designer.surveyTitle')}</Label>
                      <Input id="title" placeholder={language === 'ar' ? "مثال: تقييم جودة المقرر - القانون التجاري" : "Example: Course Quality Evaluation - Commercial Law"}
                        value={survey.title} onChange={(e) => setSurvey({...survey, title: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="description">{t('designer.surveyDescription')}</Label>
                      <Textarea id="description" placeholder={language === 'ar' ? "وصف مختصر للاستبيان وأهدافه" : "Brief description of survey and its objectives"} rows={3}
                        value={survey.description} onChange={(e) => setSurvey({...survey, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="program">{t('designer.program')}</Label>
                        <select id="program" className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.programId} onChange={(e) => setSurvey({...survey, programId: e.target.value})}>
                          <option value="">{t('designer.selectProgram')}</option>
                          {programs.map((program) => (<option key={program.id} value={program.id}>{program.name}</option>))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="anonymous">{language === 'ar' ? "نوع الاستبيان" : "Survey Type"}</Label>
                        <select id="anonymous" className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.isAnonymous ? "anonymous" : "identified"}
                          onChange={(e) => setSurvey({...survey, isAnonymous: e.target.value === "anonymous"})}>
                          <option value="anonymous">{language === 'ar' ? "مجهول الهوية" : "Anonymous"}</option>
                          <option value="identified">{language === 'ar' ? "محدد الهوية" : "Identified"}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="academicYear">{t('designer.academicYear')}</Label>
                        <select id="academicYear" className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.academicYear} onChange={(e) => setSurvey({...survey, academicYear: e.target.value})}>
                          <option value="">{language === 'ar' ? "اختر السنة الأكاديمية" : "Select Academic Year"}</option>
                          {getUniqueAcademicYears().map((year) => (<option key={year} value={year}>{year}</option>))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="semester">{t('designer.semester')}</Label>
                        <select id="semester" className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.semester} onChange={(e) => setSurvey({...survey, semester: e.target.value})}>
                          <option value="">{language === 'ar' ? "اختر الفصل الدراسي" : "Select Semester"}</option>
                          {getUniqueSemesters().map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-primary mt-1" />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="targetEnrollment" className="text-sm font-medium">
                            {t('designer.targetEnrollment')} ({language === 'ar' ? "اختياري" : "optional"})
                          </Label>
                          <Input id="targetEnrollment" type="number" min="0" placeholder={language === 'ar' ? "مثال: 100" : "e.g. 100"}
                            value={survey.targetEnrollment} onChange={(e) => setSurvey({...survey, targetEnrollment: e.target.value})} className="max-w-[200px]" />
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? "أدخل عدد الطلبة لحساب نسبة الاستجابة بدقة في التقارير" : "Enter student count for accurate response rate in reports"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{language === 'ar' ? "الأسئلة" : "Questions"} ({questions.filter(q => q.type !== 'section').length})</CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={addSection} size="sm" variant="outline">
                        <Plus className="h-4 w-4 ml-2" />
                        {t('designer.addSection')}
                      </Button>
                      <Button onClick={addQuestion} size="sm" variant="outline">
                        <Plus className="h-4 w-4 ml-2" />
                        {t('designer.addQuestion')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.id} draggable
                        onDragStart={(e) => handleDragStart(e, question.id)}
                        onDragOver={(e) => handleDragOver(e, question.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, question.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 border rounded-lg space-y-3 transition-all ${question.type === 'section' ? 'bg-primary/10 border-primary/30' : 'bg-card'} ${draggedQuestionId === question.id ? 'opacity-40 scale-95' : ''} ${dragOverQuestionId === question.id ? 'border-primary border-2 shadow-lg' : ''}`}>
                        <div className="flex items-start gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab active:cursor-grabbing" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={question.type === 'section' ? 'default' : 'outline'}>
                                {question.type === 'section' ? t('designer.section') : `${language === 'ar' ? 'سؤال' : 'Q'} ${questions.slice(0, index).filter(q => q.type !== 'section').length + 1}`}
                              </Badge>
                              <select value={question.type} onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                                className="text-sm rounded-md border border-input bg-background px-2 py-1">
                                {questionTypes.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}
                              </select>
                              {question.type !== 'section' && (
                                <div className="flex items-center gap-2 mr-auto">
                                  <Label htmlFor={`required-${question.id}`} className="text-sm">{t('designer.required')}</Label>
                                  <Switch id={`required-${question.id}`} checked={question.required} onCheckedChange={(checked) => updateQuestion(question.id, 'required', checked)} />
                                </div>
                              )}
                            </div>
                            <Input placeholder={question.type === 'section' ? (language === 'ar' ? 'اكتب عنوان القسم هنا' : 'Enter section title') : (language === 'ar' ? 'اكتب نص السؤال هنا' : 'Enter question text')}
                              value={question.text} onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                              className={question.type === 'section' ? 'font-bold text-lg' : ''} />
                            
                            {question.type === "likert" && (
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                {likertLabels.map((label, i) => (
                                  <span key={i}>{i > 0 && <span className="mx-1">•</span>}{label}</span>
                                ))}
                              </div>
                            )}

                            {question.type === "mcq" && (
                              <div className="space-y-2">
                                <Label className="text-sm">{t('designer.options')}:</Label>
                                {(question.options || []).map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2">
                                    <Input placeholder={`${language === 'ar' ? 'الخيار' : 'Option'} ${optionIndex + 1}`}
                                      value={option} onChange={(e) => {
                                        const newOptions = [...(question.options || [])]; newOptions[optionIndex] = e.target.value;
                                        updateQuestion(question.id, 'options', newOptions);
                                      }} className="text-sm" />
                                    <Button size="sm" variant="ghost" onClick={() => {
                                      const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
                                      updateQuestion(question.id, 'options', newOptions);
                                    }}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                ))}
                                <Button size="sm" variant="outline" onClick={() => {
                                  const newOptions = [...(question.options || []), ""];
                                  updateQuestion(question.id, 'options', newOptions);
                                }}><Plus className="h-4 w-4 ml-2" />{t('designer.addOption')}</Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="sm" onClick={() => duplicateQuestion(question.id)} title={t('designer.duplicate')}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removeQuestion(question.id)} title={t('common.delete')}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

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
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleImportFile} className="hidden" />

      <SurveyPreview isOpen={showPreview} onClose={() => setShowPreview(false)} survey={survey} questions={questions} />

      <AlertDialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('designer.saveTemplate')}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' ? "احفظ هذا الاستبيان كنموذج لإعادة استخدامه لاحقاً" : "Save this survey as a template for reuse"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">{language === 'ar' ? "اسم النموذج" : "Template Name"}</Label>
              <Input id="template-name" placeholder={language === 'ar' ? "مثال: تقييم جودة المقرر" : "e.g. Course Quality Evaluation"}
                value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="template-description">{language === 'ar' ? "الوصف" : "Description"}</Label>
              <Textarea id="template-description" placeholder={language === 'ar' ? "وصف مختصر للنموذج" : "Brief template description"}
                value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="template-public" checked={templatePublic} onCheckedChange={setTemplatePublic} />
              <Label htmlFor="template-public">{language === 'ar' ? "جعل النموذج عاماً (متاح للجميع)" : "Make template public (available to all)"}</Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsTemplate}>
              {language === 'ar' ? "حفظ النموذج" : "Save Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SurveyDesigner;
