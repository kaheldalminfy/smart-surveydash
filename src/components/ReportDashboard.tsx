import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, RadialBarChart, RadialBar } from "recharts";
import { TrendingUp, TrendingDown, Minus, MessageSquare, ListChecks, Star, BarChart3, Users, Target } from "lucide-react";

interface QuestionData {
  id: string;
  text: string;
  type: string;
  answers: any[];
  distribution: any[];
  mcqDistribution: any[];
  textResponses: string[];
  mean: string;
  stdDev: string;
  responseCount: number;
  options?: string[];
}

interface ReportDashboardProps {
  detailedAnswers: QuestionData[];
  totalResponses: number;
  surveyTitle: string;
  programName: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
const MCQ_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#84cc16'];

const getMeanLevel = (mean: number) => {
  if (mean >= 4.5) return { label: 'ممتاز', color: 'bg-green-500', icon: TrendingUp };
  if (mean >= 3.5) return { label: 'جيد جداً', color: 'bg-green-400', icon: TrendingUp };
  if (mean >= 2.5) return { label: 'متوسط', color: 'bg-yellow-500', icon: Minus };
  if (mean >= 1.5) return { label: 'ضعيف', color: 'bg-orange-500', icon: TrendingDown };
  return { label: 'ضعيف جداً', color: 'bg-red-500', icon: TrendingDown };
};

export const ReportDashboard = ({ detailedAnswers, totalResponses, surveyTitle, programName }: ReportDashboardProps) => {
  // Calculate overall statistics
  const likertRatingQuestions = detailedAnswers.filter(q => q.type === 'likert' || q.type === 'rating');
  const mcqQuestions = detailedAnswers.filter(q => q.type === 'mcq');
  const textQuestions = detailedAnswers.filter(q => q.type === 'text');

  const overallMean = likertRatingQuestions.length > 0
    ? likertRatingQuestions.reduce((sum, q) => sum + (parseFloat(q.mean) || 0), 0) / likertRatingQuestions.length
    : 0;

  const overallStdDev = likertRatingQuestions.length > 0
    ? likertRatingQuestions.reduce((sum, q) => sum + (parseFloat(q.stdDev) || 0), 0) / likertRatingQuestions.length
    : 0;

  const totalTextResponses = textQuestions.reduce((sum, q) => sum + q.textResponses.length, 0);

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الاستجابات</p>
                <p className="text-3xl font-bold text-blue-600">{totalResponses}</p>
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

      {/* Questions Analysis */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          تحليل كل سؤال
        </h2>

        {detailedAnswers.map((question, index) => (
          <Card key={question.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-sm">سؤال {index + 1}</Badge>
                    <Badge variant="outline">
                      {question.type === 'likert' ? 'مقياس ليكرت' :
                       question.type === 'rating' ? 'تقييم' :
                       question.type === 'mcq' ? 'اختيار متعدد' : 'نص حر'}
                    </Badge>
                    <Badge variant="secondary">{question.responseCount} استجابة</Badge>
                  </div>
                  <CardTitle className="text-lg">{question.text}</CardTitle>
                </div>

                {/* Mean Badge for Likert/Rating */}
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
              {/* Likert/Rating Question */}
              {(question.type === 'likert' || question.type === 'rating') && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
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

                    {/* Pie Chart */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground">النسب المئوية</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={question.distribution.filter((d: any) => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {question.distribution.map((entry: any, i: number) => (
                                <Cell key={`cell-${i}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Stats Summary */}
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

                  {/* Detailed Table */}
                  <div className="pt-4">
                    <h4 className="font-medium mb-3 text-sm text-muted-foreground">تفاصيل الاستجابات</h4>
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right w-20 sticky top-0 bg-card">#</TableHead>
                            <TableHead className="text-right sticky top-0 bg-card">التقييم</TableHead>
                            <TableHead className="text-right w-24 sticky top-0 bg-card">القيمة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {question.answers.slice(0, 10).map((answer: any, i: number) => (
                            <TableRow key={answer.id}>
                              <TableCell>
                                <Badge variant="outline">{i + 1}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${star <= (answer.numeric_value || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                                    />
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={answer.numeric_value >= 4 ? 'default' : answer.numeric_value === 3 ? 'secondary' : 'destructive'}>
                                  {answer.numeric_value}/5
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {question.answers.length > 10 && (
                        <p className="text-center text-sm text-muted-foreground py-2 bg-muted/20">
                          +{question.answers.length - 10} استجابة أخرى
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MCQ Question */}
              {question.type === 'mcq' && (
                <div className="space-y-6">
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
                </div>
              )}

              {/* Text Question */}
              {question.type === 'text' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">الردود النصية ({question.textResponses.length})</h4>
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

      {/* Overall Summary */}
      {likertRatingQuestions.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6" />
              الملخص العام للتقييمات
            </CardTitle>
            <CardDescription>متوسط جميع أسئلة مقياس ليكرت والتقييم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-card rounded-xl shadow-sm">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${getMeanLevel(overallMean).color} text-white mb-3`}>
                  <span className="text-2xl font-bold">{overallMean.toFixed(2)}</span>
                </div>
                <p className="font-medium">المتوسط العام</p>
                <p className="text-sm text-muted-foreground">{getMeanLevel(overallMean).label}</p>
              </div>

              <div className="text-center p-6 bg-card rounded-xl shadow-sm">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-blue-500 text-white mb-3">
                  <span className="text-2xl font-bold">{overallStdDev.toFixed(2)}</span>
                </div>
                <p className="font-medium">الانحراف المعياري</p>
                <p className="text-sm text-muted-foreground">تجانس الاستجابات</p>
              </div>

              <div className="text-center p-6 bg-card rounded-xl shadow-sm">
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-purple-500 text-white mb-3">
                  <span className="text-2xl font-bold">{likertRatingQuestions.length}</span>
                </div>
                <p className="font-medium">عدد أسئلة التقييم</p>
                <p className="text-sm text-muted-foreground">مقياس ليكرت + تقييم</p>
              </div>
            </div>

            {/* Questions Overview Chart */}
            <div className="mt-8">
              <h4 className="font-medium mb-4">مقارنة متوسطات جميع الأسئلة</h4>
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
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis type="category" dataKey="name" width={50} />
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
                    <Bar dataKey="mean" radius={[0, 4, 4, 0]}>
                      {likertRatingQuestions.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={`hsl(${210 + i * 15}, 70%, 50%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportDashboard;
