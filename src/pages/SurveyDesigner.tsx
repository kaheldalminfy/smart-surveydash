import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SurveyTemplates from "@/components/SurveyTemplates";
import SurveyPreview from "@/components/SurveyPreview";
import QRCode from "qrcode";
import { exportSurveyToJSON, exportSurveyToCSV, importSurveyFromJSON, importSurveyFromCSV } from "@/utils/surveyImportExport";
import { useLanguage } from "@/contexts/LanguageContext";
import { Question, SurveyFormData } from "@/components/survey-designer/types";
import SurveyDesignerHeader from "@/components/survey-designer/SurveyDesignerHeader";
import SurveyInfoCard from "@/components/survey-designer/SurveyInfoCard";
import QuestionsListCard from "@/components/survey-designer/QuestionsListCard";
import SurveyResponseWarning from "@/components/survey-designer/SurveyResponseWarning";
import SurveySettingsSidebar from "@/components/survey-designer/SurveySettingsSidebar";
import SaveTemplateDialog from "@/components/survey-designer/SaveTemplateDialog";

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
  const [survey, setSurvey] = useState<SurveyFormData>({
    title: "", description: "", programId: "", isAnonymous: true,
    startDate: "", endDate: "", semester: "", academicYear: "", targetEnrollment: "",
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
    if (id) { loadSurvey(); checkExistingResponses(); }
    else if (templateId) { loadTemplate(); }
  }, [id, templateId]);

  const checkExistingResponses = async () => {
    if (!id) return;
    try {
      const { count: respCount } = await supabase.from("responses").select("*", { count: 'exact', head: true }).eq("survey_id", id);
      setResponseCount(respCount || 0);
      const { data: answersData } = await supabase.from("responses").select("id, answers(id)").eq("survey_id", id).limit(1);
      const hasAnswers = answersData?.some(r => r.answers && r.answers.length > 0) || false;
      setHasExistingAnswers(hasAnswers);
    } catch (error) { console.error("Error checking responses:", error); }
  };

  const loadAcademicCalendar = async () => {
    const { data } = await supabase.from("academic_calendar").select("*").order("start_date", { ascending: false });
    if (data) setAcademicCalendar(data);
  };

  const getUniqueAcademicYears = () => {
    const startYear = 2025; const years = [];
    for (let i = 0; i < 100; i++) { years.push(`${startYear + i}-${startYear + i + 1}`); }
    return years;
  };

  const getUniqueSemesters = () => {
    return language === 'ar' ? ['خريف', 'ربيع', 'صيفي'] : ['Fall', 'Spring', 'Summer'];
  };

  const loadSurvey = async () => {
    if (!id) return;
    try {
      const { data: surveyData, error: surveyError } = await supabase.from("surveys").select("*").eq("id", id).single();
      if (surveyError) throw surveyError;
      if (surveyData) {
        setSurvey({
          title: surveyData.title, description: surveyData.description || "",
          programId: surveyData.program_id, isAnonymous: surveyData.is_anonymous,
          startDate: surveyData.start_date ? new Date(surveyData.start_date).toISOString().split('T')[0] : "",
          endDate: surveyData.end_date ? new Date(surveyData.end_date).toISOString().split('T')[0] : "",
          semester: surveyData.semester || "", academicYear: surveyData.academic_year || "",
          targetEnrollment: surveyData.target_enrollment ? String(surveyData.target_enrollment) : "",
        });
        const { data: questionsData, error: questionsError } = await supabase.from("questions").select("*").eq("survey_id", id).order("order_index");
        if (questionsError) throw questionsError;
        if (questionsData) {
          setQuestions(questionsData.map((q: any, index) => ({
            id: Date.now() + index, text: q.text, type: q.type, orderIndex: q.order_index,
            options: q.type === "mcq" && q.options?.choices ? q.options.choices : [], required: q.is_required,
          })));
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
      const { data, error } = await supabase.from("survey_templates").select("*").eq("id", templateId).single();
      if (error) throw error;
      if (data && data.template_data) {
        setSurvey(prev => ({ ...prev, title: data.template_data.title || "", description: data.template_data.description || "", isAnonymous: data.template_data.isAnonymous ?? true }));
        if (data.template_data.questions) {
          setQuestions(data.template_data.questions.map((q: any, index: number) => ({
            id: Date.now() + index, text: q.text, type: q.type, orderIndex: index, options: q.options || [], required: q.required ?? true,
          })));
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
      if (error) { toast({ title: t('common.error'), description: language === 'ar' ? "فشل في تحميل البرامج" : "Failed to load programs", variant: "destructive" }); return; }
      if (data) setPrograms(data);
    } catch (error) { console.error("Unexpected error:", error); }
  };

  const questionTypes = [
    { value: "section", label: t('designer.section'), description: t('designer.sectionDesc') },
    { value: "likert", label: t('designer.likert'), description: t('designer.likertDesc') },
    { value: "text", label: t('designer.text'), description: t('designer.textDesc') },
    { value: "mcq", label: t('designer.mcq'), description: t('designer.mcqDesc') },
    { value: "rating", label: t('designer.rating'), description: t('designer.ratingDesc') },
  ];

  const addSection = () => { setQuestions([...questions, { id: Date.now(), text: "", type: "section", orderIndex: questions.length, required: false }]); };
  const addQuestion = () => { setQuestions([...questions, { id: Date.now(), text: "", type: "likert", orderIndex: questions.length, required: true }]); };
  const removeQuestion = (id: number) => { setQuestions(questions.filter(q => q.id !== id)); };
  const updateQuestion = (id: number, field: string, value: any) => { setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q)); };

  const duplicateQuestion = (id: number) => {
    const q = questions.find(q => q.id === id);
    if (q) { setQuestions([...questions, { ...q, id: Date.now(), text: q.text + (language === 'ar' ? " (نسخة)" : " (copy)"), orderIndex: questions.length }]); }
  };

  const handleTemplateSelect = (template: any) => {
    setSurvey(prev => ({ ...prev, title: template.name, description: template.description }));
    setQuestions(template.questions.map((q: any, index: number) => ({
      id: Date.now() + index, text: q.text, type: q.type, orderIndex: index,
      options: q.options?.choices || q.options || [], required: q.is_required !== false && q.required !== false,
    })));
    setCurrentTab("design");
    toast({ title: t('common.success'), description: language === 'ar' ? `تم تحميل قالب "${template.name}" بنجاح` : `Template "${template.name}" loaded` });
  };

  const handleCreateCustom = () => {
    setCurrentTab("design");
    if (questions.length === 0) { setQuestions([{ id: Date.now(), text: "", type: "likert", orderIndex: 0, required: true }]); }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, questionId: number) => {
    setDraggedQuestionId(questionId); e.dataTransfer.effectAllowed = 'move';
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
      toast({ title: t('common.error'), description: t('designer.enterTitleAndProgram'), variant: "destructive" }); return;
    }
    if (questions.some(q => !q.text)) {
      toast({ title: t('common.error'), description: t('designer.enterAllQuestions'), variant: "destructive" }); return;
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
      toast({ title: t('common.error'), description: language === 'ar' ? "الرجاء إدخال اسم النموذج" : "Please enter template name", variant: "destructive" }); return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const templateData = {
        title: survey.title, description: survey.description, isAnonymous: survey.isAnonymous,
        questions: questions.map(q => ({ text: q.text, type: q.type, required: q.required, options: q.options })),
      };
      const { error } = await supabase.from("survey_templates").insert({
        name: templateName, description: templateDescription, template_data: templateData, is_public: templatePublic, created_by: user.id,
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
      toast({ title: t('common.error'), description: language === 'ar' ? "يرجى إدخال عنوان الاستبيان أولاً" : "Please enter survey title first", variant: "destructive" }); return;
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
      toast({ title: t('common.error'), description: language === 'ar' ? "يرجى إضافة عنوان وأسئلة للاستبيان أولاً" : "Please add title and questions first", variant: "destructive" }); return;
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
      else { toast({ title: t('common.error'), description: language === 'ar' ? "صيغة الملف غير مدعومة" : "Unsupported file format", variant: "destructive" }); return; }
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
      <SurveyDesignerHeader
        isEditing={!!id} currentTab={currentTab} isLoading={isLoading}
        isAISuggesting={isAISuggesting} surveyTitle={survey.title}
        onSaveTemplate={() => setShowSaveTemplate(true)} onImport={() => fileInputRef.current?.click()}
        onExportJSON={handleExportJSON} onExportCSV={handleExportCSV}
        onPreview={handlePreview} onAISuggestions={handleAISuggestions} onSave={handleSave}
      />

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
                {id && <SurveyResponseWarning responseCount={responseCount} hasExistingAnswers={hasExistingAnswers} />}

                <SurveyInfoCard
                  survey={survey} setSurvey={setSurvey} programs={programs}
                  getUniqueAcademicYears={getUniqueAcademicYears} getUniqueSemesters={getUniqueSemesters}
                />

                <QuestionsListCard
                  questions={questions} questionTypes={questionTypes} likertLabels={likertLabels}
                  draggedQuestionId={draggedQuestionId} dragOverQuestionId={dragOverQuestionId}
                  onAddSection={addSection} onAddQuestion={addQuestion}
                  onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}
                  onUpdateQuestion={updateQuestion} onDuplicateQuestion={duplicateQuestion} onRemoveQuestion={removeQuestion}
                />
              </div>

              <SurveySettingsSidebar survey={survey} setSurvey={setSurvey} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleImportFile} className="hidden" />
      <SurveyPreview isOpen={showPreview} onClose={() => setShowPreview(false)} survey={survey} questions={questions} />

      <SaveTemplateDialog
        open={showSaveTemplate} onOpenChange={setShowSaveTemplate}
        templateName={templateName} setTemplateName={setTemplateName}
        templateDescription={templateDescription} setTemplateDescription={setTemplateDescription}
        templatePublic={templatePublic} setTemplatePublic={setTemplatePublic}
        onSave={handleSaveAsTemplate}
      />
    </div>
  );
};

export default SurveyDesigner;
