import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SurveyAnalyticsProps {
  surveyId: string;
}

interface AnalyticsData {
  totalResponses: number;
  completionRate: number;
  averageTime: number;
  responsesByDate: any[];
  questionAnalytics: any[];
  demographicData: any[];
}

const SurveyAnalytics = ({ surveyId }: SurveyAnalyticsProps) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");

  useEffect(() => {
    loadAnalytics();
  }, [surveyId, selectedTimeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load survey responses
      const { data: responses, error: responsesError } = await supabase
        .from("responses")
        .select(`
          *,
          answers (
            *,
            questions (*)
          )
        `)
        .eq("survey_id", surveyId);

      if (responsesError) throw responsesError;

      // Load survey questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index");

      if (questionsError) throw questionsError;

      // Process analytics data
      const processedData = processAnalyticsData(responses || [], questions || []);
      setAnalytics(processedData);

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات التحليل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (responses: any[], questions: any[]): AnalyticsData => {
    const totalResponses = responses.length;
    const completedResponses = responses.filter(r => r.is_complete).length;
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;
    
    const averageTime = responses.reduce((sum, r) => sum + (r.completion_time || 0), 0) / totalResponses || 0;

    // Responses by date
    const responsesByDate = processResponsesByDate(responses);

    // Question analytics
    const questionAnalytics = processQuestionAnalytics(responses, questions);

    // Demographic data (placeholder)
    const demographicData = [
      { name: "برنامج القانون", value: 45, color: "#8884d8" },
      { name: "برنامج إدارة الأعمال", value: 30, color: "#82ca9d" },
      { name: "برنامج التسويق", value: 25, color: "#ffc658" },
    ];

    return {
      totalResponses,
      completionRate,
      averageTime,
      responsesByDate,
      questionAnalytics,
      demographicData,
    };
  };

  const processResponsesByDate = (responses: any[]) => {
    const dateMap = new Map();
    
    responses.forEach(response => {
      const date = new Date(response.submitted_at).toLocaleDateString('ar-SA');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      responses: count,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const processQuestionAnalytics = (responses: any[], questions: any[]) => {
    return questions.map(question => {
      const questionAnswers = responses.flatMap(r => 
        r.answers?.filter((a: any) => a.question_id === question.id) || []
      );

      if (question.type === "likert") {
        const likertData = [
          { label: "غير موافق بشدة", value: 0, color: "#ef4444" },
          { label: "غير موافق", value: 0, color: "#f97316" },
          { label: "محايد", value: 0, color: "#eab308" },
          { label: "موافق", value: 0, color: "#22c55e" },
          { label: "موافق بشدة", value: 0, color: "#16a34a" },
        ];

        questionAnswers.forEach(answer => {
          const value = parseInt(answer.answer_value) - 1;
          if (value >= 0 && value < 5) {
            likertData[value].value++;
          }
        });

        return {
          id: question.id,
          text: question.text,
          type: question.type,
          data: likertData,
          totalAnswers: questionAnswers.length,
          average: likertData.reduce((sum, item, index) => sum + (item.value * (index + 1)), 0) / questionAnswers.length || 0,
        };
      }

      if (question.type === "mcq") {
        const optionCounts = new Map();
        const options = question.options?.choices || [];
        
        options.forEach((option: string) => {
          optionCounts.set(option, 0);
        });

        questionAnswers.forEach(answer => {
          const value = answer.answer_value;
          if (optionCounts.has(value)) {
            optionCounts.set(value, optionCounts.get(value) + 1);
          }
        });

        const mcqData = Array.from(optionCounts.entries()).map(([option, count], index) => ({
          label: option,
          value: count,
          color: `hsl(${index * 60}, 70%, 50%)`,
        }));

        return {
          id: question.id,
          text: question.text,
          type: question.type,
          data: mcqData,
          totalAnswers: questionAnswers.length,
        };
      }

      if (question.type === "rating") {
        const ratingData = [1, 2, 3, 4, 5].map(rating => ({
          label: `${rating} نجوم`,
          value: questionAnswers.filter(a => parseInt(a.answer_value) === rating).length,
          color: `hsl(${rating * 60}, 70%, 50%)`,
        }));

        return {
          id: question.id,
          text: question.text,
          type: question.type,
          data: ratingData,
          totalAnswers: questionAnswers.length,
          average: questionAnswers.reduce((sum, a) => sum + parseInt(a.answer_value || 0), 0) / questionAnswers.length || 0,
        };
      }

      // Text questions
      return {
        id: question.id,
        text: question.text,
        type: question.type,
        data: questionAnswers.map(a => a.answer_value).filter(Boolean),
        totalAnswers: questionAnswers.length,
      };
    });
  };

  const exportReport = () => {
    // TODO: Implement PDF/Excel export
    toast({
      title: "قريباً",
      description: "ميزة تصدير التقارير ستكون متاحة قريباً",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">لا توجد بيانات</h3>
        <p className="text-muted-foreground">لا توجد استجابات كافية لعرض التحليل</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">تحليل الاستبيان</h2>
          <p className="text-muted-foreground">نظرة شاملة على نتائج الاستبيان</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 ml-2" />
            تصفية
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الاستجابات</p>
                <p className="text-2xl font-bold">{analytics.totalResponses}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">معدل الإكمال</p>
                <p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">متوسط الوقت</p>
                <p className="text-2xl font-bold">{Math.round(analytics.averageTime / 60)} دقيقة</p>
              </div>
              <Clock className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">النمو</p>
                <p className="text-2xl font-bold">+12%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="questions">تحليل الأسئلة</TabsTrigger>
          <TabsTrigger value="demographics">التركيبة السكانية</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Responses over time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  الاستجابات عبر الوقت
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.responsesByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="responses" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion rate by program */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  التوزيع حسب البرنامج
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.demographicData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.demographicData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
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
                    <CardTitle className="text-lg">سؤال {index + 1}</CardTitle>
                    <p className="text-muted-foreground mt-1">{question.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{question.type}</Badge>
                    <Badge variant="secondary">{question.totalAnswers} إجابة</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(question.type === "likert" || question.type === "mcq" || question.type === "rating") && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={question.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8">
                          {question.data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-3">
                      {question.data.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{item.value}</span>
                            <span className="text-muted-foreground ml-1">
                              ({question.totalAnswers > 0 ? ((item.value / question.totalAnswers) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {(question.type === "likert" || question.type === "rating") && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium">
                            المتوسط: {question.average?.toFixed(2)} من {question.type === "likert" ? "5" : "5"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {question.type === "text" && (
                  <div className="space-y-3">
                    <p className="font-medium">عينة من الإجابات:</p>
                    <div className="grid gap-3">
                      {question.data.slice(0, 5).map((answer: string, index: number) => (
                        <div key={index} className="p-3 bg-secondary/10 rounded-lg">
                          <p className="text-sm">{answer}</p>
                        </div>
                      ))}
                    </div>
                    {question.data.length > 5 && (
                      <p className="text-sm text-muted-foreground">
                        و {question.data.length - 5} إجابة أخرى...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>التوزيع الديموغرافي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.demographicData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {analytics.demographicData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  {analytics.demographicData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
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
            <CardHeader>
              <CardTitle>اتجاهات الاستجابة</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.responsesByDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="responses" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ fill: "#8884d8" }}
                  />
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
