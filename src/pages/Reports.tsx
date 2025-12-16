import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, Sparkles, ArrowRight, Save, Trash2, Edit as EditIcon, BarChart3, Users, Filter, Target, MessageSquare, ListChecks, AlertTriangle } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel } from "@/utils/exportReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
const MCQ_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16'];

const getMeanLevel = (mean: number) => {
  if (mean >= 4.5) return { label: 'ممتاز', color: 'bg-green-500' };
  if (mean >= 3.5) return { label: 'جيد جداً', color: 'bg-green-400' };
  if (mean >= 2.5) return { label: 'متوسط', color: 'bg-yellow-500' };
  if (mean >= 1.5) return { label: 'ضعيف', color: 'bg-orange-500' };
  return { label: 'ضعيف جداً', color: 'bg-red-500' };
};

const Reports = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<any>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [reportStatus, setReportStatus] = useState("responding");
  const [collegeLogo, setCollegeLogo] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editRecommendationsOpen, setEditRecommendationsOpen] = useState(false);
  const [editedRecommendations, setEditedRecommendations] = useState("");
  const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [filterQuestion, setFilterQuestion] = useState<string>("");
  const [filterValues, setFilterValues] = useState<string[]>([]);

  useEffect(() => {
    loadReport();
    loadSettings();
    if (id) loadDetailedAnswers();
  }, [id]);

  const loadReport = async () => {
    try {
      const { data: reportData, error } = await supabase
        .from("reports")
        .select("*, surveys(title, program_id, programs(name))")
        .eq("survey_id", id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading report:", error);
      }

      if (reportData) {
        setReport(reportData);
        setSurvey(reportData.surveys);
        setSemester(reportData.semester || "");
        setAcademicYear(reportData.academic_year || "");
        setReportStatus(reportData.status || "responding");
        setEditedRecommendations(reportData.recommendations_text || "");
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "college_logo")
      .single();

    if (data?.value) {
      setCollegeLogo(data.value);
    }
  };

  const loadDetailedAnswers = async () => {
    try {
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", id)
        .neq("type", "section")
        .order("order_index");

      if (qError) throw qError;

      const { data: responses, error: rError } = await supabase
        .from("responses")
        .select("*, answers(*)")
        .eq("survey_id", id);

      if (rError) throw rError;

      setAllQuestions(questions || []);
      setAllResponses(responses || []);
      
      processDataWithFilter(questions || [], responses || [], "", []);
    } catch (error) {
      console.error("Error loading detailed answers:", error);
    }
  };

  const processDataWithFilter = (
    questions: any[], 
    responses: any[], 
    filterQ: string, 
    filterVals: string[]
  ) => {
    let filteredResponses = responses;
    
    // تطبيق الفلتر تلقائياً عند اختيار القيم
    if (filterQ && filterVals.length > 0) {
      filteredResponses = filteredResponses.filter(response => {
        const answer = response.answers?.find((a: any) => a.question_id === filterQ);
        return answer && (filterVals.includes(answer.value) || filterVals.includes(String(answer.numeric_value)));
      });
    }

    const processedData = questions.map((question) => {
      const answersForQuestion = filteredResponses.flatMap((response, index) => {
        const answer = response.answers?.find((a: any) => a.question_id === question.id);
        if (answer) {
          return {
            ...answer,
            respondent_number: index + 1,
            response_id: response.id,
            submitted_at: response.submitted_at,
          };
        }
        return [];
      }).filter(Boolean);

      // توزيع likert/rating
      let distribution: any[] = [];
      if (question.type === 'likert' || question.type === 'rating') {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        answersForQuestion.forEach((a: any) => {
          if (a.numeric_value && counts[a.numeric_value] !== undefined) {
            counts[a.numeric_value]++;
          }
        });
        distribution = [
          { name: 'غير موافق بشدة', value: counts[1], fill: '#ef4444' },
          { name: 'غير موافق', value: counts[2], fill: '#f97316' },
          { name: 'محايد', value: counts[3], fill: '#eab308' },
          { name: 'موافق', value: counts[4], fill: '#22c55e' },
          { name: 'موافق بشدة', value: counts[5], fill: '#16a34a' },
        ];
      }

      // حساب المتوسط والانحراف المعياري
      let mean = 0;
      let stdDev = 0;
      if (question.type === 'likert' || question.type === 'rating') {
        const numericValues = answersForQuestion
          .filter((a: any) => a.numeric_value !== null)
          .map((a: any) => a.numeric_value);
        
        if (numericValues.length > 0) {
          mean = numericValues.reduce((sum: number, val: number) => sum + val, 0) / numericValues.length;
          const variance = numericValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
          stdDev = Math.sqrt(variance);
        }
      }

      // توزيع MCQ
      let mcqDistribution: any[] = [];
      if (question.type === 'mcq' && question.options) {
        const options = Array.isArray(question.options) ? question.options : [];
        const counts: Record<string, number> = {};
        options.forEach((opt: string) => { counts[opt] = 0; });
        answersForQuestion.forEach((a: any) => {
          if (a.value && counts[a.value] !== undefined) {
            counts[a.value]++;
          }
        });
        mcqDistribution = options.map((opt: string, i: number) => ({
          name: opt,
          value: counts[opt],
          fill: MCQ_COLORS[i % MCQ_COLORS.length],
        }));
      }

      // الردود النصية
      let textResponses: string[] = [];
      if (question.type === 'text') {
        textResponses = answersForQuestion
          .filter((a: any) => a.value && a.value.trim())
          .map((a: any) => a.value);
      }

      return {
        ...question,
        answers: answersForQuestion,
        distribution,
        mcqDistribution,
        textResponses,
        mean: mean.toFixed(2),
        stdDev: stdDev.toFixed(2),
        responseCount: answersForQuestion.length,
      };
    });

    setDetailedAnswers(processedData);
  };

  // الحصول على خيارات الفلتر
  const getFilterOptions = () => {
    if (!filterQuestion) return [];
    
    const question = allQuestions.find(q => q.id === filterQuestion);
    if (!question) return [];

    if (question.type === 'mcq' && question.options) {
      const options = question.options;
      // Handle different options formats
      if (Array.isArray(options)) return options.map((o: string) => String(o).trim());
      if (options.choices && Array.isArray(options.choices)) {
        return options.choices.map((choice: string) => String(choice).trim());
      }
      // Handle string format
      if (typeof options === 'string') {
        try {
          const parsed = JSON.parse(options);
          if (Array.isArray(parsed)) return parsed;
          if (parsed.choices) return parsed.choices;
        } catch {
          return [];
        }
      }
      return [];
    }

    if (question.type === 'likert' || question.type === 'rating') {
      return ['1', '2', '3', '4', '5'];
    }

    return [];
  };

  // التحقق من وجود إجابات
  const hasAnswersData = allResponses.some(r => r.answers && r.answers.length > 0);

  // تطبيق الفلتر تلقائياً عند تغيير القيم
  const handleFilterValueChange = (value: string) => {
    const newValues = filterValues.includes(value) 
      ? filterValues.filter(v => v !== value)
      : [...filterValues, value];
    
    setFilterValues(newValues);
    processDataWithFilter(allQuestions, allResponses, filterQuestion, newValues);
  };

  const handleFilterQuestionChange = (questionId: string) => {
    setFilterQuestion(questionId);
    setFilterValues([]);
    processDataWithFilter(allQuestions, allResponses, questionId, []);
  };

  const clearFilter = () => {
    setFilterQuestion("");
    setFilterValues([]);
    processDataWithFilter(allQuestions, allResponses, "", []);
  };

  const saveReportMetadata = async () => {
    const { error } = await supabase
      .from("reports")
      .update({
        semester,
        academic_year: academicYear,
        status: reportStatus,
      })
      .eq("id", report.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ بيانات التقرير", variant: "destructive" });
      return;
    }

    toast({ title: "تم الحفظ", description: "تم حفظ بيانات التقرير بنجاح" });
    loadReport();
  };

  const handleDeleteReport = async () => {
    const { error } = await supabase.from("reports").delete().eq("id", report.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في حذف التقرير", variant: "destructive" });
      return;
    }

    toast({ title: "تم الحذف", description: "تم حذف التقرير بنجاح" });
    navigate("/surveys");
  };

  const handleSaveRecommendations = async () => {
    const { error } = await supabase
      .from("reports")
      .update({ recommendations_text: editedRecommendations })
      .eq("id", report.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في حفظ التوصيات", variant: "destructive" });
      return;
    }

    toast({ title: "تم الحفظ", description: "تم حفظ التوصيات بنجاح" });
    setEditRecommendationsOpen(false);
    loadReport();
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-survey", {
        body: { surveyId: id },
      });

      if (error) throw error;

      toast({ title: "تم إنشاء التقرير بنجاح", description: "تم تحليل البيانات بالذكاء الاصطناعي" });
      loadReport();
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء إنشاء التقرير", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>لا يوجد تقرير</CardTitle>
            <CardDescription>لم يتم إنشاء تقرير لهذا الاستبيان بعد</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateReport} disabled={isGenerating} className="w-full">
              <Sparkles className="h-4 w-4 ml-2" />
              {isGenerating ? "جاري إنشاء التقرير..." : "إنشاء تقرير بالذكاء الاصطناعي"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/surveys")} className="w-full">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة إلى الاستبيانات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = report.statistics || {};
  const totalResponses = allResponses.length;

  // حساب الإحصائيات العامة
  const likertRatingQuestions = detailedAnswers.filter(q => q.type === 'likert' || q.type === 'rating');
  const overallMean = likertRatingQuestions.length > 0
    ? likertRatingQuestions.reduce((sum, q) => sum + (parseFloat(q.mean) || 0), 0) / likertRatingQuestions.length
    : 0;
  const totalTextResponses = detailedAnswers
    .filter(q => q.type === 'text')
    .reduce((sum, q) => sum + q.textResponses.length, 0);

  const filteredResponsesCount = filterQuestion && filterValues.length > 0 
    ? detailedAnswers[0]?.responseCount || 0 
    : totalResponses;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">تقرير الاستبيان</h1>
              <p className="text-sm text-muted-foreground">
                {survey?.title} - {survey?.programs?.name}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <DashboardButton />
              <Button variant="outline" onClick={generateReport} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 ml-2" />
                {isGenerating ? "جاري التحليل..." : "إعادة التحليل"}
              </Button>
              <Button variant="accent" onClick={() => exportToPDF(report, survey, stats, collegeLogo)}>
                <Download className="h-4 w-4 ml-2" />
                PDF
              </Button>
              <Button variant="secondary" onClick={() => exportToExcel(report, survey, stats)}>
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                Excel
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* بيانات التقرير */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>الفصل الدراسي</Label>
                <Input placeholder="الفصل الأول" value={semester} onChange={(e) => setSemester(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>العام الأكاديمي</Label>
                <Input placeholder="2024-2025" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>حالة التقرير</Label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responding">تحت الاستجابة</SelectItem>
                    <SelectItem value="completed">منتهي</SelectItem>
                    <SelectItem value="no_response">لم يتم الاستجابة</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveReportMetadata} className="mt-4">
              <Save className="h-4 w-4 ml-2" />
              حفظ البيانات
            </Button>
          </CardContent>
        </Card>

        {/* الإحصائيات العامة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الاستجابات</p>
                  <p className="text-3xl font-bold text-blue-600">{filteredResponsesCount}</p>
                  {filterQuestion && filterValues.length > 0 && (
                    <p className="text-xs text-muted-foreground">من {totalResponses}</p>
                  )}
                </div>
                <Users className="h-10 w-10 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المتوسط العام</p>
                  <p className="text-3xl font-bold text-green-600">{overallMean.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">من 5.0</p>
                </div>
                <Target className="h-10 w-10 text-green-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">عدد الأسئلة</p>
                  <p className="text-3xl font-bold text-purple-600">{detailedAnswers.length}</p>
                </div>
                <ListChecks className="h-10 w-10 text-purple-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">التعليقات النصية</p>
                  <p className="text-3xl font-bold text-amber-600">{totalTextResponses}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-amber-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* تنبيه عدم وجود إجابات */}
        {!hasAnswersData && totalResponses > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">تنبيه: لا توجد إجابات محفوظة</p>
                  <p className="text-sm text-muted-foreground">
                    يوجد {totalResponses} استجابة لكن بدون إجابات مفصلة. قد تكون هناك مشكلة في حفظ الإجابات عند تعبئة الاستبيان.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* الفلتر */}
        {allQuestions.length > 0 && hasAnswersData && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                فلترة التقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">اختر السؤال للفلترة</Label>
                  <Select value={filterQuestion} onValueChange={handleFilterQuestionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سؤالاً..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allQuestions.filter(q => q.type !== 'text').map((q, i) => (
                        <SelectItem key={q.id} value={q.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {q.type === 'mcq' ? 'اختيار' : q.type === 'likert' ? 'ليكرت' : 'تقييم'}
                            </Badge>
                            س{i + 1}: {q.text.substring(0, 35)}{q.text.length > 35 ? '...' : ''}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">اختر القيم (يتم تطبيق الفلتر تلقائياً)</Label>
                  <div className={`border rounded-lg p-3 max-h-40 overflow-y-auto ${!filterQuestion ? 'opacity-50 pointer-events-none' : ''}`}>
                    {!filterQuestion ? (
                      <p className="text-sm text-muted-foreground text-center">اختر سؤالاً أولاً</p>
                    ) : getFilterOptions().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">لا توجد خيارات</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getFilterOptions().map((opt: string, i: number) => {
                          const selectedQuestion = allQuestions.find(q => q.id === filterQuestion);
                          const isLikert = selectedQuestion?.type === 'likert' || selectedQuestion?.type === 'rating';
                          const isSelected = filterValues.includes(opt);
                          
                          return (
                            <Badge
                              key={i}
                              variant={isSelected ? "default" : "outline"}
                              className="cursor-pointer px-3 py-1"
                              onClick={() => handleFilterValueChange(opt)}
                            >
                              {isLikert ? `${opt}/5` : opt}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {(filterQuestion || filterValues.length > 0) && (
                <Button variant="ghost" size="sm" onClick={clearFilter} className="mt-3">
                  مسح الفلتر
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ملخص متوسطات الأسئلة */}
        {likertRatingQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                ملخص متوسطات الأسئلة
              </CardTitle>
              <CardDescription>مقارنة متوسطات جميع الأسئلة (ليكرت والتقييم)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={likertRatingQuestions.map((q, i) => ({
                      name: `س${i + 1}`,
                      fullName: q.text,
                      mean: parseFloat(q.mean) || 0,
                      responses: q.responseCount,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis type="category" dataKey="name" width={40} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const level = getMeanLevel(data.mean);
                          return (
                            <div className="bg-card p-3 rounded-lg border shadow-lg max-w-xs">
                              <p className="font-medium text-sm mb-2">{data.fullName}</p>
                              <p className="text-primary font-bold">المتوسط: {data.mean.toFixed(2)}</p>
                              <p className="text-muted-foreground text-xs">التقييم: {level.label}</p>
                              <p className="text-muted-foreground text-xs">عدد الاستجابات: {data.responses}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="mean" radius={[0, 4, 4, 0]}>
                      {likertRatingQuestions.map((q, i) => {
                        const mean = parseFloat(q.mean) || 0;
                        const color = mean >= 4 ? '#22c55e' : mean >= 3 ? '#eab308' : '#ef4444';
                        return <Cell key={`cell-${i}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* تحليل كل سؤال */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            تحليل الأسئلة
          </h2>

          {detailedAnswers.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">سؤال {index + 1}</Badge>
                      <Badge variant="outline">
                        {question.type === 'likert' ? 'مقياس ليكرت' :
                         question.type === 'rating' ? 'تقييم' :
                         question.type === 'mcq' ? 'اختيار متعدد' : 'نص حر'}
                      </Badge>
                      <Badge variant="secondary">{question.responseCount} استجابة</Badge>
                    </div>
                    <CardTitle className="text-lg">{question.text}</CardTitle>
                  </div>

                  {(question.type === 'likert' || question.type === 'rating') && parseFloat(question.mean) > 0 && (
                    <div className="text-center">
                      <div className={`px-4 py-2 rounded-lg ${getMeanLevel(parseFloat(question.mean)).color} text-white`}>
                        <p className="text-2xl font-bold">{question.mean}</p>
                        <p className="text-xs">{getMeanLevel(parseFloat(question.mean)).label}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Likert/Rating */}
                {(question.type === 'likert' || question.type === 'rating') && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 text-sm text-muted-foreground">توزيع الاستجابات</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={question.distribution}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                              <YAxis />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const total = question.distribution.reduce((sum: number, d: any) => sum + d.value, 0);
                                    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                                    return (
                                      <div className="bg-card p-3 rounded-lg border shadow-lg">
                                        <p className="font-medium">{data.name}</p>
                                        <p className="text-primary">العدد: {data.value}</p>
                                        <p className="text-muted-foreground">النسبة: {percentage}%</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {question.distribution.map((entry: any, i: number) => (
                                  <Cell key={`cell-${i}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3 text-sm text-muted-foreground">جدول التوزيع</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">الاستجابة</TableHead>
                              <TableHead className="text-right w-20">العدد</TableHead>
                              <TableHead className="text-right w-24">النسبة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {question.distribution.map((item: any, i: number) => {
                              const total = question.distribution.reduce((sum: number, d: any) => sum + d.value, 0);
                              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                              return (
                                <TableRow key={i}>
                                  <TableCell className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                                    {item.name}
                                  </TableCell>
                                  <TableCell>{item.value}</TableCell>
                                  <TableCell>{percentage}%</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">المتوسط</p>
                        <p className="text-xl font-bold text-primary">{question.mean}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">الانحراف المعياري</p>
                        <p className="text-xl font-bold">{question.stdDev}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">معدل الاستجابة</p>
                        <p className="text-xl font-bold">{totalResponses > 0 ? ((question.responseCount / totalResponses) * 100).toFixed(0) : 0}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MCQ */}
                {question.type === 'mcq' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground">توزيع الاختيارات</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={question.mcqDistribution} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {question.mcqDistribution.map((entry: any, i: number) => (
                                <Cell key={`cell-${i}`} fill={MCQ_COLORS[i % MCQ_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground">النسب المئوية</h4>
                      <div className="space-y-3">
                        {question.mcqDistribution.map((item: any, i: number) => {
                          const total = question.mcqDistribution.reduce((sum: number, d: any) => sum + d.value, 0);
                          const percentage = total > 0 ? (item.value / total) * 100 : 0;
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{item.name}</span>
                                <span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text */}
                {question.type === 'text' && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">الردود النصية ({question.textResponses.length})</h4>
                    {question.textResponses.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {question.textResponses.map((response: string, i: number) => (
                          <div key={i} className="p-4 bg-muted/30 rounded-lg border-r-4 border-primary">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                              <p className="text-sm leading-relaxed">{response}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">لا توجد ردود نصية</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* التوصيات */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                التوصيات
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditRecommendationsOpen(true)}>
                <EditIcon className="h-4 w-4 ml-2" />
                تعديل التوصيات
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {report.recommendations_text ? (
              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {report.recommendations_text}
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد توصيات بعد. اضغط على "تعديل التوصيات" لإضافة توصيات.</p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog تعديل التوصيات */}
      <Dialog open={editRecommendationsOpen} onOpenChange={setEditRecommendationsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل التوصيات</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedRecommendations}
              onChange={(e) => setEditedRecommendations(e.target.value)}
              placeholder="اكتب التوصيات هنا..."
              rows={10}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecommendationsOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveRecommendations}>
              <Save className="h-4 w-4 ml-2" />
              حفظ التوصيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog حذف التقرير */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف التقرير؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التقرير بشكل نهائي ولا يمكن استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;
