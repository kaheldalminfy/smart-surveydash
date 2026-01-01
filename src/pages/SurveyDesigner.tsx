import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Sparkles, Save, Eye, Copy, Upload, Download, FileJson, FileSpreadsheet, FileText, ArrowRight } from "lucide-react";
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
  const { id } = useParams(); // for editing
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  const { toast } = useToast();
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
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templatePublic, setTemplatePublic] = useState(false);
  const [academicCalendar, setAcademicCalendar] = useState<any[]>([]);

  useEffect(() => {
    loadPrograms();
    loadAcademicCalendar();
    if (id) {
      loadSurvey();
    } else if (templateId) {
      loadTemplate();
    }
  }, [id, templateId]);

  const loadAcademicCalendar = async () => {
    const { data } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("start_date", { ascending: false });
    
    if (data) {
      setAcademicCalendar(data);
    }
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
    return ['خريف', 'ربيع', 'صيفي'];
  };

  const loadSurvey = async () => {
    if (!id) return;
    
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .single();

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
        });

        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("*")
          .eq("survey_id", id)
          .order("order_index");

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
      toast({
        title: "خطأ",
        description: "فشل في تحميل الاستبيان",
        variant: "destructive",
      });
      console.error("Error loading survey:", error);
    }
  };

  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      const { data, error } = await supabase
        .from("survey_templates")
        .select("*")
        .eq("id", templateId)
        .single();

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
            id: Date.now() + index,
            text: q.text,
            type: q.type,
            orderIndex: index,
            options: q.options || [],
            required: q.required ?? true,
          }));
          setQuestions(templateQuestions);
        }

        toast({
          title: "تم التحميل",
          description: `تم تحميل النموذج "${data.name}" بنجاح`,
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل النموذج",
        variant: "destructive",
      });
      console.error("Error loading template:", error);
    }
  };

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase.from("programs").select("*").order("name");
      if (error) {
        console.error("خطأ في تحميل البرامج:", error);
        toast({
          title: "خطأ",
          description: "فشل في تحميل البرامج",
          variant: "destructive",
        });
        return;
      }
      console.log("البرامج المحملة:", data);
      if (data) setPrograms(data);
    } catch (error) {
      console.error("خطأ غير متوقع:", error);
    }
  };

  const questionTypes = [
    { value: "section", label: "عنوان قسم", description: "عنوان لتجميع الأسئلة" },
    { value: "likert", label: "مقياس ليكرت", description: "مقياس من 1-5 للموافقة" },
    { value: "text", label: "نص مفتوح", description: "إجابة نصية حرة" },
    { value: "mcq", label: "اختيارات متعددة", description: "اختيار من عدة خيارات" },
    { value: "rating", label: "تقييم/ترتيب", description: "تقييم بالنجوم أو ترتيب" },
  ];

  const addSection = () => {
    setQuestions([...questions, { 
      id: Date.now(), 
      text: "",
      type: "section",
      orderIndex: questions.length,
      required: false,
    }]);
  };

  const handleTemplateSelect = (template: any) => {
    setSurvey(prev => ({
      ...prev,
      title: template.name,
      description: template.description,
    }));
    
    const templateQuestions = template.questions.map((q: any, index: number) => ({
      id: Date.now() + index,
      text: q.text,
      type: q.type,
      orderIndex: index,
      options: q.options?.choices || q.options || [],
      required: q.is_required !== false && q.required !== false,
    }));
    
    setQuestions(templateQuestions);
    setCurrentTab("design");
    
    toast({
      title: "تم تحميل القالب",
      description: `تم تحميل قالب "${template.name}" بنجاح`,
    });
  };

  const handleCreateCustom = () => {
    setCurrentTab("design");
    if (questions.length === 0) {
      setQuestions([{ 
        id: Date.now(), 
        text: "", 
        type: "likert",
        orderIndex: 0,
        required: true,
      }]);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: Date.now(), 
      text: "", 
      type: "likert",
      orderIndex: questions.length,
      required: true,
    }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: number, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const duplicateQuestion = (id: number) => {
    const questionToDuplicate = questions.find(q => q.id === id);
    if (questionToDuplicate) {
      const newQuestion = {
        ...questionToDuplicate,
        id: Date.now(),
        text: questionToDuplicate.text + " (نسخة)",
        orderIndex: questions.length,
      };
      setQuestions([...questions, newQuestion]);
    }
  };

  const moveQuestion = (id: number, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === id);
    if (
      (direction === 'up' && currentIndex > 0) ||
      (direction === 'down' && currentIndex < questions.length - 1)
    ) {
      const newQuestions = [...questions];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [newQuestions[currentIndex], newQuestions[targetIndex]] = 
      [newQuestions[targetIndex], newQuestions[currentIndex]];
      
      // Update order indices
      newQuestions.forEach((q, index) => {
        q.orderIndex = index;
      });
      
      setQuestions(newQuestions);
    }
  };

  const handleSave = async () => {
    if (!survey.title || !survey.programId) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال عنوان الاستبيان واختيار البرنامج",
        variant: "destructive",
      });
      return;
    }

    if (questions.some(q => !q.text)) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال نص جميع الأسئلة",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "خطأ في المصادقة",
          description: "جلسة الدخول منتهية",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (id) {
        // Update existing survey
        const { error: surveyError } = await supabase
          .from("surveys")
          .update({
            title: survey.title,
            description: survey.description,
            program_id: survey.programId,
            is_anonymous: survey.isAnonymous,
            start_date: survey.startDate || null,
            end_date: survey.endDate || null,
            semester: survey.semester || null,
            academic_year: survey.academicYear || null,
          })
          .eq("id", id);

        if (surveyError) throw surveyError;

        // Delete old questions
        await supabase.from("questions").delete().eq("survey_id", id);

        // Insert new questions
        const questionsData = questions.map((q, index) => ({
          survey_id: id,
          text: q.text,
          type: q.type,
          order_index: index,
          is_required: q.required,
          options: q.type === "likert" ? {
            scale: ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"]
          } : q.type === "mcq" && q.options ? {
            choices: q.options
          } : null,
        }));

        const { error: questionsError } = await supabase
          .from("questions")
          .insert(questionsData);

        if (questionsError) throw questionsError;

        toast({
          title: "تم التحديث",
          description: "تم تحديث الاستبيان بنجاح",
        });
      } else {
        // Create new survey
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .insert({
            title: survey.title,
            description: survey.description,
            program_id: survey.programId,
            is_anonymous: survey.isAnonymous,
            start_date: survey.startDate || null,
            end_date: survey.endDate || null,
            semester: survey.semester || null,
            academic_year: survey.academicYear || null,
            created_by: user.id,
            status: "draft",
          })
          .select()
          .single();

        if (surveyError) throw surveyError;

        const questionsData = questions.map((q, index) => ({
          survey_id: surveyData.id,
          text: q.text,
          type: q.type,
          order_index: index,
          is_required: q.required,
          options: q.type === "likert" ? {
            scale: ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"]
          } : q.type === "mcq" && q.options ? {
            choices: q.options
          } : null,
        }));

        const { error: questionsError } = await supabase
          .from("questions")
          .insert(questionsData);

        if (questionsError) throw questionsError;

        // Generate QR Code
        const surveyLink = `${window.location.origin}/take/${surveyData.id}`;
        const qrCodeDataURL = await QRCode.toDataURL(surveyLink, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        await supabase
          .from("surveys")
          .update({ 
            qr_code: qrCodeDataURL,
            survey_link: surveyLink
          })
          .eq("id", surveyData.id);

        toast({
          title: "تم الحفظ",
          description: "تم حفظ الاستبيان بنجاح",
        });
      }

      navigate("/surveys");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في الحفظ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال اسم النموذج",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const templateData = {
        title: survey.title,
        description: survey.description,
        isAnonymous: survey.isAnonymous,
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options,
        })),
      };

      const { error } = await supabase
        .from("survey_templates")
        .insert({
          name: templateName,
          description: templateDescription,
          template_data: templateData,
          is_public: templatePublic,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ النموذج بنجاح",
      });

      setShowSaveTemplate(false);
      setTemplateName("");
      setTemplateDescription("");
      setTemplatePublic(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ النموذج",
        variant: "destructive",
      });
    }
  };

  const handleAISuggestions = async () => {
    if (!survey.title) {
      toast({
        title: "تنبيه",
        description: "يرجى إدخال عنوان الاستبيان أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsAISuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-questions", {
        body: { 
          surveyTitle: survey.title,
          surveyDescription: survey.description,
          questionType: "likert"
        },
      });

      if (error) throw error;

      if (data && data.questions) {
        const newQuestions = data.questions.map((q: any, index: number) => ({
          id: Date.now() + index,
          text: q.text,
          type: "likert",
          orderIndex: questions.length + index,
          options: q.choices || [],
          required: true,
        }));

        setQuestions([...questions, ...newQuestions]);
        toast({
          title: "تم إضافة الاقتراحات",
          description: `تم إضافة ${newQuestions.length} أسئلة مقترحة من الذكاء الاصطناعي`,
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في الحصول على اقتراحات الذكاء الاصطناعي",
        variant: "destructive",
      });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handlePreview = () => {
    if (!survey.title || questions.length === 0) {
      toast({
        title: "تنبيه",
        description: "يرجى إضافة عنوان وأسئلة للاستبيان أولاً",
        variant: "destructive",
      });
      return;
    }
    setShowPreview(true);
  };

  const handleExportJSON = () => {
    if (!survey.title || questions.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا يوجد استبيان لتصديره",
        variant: "destructive",
      });
      return;
    }
    
    exportSurveyToJSON({
      title: survey.title,
      description: survey.description,
      programId: survey.programId,
      isAnonymous: survey.isAnonymous,
      questions: questions.map(q => ({
        text: q.text,
        type: q.type,
        required: q.required || false,
        options: q.options,
      })),
    });
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير الاستبيان بصيغة JSON بنجاح",
    });
  };

  const handleExportCSV = () => {
    if (!survey.title || questions.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا يوجد استبيان لتصديره",
        variant: "destructive",
      });
      return;
    }
    
    exportSurveyToCSV({
      title: survey.title,
      description: survey.description,
      programId: survey.programId,
      isAnonymous: survey.isAnonymous,
      questions: questions.map(q => ({
        text: q.text,
        type: q.type,
        required: q.required || false,
        options: q.options,
      })),
    });
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير الاستبيان بصيغة CSV بنجاح",
    });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let importedData;
      
      if (file.name.endsWith('.json')) {
        importedData = await importSurveyFromJSON(file);
      } else if (file.name.endsWith('.csv')) {
        importedData = await importSurveyFromCSV(file);
      } else {
        toast({
          title: "خطأ",
          description: "صيغة الملف غير مدعومة. يرجى استخدام JSON أو CSV",
          variant: "destructive",
        });
        return;
      }

      setSurvey(prev => ({
        ...prev,
        title: importedData.title,
        description: importedData.description,
        isAnonymous: importedData.isAnonymous,
        programId: importedData.programId || prev.programId,
      }));

      const importedQuestions = importedData.questions.map((q: any, index: number) => ({
        id: Date.now() + index,
        text: q.text,
        type: q.type,
        orderIndex: index,
        options: q.options,
        required: q.required,
      }));

      setQuestions(importedQuestions);
      setCurrentTab("design");

      toast({
        title: "تم الاستيراد",
        description: `تم استيراد ${importedQuestions.length} سؤال بنجاح`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ في الاستيراد",
        description: error.message || "فشل في استيراد الملف",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DashboardButton />
              <div>
                <h1 className="text-2xl font-bold">{id ? "تعديل الاستبيان" : "مصمم الاستبيان"}</h1>
                <p className="text-sm text-muted-foreground">
                  {currentTab === "templates" ? "اختر قالباً أو ابدأ من الصفر" : id ? "تعديل استبيانك" : "صمم استبيانك"}
                </p>
              </div>
            </div>
            {currentTab === "design" && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
                  <FileText className="h-4 w-4 ml-2" />
                  حفظ كنموذج
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 ml-2" />
                  استيراد
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON}>
                  <FileJson className="h-4 w-4 ml-2" />
                  تصدير JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 ml-2" />
                  معاينة
                </Button>
                <Button 
                  variant="accent" 
                  size="sm"
                  onClick={handleAISuggestions}
                  disabled={isAISuggesting || !survey.title}
                >
                  <Sparkles className="h-4 w-4 ml-2" />
                  {isAISuggesting ? "جاري الاقتراح..." : "اقتراحات AI"}
                </Button>
                <Button onClick={handleSave} variant="hero" size="sm" disabled={isLoading}>
                  <Save className="h-4 w-4 ml-2" />
                  {isLoading ? "جاري الحفظ..." : id ? "تحديث" : "حفظ"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="templates">القوالب الجاهزة</TabsTrigger>
            <TabsTrigger value="design">تصميم الاستبيان</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <SurveyTemplates 
              onSelectTemplate={handleTemplateSelect}
              onCreateCustom={handleCreateCustom}
            />
          </TabsContent>

          <TabsContent value="design">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* معلومات الاستبيان */}
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات الاستبيان</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">عنوان الاستبيان</Label>
                      <Input 
                        id="title" 
                        placeholder="مثال: تقييم جودة المقرر - القانون التجاري"
                        value={survey.title}
                        onChange={(e) => setSurvey({...survey, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">الوصف</Label>
                      <Textarea 
                        id="description" 
                        placeholder="وصف مختصر للاستبيان وأهدافه" 
                        rows={3}
                        value={survey.description}
                        onChange={(e) => setSurvey({...survey, description: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="program">البرنامج</Label>
                        <select 
                          id="program" 
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.programId}
                          onChange={(e) => setSurvey({...survey, programId: e.target.value})}
                        >
                          <option value="">اختر البرنامج</option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="anonymous">نوع الاستبيان</Label>
                        <select 
                          id="anonymous" 
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.isAnonymous ? "anonymous" : "identified"}
                          onChange={(e) => setSurvey({...survey, isAnonymous: e.target.value === "anonymous"})}
                        >
                          <option value="anonymous">مجهول الهوية</option>
                          <option value="identified">محدد الهوية</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="academicYear">السنة الأكاديمية</Label>
                        <select 
                          id="academicYear" 
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.academicYear}
                          onChange={(e) => setSurvey({...survey, academicYear: e.target.value})}
                        >
                          <option value="">اختر السنة الأكاديمية</option>
                          {getUniqueAcademicYears().map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="semester">الفصل الدراسي</Label>
                        <select 
                          id="semester" 
                          className="w-full rounded-md border border-input bg-background px-3 py-2"
                          value={survey.semester}
                          onChange={(e) => setSurvey({...survey, semester: e.target.value})}
                        >
                          <option value="">اختر الفصل الدراسي</option>
                          {getUniqueSemesters().map((sem) => (
                            <option key={sem} value={sem}>
                              {sem}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* الأسئلة */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>الأسئلة ({questions.filter(q => q.type !== 'section').length})</CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={addSection} size="sm" variant="outline">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة عنوان قسم
                      </Button>
                      <Button onClick={addQuestion} size="sm" variant="outline">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة سؤال
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {questions.map((question, index) => (
                      <div 
                        key={question.id} 
                        className={`p-4 border rounded-lg space-y-3 ${
                          question.type === 'section' 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-card'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={question.type === 'section' ? 'default' : 'outline'}>
                                {question.type === 'section' ? 'عنوان قسم' : `سؤال ${questions.slice(0, index).filter(q => q.type !== 'section').length + 1}`}
                              </Badge>
                              <select 
                                value={question.type}
                                onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                                className="text-sm rounded-md border border-input bg-background px-2 py-1"
                              >
                                {questionTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                              {question.type !== 'section' && (
                                <div className="flex items-center gap-2 mr-auto">
                                  <Label htmlFor={`required-${question.id}`} className="text-sm">مطلوب</Label>
                                  <Switch
                                    id={`required-${question.id}`}
                                    checked={question.required}
                                    onCheckedChange={(checked) => updateQuestion(question.id, 'required', checked)}
                                  />
                                </div>
                              )}
                            </div>
                            <Input 
                              placeholder={question.type === 'section' ? 'اكتب عنوان القسم هنا' : 'اكتب نص السؤال هنا'}
                              value={question.text}
                              onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                              className={question.type === 'section' ? 'font-bold text-lg' : ''}
                            />
                            
                            {question.type === "likert" && (
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                <span>غير موافق بشدة</span>
                                <span>•</span>
                                <span>غير موافق</span>
                                <span>•</span>
                                <span>محايد</span>
                                <span>•</span>
                                <span>موافق</span>
                                <span>•</span>
                                <span>موافق بشدة</span>
                              </div>
                            )}

                            {question.type === "mcq" && (
                              <div className="space-y-2">
                                <Label className="text-sm">الخيارات:</Label>
                                {(question.options || []).map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2">
                                    <Input
                                      placeholder={`الخيار ${optionIndex + 1}`}
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(question.options || [])];
                                        newOptions[optionIndex] = e.target.value;
                                        updateQuestion(question.id, 'options', newOptions);
                                      }}
                                      className="text-sm"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
                                        updateQuestion(question.id, 'options', newOptions);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newOptions = [...(question.options || []), ""];
                                    updateQuestion(question.id, 'options', newOptions);
                                  }}
                                >
                                  <Plus className="h-4 w-4 ml-2" />
                                  إضافة خيار
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => duplicateQuestion(question.id)}
                              title="نسخ السؤال"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                              title="حذف السؤال"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* الشريط الجانبي */}
              <div className="space-y-6">
                {/* إعدادات متقدمة */}
                <Card>
                  <CardHeader>
                    <CardTitle>الإعدادات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="start-date">تاريخ البدء</Label>
                      <Input 
                        id="start-date" 
                        type="date"
                        value={survey.startDate}
                        onChange={(e) => setSurvey({...survey, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">تاريخ الانتهاء</Label>
                      <Input 
                        id="end-date" 
                        type="date"
                        value={survey.endDate}
                        onChange={(e) => setSurvey({...survey, endDate: e.target.value})}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* نصائح */}
                <Card>
                  <CardHeader>
                    <CardTitle>نصائح للتصميم</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-900">استخدم لغة واضحة</p>
                      <p className="text-blue-700">اكتب أسئلة مباشرة وسهلة الفهم</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-900">رتب الأسئلة منطقياً</p>
                      <p className="text-green-700">ابدأ بالأسئلة العامة ثم المحددة</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="font-medium text-amber-900">اختبر الاستبيان</p>
                      <p className="text-amber-700">استخدم المعاينة قبل النشر</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Preview Dialog */}
      <SurveyPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        survey={survey}
        questions={questions}
      />

      {/* Save Template Dialog */}
      <AlertDialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حفظ كنموذج</AlertDialogTitle>
            <AlertDialogDescription>
              احفظ هذا الاستبيان كنموذج لإعادة استخدامه لاحقاً
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">اسم النموذج</Label>
              <Input
                id="template-name"
                placeholder="مثال: تقييم جودة المقرر"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="template-description">الوصف</Label>
              <Textarea
                id="template-description"
                placeholder="وصف مختصر للنموذج"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="template-public"
                checked={templatePublic}
                onCheckedChange={setTemplatePublic}
              />
              <Label htmlFor="template-public">جعل النموذج عاماً (متاح للجميع)</Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsTemplate}>
              حفظ النموذج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SurveyDesigner;
