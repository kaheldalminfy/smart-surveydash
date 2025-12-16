import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";

const Recommendations = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    completionRate: 0,
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    program_id: "",
    priority: "medium",
    status: "pending",
    source_type: "survey",
    academic_year: new Date().getFullYear().toString(),
    semester: "",
  });

  useEffect(() => {
    loadRecommendations();
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*");
    if (data) setPrograms(data);
  };

  const loadRecommendations = async () => {
    const { data } = await supabase
      .from("recommendations")
      .select("*, programs(name)")
      .order("created_at", { ascending: false });

    if (data) {
      setRecommendations(data);
      const total = data.length;
      const completed = data.filter((r) => r.status === "completed").length;
      const inProgress = data.filter((r) => r.status === "in_progress").length;
      const pending = data.filter((r) => r.status === "pending").length;
      
      setStats({
        total,
        completed,
        inProgress,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("recommendations")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "تم تحديث التوصية بنجاح" });
      } else {
        const { error } = await supabase.from("recommendations").insert(formData);
        if (error) throw error;
        toast({ title: "تم إضافة التوصية بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadRecommendations();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التوصية",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rec: any) => {
    setFormData({
      title: rec.title,
      description: rec.description,
      program_id: rec.program_id,
      priority: rec.priority,
      status: rec.status,
      source_type: rec.source_type,
      academic_year: rec.academic_year,
      semester: rec.semester,
    });
    setEditingId(rec.id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      program_id: "",
      priority: "medium",
      status: "pending",
      source_type: "survey",
      academic_year: new Date().getFullYear().toString(),
      semester: "",
    });
    setEditingId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "معلقة", variant: "secondary" as const },
      in_progress: { label: "قيد التنفيذ", variant: "default" as const },
      completed: { label: "مكتملة", variant: "default" as const },
    };
    const s = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: "منخفضة", variant: "outline" as const },
      medium: { label: "متوسطة", variant: "secondary" as const },
      high: { label: "عالية", variant: "destructive" as const },
    };
    const p = priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium;
    return <Badge variant={p.variant}>{p.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DashboardButton />
              <div>
                <h1 className="text-2xl font-bold">إدارة التوصيات</h1>
                <p className="text-sm text-muted-foreground">
                  متابعة وتنفيذ التوصيات التحسينية
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة توصية
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "تعديل التوصية" : "إضافة توصية جديدة"}</DialogTitle>
                  <DialogDescription>
                    {editingId ? "قم بتعديل بيانات التوصية" : "أضف توصية تحسينية جديدة"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">عنوان التوصية *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">التفاصيل *</Label>
                    <Textarea
                      id="description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="program_id">البرنامج *</Label>
                      <Select
                        value={formData.program_id}
                        onValueChange={(value) => setFormData({ ...formData, program_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر البرنامج" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">الأولوية *</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">منخفضة</SelectItem>
                          <SelectItem value="medium">متوسطة</SelectItem>
                          <SelectItem value="high">عالية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">الحالة *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">معلقة</SelectItem>
                          <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                          <SelectItem value="completed">مكتملة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source_type">المصدر *</Label>
                      <Select
                        value={formData.source_type}
                        onValueChange={(value) => setFormData({ ...formData, source_type: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="survey">استبيان</SelectItem>
                          <SelectItem value="complaint">شكوى</SelectItem>
                          <SelectItem value="manual">يدوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academic_year">السنة الأكاديمية *</Label>
                      <Input
                        id="academic_year"
                        required
                        value={formData.academic_year}
                        onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester">الفصل الدراسي *</Label>
                      <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفصل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">الأول</SelectItem>
                          <SelectItem value="second">الثاني</SelectItem>
                          <SelectItem value="summer">الصيفي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي التوصيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                مكتملة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                قيد التنفيذ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                معلقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                معدل الإنجاز
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة التوصيات</CardTitle>
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
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      {new Date(rec.created_at).toLocaleDateString("ar-SA")}
                    </TableCell>
                    <TableCell className="font-medium">{rec.title}</TableCell>
                    <TableCell>{rec.programs?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rec.source_type === "survey" ? "استبيان" : rec.source_type === "complaint" ? "شكوى" : "يدوي"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(rec)}>
                        <Edit className="h-4 w-4 ml-2" />
                        تعديل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Recommendations;
