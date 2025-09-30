import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Sparkles, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const Reports = () => {
  const likertData = [
    { name: "غير موافق بشدة", value: 5, color: "hsl(var(--destructive))" },
    { name: "غير موافق", value: 12, color: "hsl(var(--destructive) / 0.6)" },
    { name: "محايد", value: 23, color: "hsl(var(--muted-foreground))" },
    { name: "موافق", value: 35, color: "hsl(var(--primary) / 0.6)" },
    { name: "موافق بشدة", value: 45, color: "hsl(var(--primary))" },
  ];

  const questions = [
    { q: "وضوح أهداف المقرر", mean: 4.2, sd: 0.8 },
    { q: "جودة المحتوى العلمي", mean: 4.5, sd: 0.6 },
    { q: "فعالية طرق التدريس", mean: 4.1, sd: 0.9 },
    { q: "التقييم والمتابعة", mean: 3.9, sd: 1.0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">التقارير والتحليلات</h1>
              <p className="text-sm text-muted-foreground">
                تقييم جودة المقرر - القانون التجاري
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Sparkles className="h-4 w-4 ml-2" />
                تحليل AI
              </Button>
              <Button variant="accent">
                <Download className="h-4 w-4 ml-2" />
                تنزيل PDF
              </Button>
              <Button variant="secondary">
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                تنزيل Excel
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الاستجابات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">120</div>
              <p className="text-xs text-muted-foreground mt-1">من أصل 150 طالب</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                معدل الاستجابة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">80%</div>
              <p className="text-xs text-accent flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                +5% عن السابق
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                المتوسط العام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4.18</div>
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
              <div className="text-3xl font-bold">0.82</div>
              <p className="text-xs text-muted-foreground mt-1">تجانس جيد</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ملخص تنفيذي من AI</CardTitle>
            <CardDescription>تحليل آلي للنتائج والتوصيات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">النتائج الرئيسية:</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    يُظهر الاستبيان مستوى رضا عالٍ عن جودة المقرر بمتوسط عام 4.18 من 5. 
                    حصلت "جودة المحتوى العلمي" على أعلى تقييم (4.5)، بينما سجل "التقييم والمتابعة" 
                    أدنى متوسط (3.9). معدل الاستجابة المرتفع (80%) يعكس اهتمام الطلاب بالمشاركة.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">التوصيات:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>تحسين آليات التقييم والمتابعة الطلابية</li>
                    <li>الاستمرار في الحفاظ على جودة المحتوى العلمي</li>
                    <li>تطوير طرق التدريس التفاعلية</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع الإجابات - مثال سؤال</CardTitle>
            <CardDescription>مدى وضوح أهداف المقرر الدراسي</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={likertData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {likertData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل النتائج حسب الأسئلة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">{item.q}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>المتوسط: <Badge variant="outline">{item.mean}</Badge></span>
                      <span>الانحراف: <Badge variant="outline">{item.sd}</Badge></span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{item.mean}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;
