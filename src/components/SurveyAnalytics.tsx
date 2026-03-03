import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from "recharts";
import { 
  TrendingUp, Users, Clock, Target, Download, Filter, Calendar,
  BarChart3, PieChart as PieChartIcon, Activity, FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF, exportToExcel, captureAllCharts } from "@/utils/exportReport";
import { useLanguage } from "@/contexts/LanguageContext";

interface SurveyAnalyticsProps { surveyId: string; }
interface AnalyticsData {
  totalResponses: number; completionRate: number; averageTime: number;
  responsesByDate: any[]; questionAnalytics: any[]; demographicData: any[];
}

const SurveyAnalytics = ({ surveyId }: SurveyAnalyticsProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [surveyDetails, setSurveyDetails] = useState<any>(null);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  useEffect(() => { loadAnalytics(); loadSurveyDetails(); }, [surveyId, selectedTimeRange]);

  const loadSurveyDetails = async () => {
    const { data } = await supabase.from("surveys").select("*, programs(name)").eq("id", surveyId).maybeSingle();
    if (data) setSurveyDetails(data);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: responses, error: responsesError } = await supabase
        .from("responses").select(`*, answers (*, questions (*))`).eq("survey_id", surveyId);
      if (responsesError) throw responsesError;
      const { data: questions, error: questionsError } = await supabase
        .from("questions").select("*").eq("survey_id", surveyId).order("order_index");
      if (questionsError) throw questionsError;
      const processedData = processAnalyticsData(responses || [], questions || []);
      setAnalytics(processedData);
    } catch (error: any) {
      toast({ title: t('common.error'), description: language === 'ar' ? "فشل في تحميل بيانات التحليل" : "Failed to load analytics", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const likertLabels = language === 'ar'
    ? ["غير موافق بشدة", "غير موافق", "محايد", "موافق", "موافق بشدة"]
    : ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

  const processAnalyticsData = (responses: any[], questions: any[]): AnalyticsData => {
    const totalResponses = responses.length;
    const completedResponses = responses.filter(r => r.is_complete).length;
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;
    const averageTime = responses.reduce((sum, r) => sum + (r.completion_time || 0), 0) / totalResponses || 0;
    const responsesByDate = processResponsesByDate(responses);
    const questionAnalytics = processQuestionAnalytics(responses, questions);
    const demographicData = [
      { name: language === 'ar' ? "برنامج القانون" : "Law Program", value: 45, color: "#8884d8" },
      { name: language === 'ar' ? "برنامج إدارة الأعمال" : "Business Admin", value: 30, color: "#82ca9d" },
      { name: language === 'ar' ? "برنامج التسويق" : "Marketing", value: 25, color: "#ffc658" },
    ];
    return { totalResponses, completionRate, averageTime, responsesByDate, questionAnalytics, demographicData };
  };

  const processResponsesByDate = (responses: any[]) => {
    const dateMap = new Map();
    responses.forEach(response => {
      const date = new Date(response.submitted_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    return Array.from(dateMap.entries()).map(([date, count]) => ({ date, responses: count })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const processQuestionAnalytics = (responses: any[], questions: any[]) => {
    return questions.map(question => {
      const questionAnswers = responses.flatMap(r => r.answers?.filter((a: any) => a.question_id === question.id) || []);
      if (question.type === "likert") {
        const likertData = likertLabels.map((label, i) => ({
          label, value: 0, color: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"][i],
        }));
        questionAnswers.forEach(answer => {
          const value = parseInt(answer.answer_value) - 1;
          if (value >= 0 && value < 5) likertData[value].value++;
        });
        return { id: question.id, text: question.text, type: question.type, data: likertData, totalAnswers: questionAnswers.length,
          average: likertData.reduce((sum, item, index) => sum + (item.value * (index + 1)), 0) / questionAnswers.length || 0 };
      }
      if (question.type === "mcq") {
        const optionCounts = new Map();
        const options = question.options?.choices || [];
        options.forEach((option: string) => optionCounts.set(option, 0));
        questionAnswers.forEach(answer => { if (optionCounts.has(answer.answer_value)) optionCounts.set(answer.answer_value, optionCounts.get(answer.answer_value) + 1); });
        const mcqData = Array.from(optionCounts.entries()).map(([option, count], index) => ({ label: option, value: count, color: `hsl(${index * 60}, 70%, 50%)` }));
        return { id: question.id, text: question.text, type: question.type, data: mcqData, totalAnswers: questionAnswers.length };
      }
      if (question.type === "rating") {
        const ratingData = [1, 2, 3, 4, 5].map(rating => ({
          label: `${rating} ${language === 'ar' ? 'نجوم' : 'stars'}`,
          value: questionAnswers.filter(a => parseInt(a.answer_value) === rating).length,
          color: `hsl(${rating * 60}, 70%, 50%)`,
        }));
        return { id: question.id, text: question.text, type: question.type, data: ratingData, totalAnswers: questionAnswers.length,
          average: questionAnswers.reduce((sum, a) => sum + parseInt(a.answer_value || 0), 0) / questionAnswers.length || 0 };
      }
      return { id: question.id, text: question.text, type: question.type, data: questionAnswers.map(a => a.answer_value).filter(Boolean), totalAnswers: questionAnswers.length };
    });
  };

  const handleExportPDF = async () => {
    if (!analytics || !surveyDetails) { toast({ title: t('common.error'), description: t('analytics.noDataDesc'), variant: "destructive" }); return; }
    setExporting(true);
    try {
      const questionStats = analytics.questionAnalytics.filter(q => q.type === 'likert' || q.type === 'rating')
        .map(q => ({ question: q.text, type: q.type, mean: q.average || 0, stdDev: 0, responseCount: q.totalAnswers }));
      const textResponses = analytics.questionAnalytics.filter(q => q.type === 'text').map(q => ({ question: q.text, responses: q.data || [] }));
      const chartImages = await captureAllCharts([
        { id: 'responses-over-time', type: 'summary', title: language === 'ar' ? 'الاستجابات عبر الوقت' : 'Responses Over Time' },
        { id: 'program-distribution', type: 'summary', title: language === 'ar' ? 'التوزيع حسب البرنامج' : 'Distribution by Program' },
      ]);
      const overallMean = questionStats.length > 0 ? questionStats.reduce((s, q) => s + q.mean, 0) / questionStats.length : 0;
      const responseRate = surveyDetails.target_enrollment && surveyDetails.target_enrollment > 0 ? (analytics.totalResponses / surveyDetails.target_enrollment) * 100 : 0;
      const report = { semester: surveyDetails.semester, academic_year: surveyDetails.academic_year, summary: `${language === 'ar' ? 'تقرير شامل لنتائج استبيان' : 'Comprehensive report for survey'} "${surveyDetails.title}"`, recommendations_text: language === 'ar' ? 'يرجى مراجعة النتائج وإعداد خطة تحسين.' : 'Please review results and prepare an improvement plan.' };
      const stats = { totalResponses: analytics.totalResponses, targetEnrollment: surveyDetails.target_enrollment || 0, responseRate: responseRate.toFixed(1), overallMean, overallStdDev: 0, questionStats };
      await exportToPDF(report, surveyDetails, stats, undefined, chartImages.length > 0 ? chartImages : undefined, textResponses.length > 0 ? textResponses : undefined);
      toast({ title: t('analytics.exportSuccess'), description: t('analytics.exportedPDF') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "فشل في التصدير" : "Export failed"), variant: "destructive" });
    } finally { setExporting(false); }
  };

  const handleExportExcel = async () => {
    if (!analytics || !surveyDetails) { toast({ title: t('common.error'), description: t('analytics.noDataDesc'), variant: "destructive" }); return; }
    setExporting(true);
    try {
      const questionStats = analytics.questionAnalytics.filter(q => q.type === 'likert' || q.type === 'rating')
        .map(q => ({ question: q.text, type: q.type, mean: q.average || 0, stdDev: 0, responseCount: q.totalAnswers }));
      const textResponses = analytics.questionAnalytics.filter(q => q.type === 'text').map(q => ({ question: q.text, responses: q.data || [] }));
      const overallMean = questionStats.length > 0 ? questionStats.reduce((s, q) => s + q.mean, 0) / questionStats.length : 0;
      const responseRate = surveyDetails.target_enrollment && surveyDetails.target_enrollment > 0 ? (analytics.totalResponses / surveyDetails.target_enrollment) * 100 : 0;
      const report = { semester: surveyDetails.semester, academic_year: surveyDetails.academic_year, summary: `${language === 'ar' ? 'تقرير' : 'Report'} "${surveyDetails.title}"`, recommendations_text: '' };
      const stats = { totalResponses: analytics.totalResponses, targetEnrollment: surveyDetails.target_enrollment || 0, responseRate: responseRate.toFixed(1), overallMean, overallStdDev: 0, questionStats };
      exportToExcel(report, surveyDetails, stats, textResponses.length > 0 ? textResponses : undefined);
      toast({ title: t('analytics.exportSuccess'), description: t('analytics.exportedExcel') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "فشل في التصدير" : "Export failed"), variant: "destructive" });
    } finally { setExporting(false); }
  };

  const handleTimeRangeChange = (range: string) => { setSelectedTimeRange(range); setShowFilterPopover(false); };

  const timeRangeLabel = (range: string) => {
    const labels: Record<string, string> = {
      all: t('analytics.all'), '7d': t('analytics.last7days'), '30d': t('analytics.last30days'), '90d': t('analytics.last90days'),
    };
    return labels[range] || range;
  };

  if (loading) return (<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>);
  if (!analytics) return (
    <div className="text-center py-12">
      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">{t('analytics.noData')}</h3>
      <p className="text-muted-foreground">{t('analytics.noDataDesc')}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('analytics.title')}</h2>
          <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 ml-2" />
                {t('analytics.filter')} ({timeRangeLabel(selectedTimeRange)})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('analytics.timePeriod')}</p>
                <div className="space-y-1">
                  {['all', '7d', '30d', '90d'].map(range => (
                    <Button key={range} variant={selectedTimeRange === range ? 'default' : 'ghost'} size="sm" className="w-full justify-start"
                      onClick={() => handleTimeRangeChange(range)}>{timeRangeLabel(range)}</Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4 ml-2" />
                {exporting ? t('analytics.exporting') : t('analytics.exportReport')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('analytics.exportFormat')}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleExportPDF} disabled={exporting}>
                  <Download className="h-4 w-4 ml-2" />{language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleExportExcel} disabled={exporting}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />{language === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">{t('analytics.totalResponses')}</p><p className="text-2xl font-bold">{analytics.totalResponses}</p></div><Users className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">{t('analytics.completionRate')}</p><p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p></div><Target className="h-8 w-8 text-accent" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">{t('analytics.avgTime')}</p><p className="text-2xl font-bold">{Math.round(analytics.averageTime / 60)} {language === 'ar' ? 'دقيقة' : 'min'}</p></div><Clock className="h-8 w-8 text-secondary" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">{language === 'ar' ? 'النمو' : 'Growth'}</p><p className="text-2xl font-bold">+12%</p></div><TrendingUp className="h-8 w-8 text-primary" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="questions">{language === 'ar' ? 'تحليل الأسئلة' : 'Question Analysis'}</TabsTrigger>
          <TabsTrigger value="demographics">{language === 'ar' ? 'التركيبة السكانية' : 'Demographics'}</TabsTrigger>
          <TabsTrigger value="trends">{language === 'ar' ? 'الاتجاهات' : 'Trends'}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />{language === 'ar' ? 'الاستجابات عبر الوقت' : 'Responses Over Time'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.responsesByDate}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip />
                    <Area type="monotone" dataKey="responses" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" />{language === 'ar' ? 'التوزيع حسب البرنامج' : 'Distribution by Program'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={analytics.demographicData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {analytics.demographicData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          {analytics.questionAnalytics.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('takeSurvey.questionOf')} {index + 1}</CardTitle>
                    <p className="text-muted-foreground mt-1">{question.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{question.type}</Badge>
                    <Badge variant="secondary">{question.totalAnswers} {language === 'ar' ? 'إجابة' : 'answers'}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(question.type === "likert" || question.type === "mcq" || question.type === "rating") && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={question.data}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip />
                        <Bar dataKey="value" fill="#8884d8">
                          {question.data.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {question.data.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{item.value}</span>
                            <span className="text-muted-foreground ml-1">({question.totalAnswers > 0 ? ((item.value / question.totalAnswers) * 100).toFixed(1) : 0}%)</span>
                          </div>
                        </div>
                      ))}
                      {(question.type === "likert" || question.type === "rating") && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium">{language === 'ar' ? 'المتوسط:' : 'Mean:'} {question.average?.toFixed(2)} {language === 'ar' ? 'من 5' : 'out of 5'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {question.type === "text" && (
                  <div className="space-y-3">
                    <p className="font-medium">{language === 'ar' ? 'عينة من الإجابات:' : 'Sample answers:'}</p>
                    <div className="grid gap-3">
                      {question.data.slice(0, 5).map((answer: string, index: number) => (
                        <div key={index} className="p-3 bg-secondary/10 rounded-lg"><p className="text-sm">{answer}</p></div>
                      ))}
                    </div>
                    {question.data.length > 5 && (
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? `و ${question.data.length - 5} إجابة أخرى...` : `and ${question.data.length - 5} more answers...`}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'التوزيع الديموغرافي' : 'Demographic Distribution'}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={analytics.demographicData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {analytics.demographicData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {analytics.demographicData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'اتجاهات الاستجابة' : 'Response Trends'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.responsesByDate}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip />
                  <Line type="monotone" dataKey="responses" stroke="#8884d8" strokeWidth={2} dot={{ fill: "#8884d8" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurveyAnalytics;
