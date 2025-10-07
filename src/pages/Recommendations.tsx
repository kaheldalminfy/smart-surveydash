import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Recommendations() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    in_progress: 0,
    pending: 0,
    completionRate: 0,
  });

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    const { data } = await supabase
      .from("recommendations")
      .select(`
        *,
        programs(name)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setRecommendations(data);
      const total = data.length;
      const completed = data.filter((r) => r.status === "completed").length;
      const in_progress = data.filter((r) => r.status === "in_progress").length;
      const pending = data.filter((r) => r.status === "pending").length;
      setStats({
        total,
        completed,
        in_progress,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      postponed: "bg-gray-500",
    };
    const labels: any = {
      pending: "قيد الانتظار",
      in_progress: "قيد التنفيذ",
      completed: "مكتمل",
      postponed: "مؤجل",
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      low: "bg-green-600",
      medium: "bg-yellow-600",
      high: "bg-red-600",
    };
    const labels: any = {
      low: "منخفض",
      medium: "متوسط",
      high: "عالي",
    };
    return <Badge className={variants[priority]}>{labels[priority]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">متابعة التوصيات</h1>
            <p className="text-muted-foreground">إدارة ومتابعة تنفيذ التوصيات المستخرجة من الاستبيانات والشكاوى</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            العودة للوحة القيادة
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي التوصيات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">مكتملة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold">{stats.in_progress}</p>
                <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completion Rate */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>نسبة الإنجاز</CardTitle>
            <CardDescription>نسبة التوصيات المكتملة من إجمالي التوصيات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>معدل الإنجاز</span>
                <span className="font-bold">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة التوصيات</CardTitle>
            <CardDescription>عرض جميع التوصيات وحالة تنفيذها</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>البرنامج</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>{new Date(rec.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-medium">{rec.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">{rec.description}</div>
                    </TableCell>
                    <TableCell>{rec.programs?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rec.source_type === 'survey' ? 'استبيان' : 'شكوى'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
