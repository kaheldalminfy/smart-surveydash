import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Plus, TrendingUp, Users, ClipboardList, AlertCircle, CheckCircle2, Archive } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { label: "الاستبيانات النشطة", value: "12", icon: FileText, color: "text-primary" },
    { label: "إجمالي الاستجابات", value: "847", icon: Users, color: "text-secondary" },
    { label: "معدل الاستجابة", value: "78%", icon: TrendingUp, color: "text-accent" },
    { label: "التقارير الجاهزة", value: "8", icon: BarChart3, color: "text-muted-foreground" },
  ];

  const recentSurveys = [
    { id: 1, title: "تقييم جودة المقرر - القانون التجاري", responses: 45, total: 60, status: "نشط" },
    { id: 2, title: "رضا الطلاب - برنامج التسويق", responses: 123, total: 150, status: "نشط" },
    { id: 3, title: "تقييم أعضاء هيئة التدريس", responses: 89, total: 100, status: "قريب الإنتهاء" },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground">منظومة الاستبيانات الذكية</p>
            </div>
          </div>
          <Link to="/surveys/new">
            <Button variant="hero" size="lg">
              <Plus className="h-5 w-5 ml-2" />
              استبيان جديد
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover-scale">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>الاستبيانات الأخيرة</CardTitle>
              <CardDescription>الاستبيانات النشطة وحالة الاستجابات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSurveys.map((survey) => (
                  <div key={survey.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{survey.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{survey.responses} / {survey.total} استجابة</span>
                        <span>•</span>
                        <Badge variant={survey.status === "نشط" ? "default" : "secondary"}>
                          {survey.status}
                        </Badge>
                      </div>
                    </div>
                    <Link to={`/surveys/${survey.id}`}>
                      <Button variant="outline" size="sm">عرض</Button>
                    </Link>
                  </div>
                ))}
              </div>
              <Link to="/surveys" className="block mt-4">
                <Button variant="ghost" className="w-full">عرض جميع الاستبيانات</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإجراءات السريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/surveys/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء استبيان جديد
                </Button>
              </Link>
              <Link to="/surveys">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 ml-2" />
                  إدارة الاستبيانات
                </Button>
              </Link>
              <Link to="/complaints">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="h-4 w-4 ml-2" />
                  إدارة الشكاوى
                </Button>
              </Link>
              <Link to="/recommendations">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  متابعة التوصيات
                </Button>
              </Link>
              <Link to="/archives">
                <Button variant="outline" className="w-full justify-start">
                  <Archive className="h-4 w-4 ml-2" />
                  الأرشيف الفصلي
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
