import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, BarChart3, Link2, QrCode, Edit, Trash2 } from "lucide-react";

const Surveys = () => {
  const surveys = [
    {
      id: 1,
      title: "تقييم جودة المقرر - القانون التجاري",
      program: "القانون",
      status: "نشط",
      responses: 45,
      total: 60,
      startDate: "2025-09-15",
      endDate: "2025-10-01",
    },
    {
      id: 2,
      title: "رضا الطلاب - برنامج التسويق",
      program: "التسويق",
      status: "نشط",
      responses: 123,
      total: 150,
      startDate: "2025-09-20",
      endDate: "2025-10-05",
    },
    {
      id: 3,
      title: "تقييم أعضاء هيئة التدريس",
      program: "إدارة الأعمال",
      status: "مكتمل",
      responses: 100,
      total: 100,
      startDate: "2025-08-01",
      endDate: "2025-08-30",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">إدارة الاستبيانات</h1>
              <p className="text-sm text-muted-foreground">عرض وإدارة جميع الاستبيانات</p>
            </div>
            <Link to="/surveys/new">
              <Button variant="hero" size="lg">
                <Plus className="h-5 w-5 ml-2" />
                استبيان جديد
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="البحث في الاستبيانات..."
              className="pr-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {surveys.map((survey) => (
            <Card key={survey.id} className="hover-scale">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{survey.title}</CardTitle>
                      <Badge variant={survey.status === "نشط" ? "default" : "secondary"}>
                        {survey.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      برنامج {survey.program} • {survey.startDate} إلى {survey.endDate}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="font-semibold">{survey.responses}</span>
                      <span className="text-muted-foreground"> / {survey.total} استجابة</span>
                    </div>
                    <div className="h-2 w-48 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(survey.responses / survey.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <QrCode className="h-4 w-4 ml-2" />
                      باركود
                    </Button>
                    <Button variant="outline" size="sm">
                      <Link2 className="h-4 w-4 ml-2" />
                      رابط
                    </Button>
                    <Link to={`/reports/${survey.id}`}>
                      <Button variant="accent" size="sm">
                        <BarChart3 className="h-4 w-4 ml-2" />
                        التقرير
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Surveys;
