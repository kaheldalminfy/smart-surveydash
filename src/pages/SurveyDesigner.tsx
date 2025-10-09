import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Sparkles, Save, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SurveyDesigner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [survey, setSurvey] = useState({
    title: "",
    description: "",
    programId: "",
    isAnonymous: true,
    startDate: "",
    endDate: ""
  });
  const [questions, setQuestions] = useState([
    { id: 1, text: "", type: "likert", orderIndex: 0 }
  ]);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*").order("name");
    if (data) setPrograms(data);
  };

  const questionTypes = [
    { value: "likert", label: "مقياس ليكرت" },
    { value: "text", label: "نص مفتوح" },
    { value: "mcq", label: "اختيارات متعددة" },
    { value: "rating", label: "تقييم/ترتيب" },
  ];

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: Date.now(), 
      text: "", 
      type: "likert",
      orderIndex: questions.length 
    }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("المستخدم غير مسجل الدخول");
      }

      console.log("Creating survey with data:", {
        title: survey.title,
        description: survey.description,
        program_id: survey.programId,
        is_anonymous: survey.isAnonymous,
        start_date: survey.startDate || null,
        end_date: survey.endDate || null,
        created_by: user.id,
        status: "draft",
      });

      // Create survey
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          title: survey.title,
          description: survey.description,
          program_id: survey.programId,
          is_anonymous: survey.isAnonymous,
          start_date: survey.startDate || null,
          end_date: survey.endDate || null,
          created_by: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (surveyError) {
        console.error("Survey creation error:", surveyError);
        throw new Error(`خطأ في إنشاء الاستبيان: ${surveyError.message}`);
      }

      console.log("Survey created successfully:", surveyData);

      // Create questions
      const questionsData = questions.map((q, index) => ({
        survey_id: surveyData.id,
        text: q.text,
        type: q.type,
        order_index: index,
        is_required: true,
        options: q.type === "likert" ? {
          scale: ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"]
        } : null,
      }));

      console.log("Creating questions with data:", questionsData);

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsData);

      if (questionsError) {
        console.error("Questions creation error:", questionsError);
        throw new Error(`خطأ في إنشاء الأسئلة: ${questionsError.message}`);
      }

      console.log("Questions created successfully");

      toast({
        title: "تم الحفظ",
        description: "تم حفظ الاستبيان بنجاح",
      });

      navigate("/surveys");
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">مصمم الاستبيان</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 ml-2" />
                معاينة
              </Button>
              <Button variant="accent" size="sm">
                <Sparkles className="h-4 w-4 ml-2" />
                اقتراحات AI
              </Button>
              <Button onClick={handleSave} variant="hero" size="sm" disabled={isLoading}>
                <Save className="h-4 w-4 ml-2" />
                {isLoading ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الأسئلة</CardTitle>
                <Button onClick={addQuestion} size="sm" variant="outline">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة سؤال
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-4 border rounded-lg bg-card space-y-3">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">سؤال {index + 1}</Badge>
                          <select 
                            value={question.type}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[index].type = e.target.value;
                              setQuestions(updated);
                            }}
                            className="text-sm rounded-md border border-input bg-background px-2 py-1"
                          >
                            {questionTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <Input 
                          placeholder="اكتب نص السؤال هنا"
                          value={question.text}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[index].text = e.target.value;
                            setQuestions(updated);
                          }}
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
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>القوالب الجاهزة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  تقييم المقرر الدراسي
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  رضا الطلاب العام
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  تقييم عضو هيئة التدريس
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  جودة البرنامج الأكاديمي
                </Button>
              </CardContent>
            </Card>

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
          </div>
        </div>
      </main>
    </div>
  );
};

export default SurveyDesigner;
