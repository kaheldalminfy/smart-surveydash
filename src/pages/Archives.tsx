import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, Calendar, FileText, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Archives() {
  const navigate = useNavigate();
  const [archives, setArchives] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    frozen: 0,
    semesters: new Set<string>(),
  });

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    const { data } = await supabase
      .from("archives")
      .select(`
        *,
        programs(name)
      `)
      .order("archived_at", { ascending: false });

    if (data) {
      setArchives(data);
      const semesters = new Set(data.map((a) => `${a.semester} ${a.academic_year}`));
      setStats({
        total: data.length,
        frozen: data.filter((a) => a.is_frozen).length,
        semesters,
      });
    }
  };

  const getDataTypeBadge = (type: string) => {
    const labels: any = {
      survey: "استبيان",
      complaint: "شكوى",
      recommendation: "توصية",
    };
    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">الأرشيف الفصلي</h1>
            <p className="text-muted-foreground">إدارة وتحليل البيانات التاريخية عبر الفصول الدراسية</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            العودة للوحة القيادة
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Archive className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Lock className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-bold">{stats.frozen}</p>
                <p className="text-sm text-muted-foreground">مجمّد</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold">{stats.semesters.size}</p>
                <p className="text-sm text-muted-foreground">فصول دراسية</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>التحليل الزمني</CardTitle>
            <CardDescription>
              يتيح الأرشيف الفصلي تتبع التطور والتحسن في مؤشرات الأداء عبر الزمن، مما يساعد في تحديد الاتجاهات
              والمشاكل المتكررة وتقييم فعالية التوصيات المنفذة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>تجميد تلقائي في نهاية كل فصل</span>
              </div>
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                <span>حفظ آمن للبيانات التاريخية</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archives Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجلات الأرشيف</CardTitle>
            <CardDescription>عرض جميع البيانات المؤرشفة حسب الفصل الدراسي</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاريخ الأرشفة</TableHead>
                  <TableHead>الفصل الدراسي</TableHead>
                  <TableHead>السنة الأكاديمية</TableHead>
                  <TableHead>البرنامج</TableHead>
                  <TableHead>نوع البيانات</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((archive) => (
                  <TableRow key={archive.id}>
                    <TableCell>{new Date(archive.archived_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{archive.semester}</TableCell>
                    <TableCell>{archive.academic_year}</TableCell>
                    <TableCell>{archive.programs?.name || 'جميع البرامج'}</TableCell>
                    <TableCell>{getDataTypeBadge(archive.data_type)}</TableCell>
                    <TableCell>
                      {archive.is_frozen ? (
                        <Badge className="bg-yellow-500">
                          <Lock className="ml-1 h-3 w-3" />
                          مجمّد
                        </Badge>
                      ) : (
                        <Badge variant="outline">نشط</Badge>
                      )}
                    </TableCell>
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
