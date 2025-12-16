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
import { Download, FileSpreadsheet, FileText, Sparkles, TrendingUp, ArrowRight, Save, Trash2, Edit as EditIcon, ChevronDown, ChevronUp, BarChart3, Users, Filter } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel } from "@/utils/exportReport";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [editedRecommendations, setEditedRecommendations] = useState("");
  const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [filterQuestion, setFilterQuestion] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");

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
        setEditedSummary(reportData.summary || "");
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
      // Get all questions for this survey
      const { data: questions, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", id)
        .order("order_index");

      if (qError) throw qError;

      // Get all responses and answers for this survey
      const { data: responses, error: rError } = await supabase
        .from("responses")
        .select("*, answers(*)")
        .eq("survey_id", id);

      if (rError) throw rError;

      setAllQuestions(questions || []);
      setAllResponses(responses || []);
      
      processDataWithFilter(questions || [], responses || [], "", "");
    } catch (error) {
      console.error("Error loading detailed answers:", error);
    }
  };

  const processDataWithFilter = (questions: any[], responses: any[], filterQ: string, filterV: string) => {
    // Filter responses based on selected question and value
    let filteredResponses = responses;
    
    if (filterQ && filterV) {
      filteredResponses = responses.filter(response => {
        const answer = response.answers?.find((a: any) => a.question_id === filterQ);
        return answer && (answer.value === filterV || String(answer.numeric_value) === filterV);
      });
    }

    // Process data: for each question, get all answers with respondent info
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

      // Calculate distribution for likert/rating questions
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

      // Calculate mean for likert/rating
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

      // Count MCQ responses
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
          fill: ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'][i % 5],
        }));
      }

      // Count text responses
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

  // Get unique values for the selected filter question
  const getFilterOptions = () => {
    if (!filterQuestion) return [];
    
    const question = allQuestions.find(q => q.id === filterQuestion);
    if (!question) return [];

    // For MCQ questions, use the predefined options
    if (question.type === 'mcq' && question.options) {
      return Array.isArray(question.options) ? question.options : [];
    }

    // For text questions, get unique values from responses
    if (question.type === 'text') {
      const uniqueValues = new Set<string>();
      allResponses.forEach(response => {
        const answer = response.answers?.find((a: any) => a.question_id === filterQuestion);
        if (answer?.value && answer.value.trim()) {
          uniqueValues.add(answer.value.trim());
        }
      });
      return Array.from(uniqueValues);
    }

    // For likert/rating, return numeric options
    if (question.type === 'likert' || question.type === 'rating') {
      return ['1', '2', '3', '4', '5'];
    }

    return [];
  };

  const applyFilter = () => {
    processDataWithFilter(allQuestions, allResponses, filterQuestion, filterValue);
  };

  const clearFilter = () => {
    setFilterQuestion("");
    setFilterValue("");
    processDataWithFilter(allQuestions, allResponses, "", "");
  };

  const getFilteredResponsesCount = () => {
    if (!filterQuestion || !filterValue) return allResponses.length;
    
    return allResponses.filter(response => {
      const answer = response.answers?.find((a: any) => a.question_id === filterQuestion);
      return answer && (answer.value === filterValue || String(answer.numeric_value) === filterValue);
    }).length;
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
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
      toast({
        title: "خطأ",
        description: "فشل حفظ بيانات التقرير",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الحفظ",
      description: "تم حفظ بيانات التقرير بنجاح",
    });

    loadReport();
  };

  const handleDeleteReport = async () => {
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", report.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف التقرير",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الحذف",
      description: "تم حذف التقرير بنجاح",
    });

    navigate("/surveys");
  };

  const handleSaveReportContent = async () => {
    const { error } = await supabase
      .from("reports")
      .update({
        summary: editedSummary,
        recommendations_text: editedRecommendations,
      })
      .eq("id", report.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ محتوى التقرير",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الحفظ",
      description: "تم حفظ محتوى التقرير بنجاح",
    });

    setEditDialogOpen(false);
    loadReport();
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-survey", {
        body: { surveyId: id },
      });

      if (error) throw error;

      toast({
        title: "تم إنشاء التقرير بنجاح",
        description: "تم تحليل البيانات بالذكاء الاصطناعي",
      });

      loadReport();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء التقرير",
        variant: "destructive",
      });
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
  const totalResponses = stats.total_responses || 0;
  const questionsStats = stats.questions_stats || [];
  
  // Calculate overall statistics from questions
  const overallStats = questionsStats.reduce((acc: any, q: any) => {
    if (q.type === 'likert' || q.type === 'rating') {
      acc.count++;
      acc.meanSum += parseFloat(q.mean) || 0;
      acc.stdDevSum += parseFloat(q.std_dev) || 0;
    }
    return acc;
  }, { count: 0, meanSum: 0, stdDevSum: 0 });
  
  const overallMean = overallStats.count > 0 ? overallStats.meanSum / overallStats.count : 0;
  const overallStdDev = overallStats.count > 0 ? overallStats.stdDevSum / overallStats.count : 0;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">التقارير والتحليلات</h1>
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
              <Button 
                variant="accent" 
                onClick={() => exportToPDF(report, survey, stats, collegeLogo)}
              >
                <Download className="h-4 w-4 ml-2" />
                PDF
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => exportToExcel(report, survey, stats)}
              >
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                Excel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف التقرير
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Report Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات التقرير</CardTitle>
            <CardDescription>تحديد الفصل الدراسي وحالة التقرير</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester">الفصل الدراسي</Label>
                <Input
                  id="semester"
                  placeholder="الفصل الأول"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academic-year">العام الأكاديمي</Label>
                <Input
                  id="academic-year"
                  placeholder="2024-2025"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">حالة التقرير</Label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responding">تحت الاستجابة للردود</SelectItem>
                    <SelectItem value="completed">منتهي</SelectItem>
                    <SelectItem value="no_response">لم يتم الاستجابة</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={saveReportMetadata}>
                <Save className="h-4 w-4 ml-2" />
                حفظ بيانات التقرير
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter Card */}
        {allQuestions.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                فلتر التحليل حسب سؤال محدد
              </CardTitle>
              <CardDescription>
                اختر سؤالاً وقيمة لتصفية التحليل (مثال: تحليل استجابات عضو هيئة تدريس معين)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>اختر السؤال للفلترة</Label>
                  <Select 
                    value={filterQuestion} 
                    onValueChange={(val) => {
                      setFilterQuestion(val);
                      setFilterValue("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سؤالاً..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allQuestions.map((q, i) => (
                        <SelectItem key={q.id} value={q.id}>
                          س{i + 1}: {q.text.substring(0, 50)}{q.text.length > 50 ? '...' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>اختر القيمة</Label>
                  <Select 
                    value={filterValue} 
                    onValueChange={setFilterValue}
                    disabled={!filterQuestion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filterQuestion ? "اختر قيمة..." : "اختر سؤالاً أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilterOptions().map((opt: string, i: number) => (
                        <SelectItem key={i} value={opt}>
                          {allQuestions.find(q => q.id === filterQuestion)?.type === 'likert' || 
                           allQuestions.find(q => q.id === filterQuestion)?.type === 'rating'
                            ? `${opt} - ${opt === '1' ? 'غير موافق بشدة' : opt === '2' ? 'غير موافق' : opt === '3' ? 'محايد' : opt === '4' ? 'موافق' : 'موافق بشدة'}`
                            : opt
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <div className="flex gap-2">
                    <Button 
                      onClick={applyFilter}
                      disabled={!filterQuestion || !filterValue}
                      className="flex-1"
                    >
                      تطبيق الفلتر
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={clearFilter}
                      disabled={!filterQuestion && !filterValue}
                    >
                      مسح
                    </Button>
                  </div>
                </div>
              </div>

              {filterQuestion && filterValue && (
                <div className="mt-4 p-3 bg-card rounded-lg border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">فلتر نشط</Badge>
                    <span className="text-sm">
                      {allQuestions.find(q => q.id === filterQuestion)?.text.substring(0, 40)}... = <strong>{filterValue}</strong>
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getFilteredResponsesCount()} من {allResponses.length} استجابة
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الاستجابات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalResponses}</div>
              <p className="text-xs text-muted-foreground mt-1">استجابة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                عدد الأسئلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{questionsStats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">سؤال</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                المتوسط العام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallMean > 0 ? overallMean.toFixed(2) : "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">من 5.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الانحراف المعياري
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallStdDev > 0 ? overallStdDev.toFixed(2) : "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">التجانس</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ملخص تنفيذي من AI</CardTitle>
                <CardDescription>تحليل آلي للنتائج والتوصيات</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEditedSummary(report.summary || "");
                  setEditedRecommendations(report.recommendations_text || "");
                  setEditDialogOpen(true);
                }}
              >
                <EditIcon className="h-4 w-4 ml-2" />
                تعديل المحتوى
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.summary && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">الملخص التنفيذي:</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {report.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {report.recommendations_text && (
              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-accent mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">التوصيات:</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {report.recommendations_text}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions Overview Chart */}
        {detailedAnswers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                متوسط كل سؤال
              </CardTitle>
              <CardDescription>مقارنة متوسطات الأسئلة (للأسئلة من نوع ليكرت والتقييم)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={detailedAnswers
                      .filter(q => q.type === 'likert' || q.type === 'rating')
                      .map((q, i) => ({
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
                          return (
                            <div className="bg-card p-3 rounded-lg border shadow-lg max-w-xs">
                              <p className="font-medium text-sm mb-1">{data.fullName}</p>
                              <p className="text-primary font-bold">المتوسط: {data.mean.toFixed(2)}</p>
                              <p className="text-muted-foreground text-xs">عدد الاستجابات: {data.responses}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="mean" 
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Questions with Responses */}
        {detailedAnswers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                تفاصيل الاستجابات لكل سؤال
              </CardTitle>
              <CardDescription>اضغط على أي سؤال لعرض جميع الاستجابات الفردية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailedAnswers.map((question, index) => (
                <Collapsible 
                  key={question.id} 
                  open={expandedQuestions.includes(question.id)}
                  onOpenChange={() => toggleQuestion(question.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
                        <div className="flex-1 text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">سؤال {index + 1}</Badge>
                            <Badge variant="outline">
                              {question.type === 'likert' ? 'مقياس ليكرت' : 
                               question.type === 'rating' ? 'تقييم' :
                               question.type === 'mcq' ? 'اختيار متعدد' : 'نص حر'}
                            </Badge>
                            <Badge variant="default">{question.responseCount} استجابة</Badge>
                          </div>
                          <h4 className="font-medium text-right">{question.text}</h4>
                          {(question.type === 'likert' || question.type === 'rating') && parseFloat(question.mean) > 0 && (
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>المتوسط: <span className="font-bold text-primary">{question.mean}</span></span>
                              <span>الانحراف المعياري: <span className="font-bold">{question.stdDev}</span></span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {(question.type === 'likert' || question.type === 'rating') && parseFloat(question.mean) > 0 && (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{question.mean}</div>
                              <p className="text-xs text-muted-foreground">من 5.0</p>
                            </div>
                          )}
                          {expandedQuestions.includes(question.id) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t bg-muted/20 p-4 space-y-4">
                        {/* Distribution Chart for Likert/Rating */}
                        {(question.type === 'likert' || question.type === 'rating') && question.distribution.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium mb-3">توزيع الاستجابات</h5>
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={question.distribution}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <Tooltip />
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
                              <h5 className="font-medium mb-3">النسب المئوية</h5>
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={question.distribution.filter((d: any) => d.value > 0)}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={40}
                                      outerRadius={70}
                                      paddingAngle={2}
                                      dataKey="value"
                                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                      labelLine={false}
                                    >
                                      {question.distribution.map((entry: any, i: number) => (
                                        <Cell key={`cell-${i}`} fill={entry.fill} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MCQ Distribution */}
                        {question.type === 'mcq' && question.mcqDistribution.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-3">توزيع الاختيارات</h5>
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={question.mcqDistribution} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                                  <Tooltip />
                                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {question.mcqDistribution.map((entry: any, i: number) => (
                                      <Cell key={`cell-${i}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Individual Responses Table */}
                        <div>
                          <h5 className="font-medium mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            جميع الاستجابات ({question.answers.length})
                          </h5>
                          {question.answers.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-right w-20">المستجيب</TableHead>
                                    <TableHead className="text-right">الإجابة</TableHead>
                                    {(question.type === 'likert' || question.type === 'rating') && (
                                      <TableHead className="text-right w-24">القيمة</TableHead>
                                    )}
                                    <TableHead className="text-right w-40">تاريخ الاستجابة</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {question.answers.map((answer: any) => (
                                    <TableRow key={answer.id}>
                                      <TableCell className="font-medium">
                                        <Badge variant="outline">#{answer.respondent_number}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        {question.type === 'likert' || question.type === 'rating' ? (
                                          <div className="flex items-center gap-2">
                                            <div className="flex">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <span
                                                  key={star}
                                                  className={`text-lg ${
                                                    star <= (answer.numeric_value || 0)
                                                      ? 'text-yellow-500'
                                                      : 'text-gray-300'
                                                  }`}
                                                >
                                                  ★
                                                </span>
                                              ))}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                              ({answer.numeric_value === 1 ? 'غير موافق بشدة' :
                                                answer.numeric_value === 2 ? 'غير موافق' :
                                                answer.numeric_value === 3 ? 'محايد' :
                                                answer.numeric_value === 4 ? 'موافق' :
                                                answer.numeric_value === 5 ? 'موافق بشدة' : '-'})
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-sm">{answer.value || '-'}</span>
                                        )}
                                      </TableCell>
                                      {(question.type === 'likert' || question.type === 'rating') && (
                                        <TableCell>
                                          <Badge 
                                            variant={
                                              answer.numeric_value >= 4 ? 'default' :
                                              answer.numeric_value === 3 ? 'secondary' : 'destructive'
                                            }
                                          >
                                            {answer.numeric_value}/5
                                          </Badge>
                                        </TableCell>
                                      )}
                                      <TableCell className="text-sm text-muted-foreground">
                                        {answer.submitted_at 
                                          ? new Date(answer.submitted_at).toLocaleString('ar-SA')
                                          : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">لا توجد استجابات لهذا السؤال</p>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف التقرير</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Report Content Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل محتوى التقرير</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-summary">الملخص التنفيذي</Label>
              <Textarea
                id="edit-summary"
                placeholder="اكتب الملخص التنفيذي للتقرير..."
                rows={8}
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                اكتب ملخصاً واضحاً ومختصراً للنتائج الرئيسية للاستبيان
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-recommendations">التوصيات</Label>
              <Textarea
                id="edit-recommendations"
                placeholder="اكتب التوصيات المقترحة بناءً على نتائج الاستبيان..."
                rows={8}
                value={editedRecommendations}
                onChange={(e) => setEditedRecommendations(e.target.value)}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                اكتب توصيات قابلة للتنفيذ لتحسين الأداء بناءً على النتائج
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditedSummary(report.summary || "");
                  setEditedRecommendations(report.recommendations_text || "");
                }}
              >
                إلغاء
              </Button>
              <Button onClick={handleSaveReportContent}>
                <Save className="h-4 w-4 ml-2" />
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
