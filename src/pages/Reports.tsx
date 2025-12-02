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
import { Download, FileSpreadsheet, FileText, Sparkles, TrendingUp, ArrowRight, ArrowLeft, Save, Trash2, Edit as EditIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel } from "@/utils/exportReport";

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

  useEffect(() => {
    loadReport();
    loadSettings();
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                title="العودة"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
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

        {questionsStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل النتائج حسب الأسئلة</CardTitle>
              <CardDescription>إحصائيات تفصيلية لكل سؤال</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questionsStats.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">سؤال {index + 1}</Badge>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                      <h4 className="font-medium mb-2">{item.question_text}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>عدد الإجابات: <Badge variant="outline">{item.response_count}</Badge></span>
                        {item.mean && <span>المتوسط: <Badge variant="outline">{item.mean}</Badge></span>}
                        {item.std_dev && <span>الانحراف: <Badge variant="outline">{item.std_dev}</Badge></span>}
                      </div>
                    </div>
                    {item.mean && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">{item.mean}</div>
                        <p className="text-xs text-muted-foreground">من 5.0</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
