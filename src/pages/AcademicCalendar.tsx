import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Edit, Trash2, Check } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface AcademicPeriod {
  id: string;
  academic_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

const AcademicCalendar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
  const [formData, setFormData] = useState({
    academic_year: "",
    semester: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    checkPermissions();
    loadPeriods();
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    const isCoordinator = roles?.some(r => r.role === "coordinator");
    
    if (!isAdmin && !isCoordinator) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setCanManage(true);
  };

  const loadPeriods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("academic_year", { ascending: false })
      .order("start_date", { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل الأجندة الأكاديمية",
        variant: "destructive",
      });
    } else {
      setPeriods(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.academic_year || !formData.semester || !formData.start_date || !formData.end_date) {
      toast({
        title: "خطأ",
        description: "الرجاء تعبئة جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("academic_calendar")
      .insert({
        academic_year: formData.academic_year,
        semester: formData.semester,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_current: false,
      });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "خطأ",
          description: "هذا الفصل الدراسي موجود مسبقًا لهذه السنة الأكاديمية",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: "فشل إضافة الفصل الدراسي",
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "تمت الإضافة",
      description: "تم إضافة الفصل الدراسي بنجاح",
    });
    
    setShowAddDialog(false);
    setFormData({ academic_year: "", semester: "", start_date: "", end_date: "" });
    loadPeriods();
  };

  const handleEdit = async () => {
    if (!selectedPeriod || !formData.academic_year || !formData.semester || !formData.start_date || !formData.end_date) {
      toast({
        title: "خطأ",
        description: "الرجاء تعبئة جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("academic_calendar")
      .update({
        academic_year: formData.academic_year,
        semester: formData.semester,
        start_date: formData.start_date,
        end_date: formData.end_date,
      })
      .eq("id", selectedPeriod.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث الفصل الدراسي",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم التحديث",
      description: "تم تحديث الفصل الدراسي بنجاح",
    });
    
    setShowEditDialog(false);
    setSelectedPeriod(null);
    setFormData({ academic_year: "", semester: "", start_date: "", end_date: "" });
    loadPeriods();
  };

  const handleDelete = async () => {
    if (!selectedPeriod) return;

    const { error } = await supabase
      .from("academic_calendar")
      .delete()
      .eq("id", selectedPeriod.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف الفصل الدراسي",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الحذف",
      description: "تم حذف الفصل الدراسي بنجاح",
    });
    
    setShowDeleteDialog(false);
    setSelectedPeriod(null);
    loadPeriods();
  };

  const handleSetCurrent = async (period: AcademicPeriod) => {
    // First, unset all current
    await supabase
      .from("academic_calendar")
      .update({ is_current: false })
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

    // Then set the selected one as current
    const { error } = await supabase
      .from("academic_calendar")
      .update({ is_current: true })
      .eq("id", period.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث الفصل الدراسي الحالي",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم التحديث",
      description: "تم تعيين الفصل الدراسي الحالي بنجاح",
    });
    
    loadPeriods();
  };

  const openEditDialog = (period: AcademicPeriod) => {
    setSelectedPeriod(period);
    setFormData({
      academic_year: period.academic_year,
      semester: period.semester,
      start_date: period.start_date,
      end_date: period.end_date,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (period: AcademicPeriod) => {
    setSelectedPeriod(period);
    setShowDeleteDialog(true);
  };

  // Predefined semesters
  const semesterOptions = [
    "الفصل الأول",
    "الفصل الثاني",
    "الفصل الصيفي",
  ];

  // Generate academic year options
  const currentYear = new Date().getFullYear();
  const academicYearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i;
    return `${year}-${year + 1}`;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canManage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DashboardButton />
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  الأجندة الأكاديمية
                </h1>
                <p className="text-muted-foreground">إدارة الفصول الدراسية والسنوات الأكاديمية</p>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة فصل دراسي
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة فصل دراسي جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>السنة الأكاديمية</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    >
                      <option value="">اختر السنة الأكاديمية</option>
                      {academicYearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>الفصل الدراسي</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    >
                      <option value="">اختر الفصل الدراسي</option>
                      {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>{sem}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>تاريخ البداية</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>تاريخ النهاية</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleAdd}>
                      إضافة
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>الفصول الدراسية</CardTitle>
            <CardDescription>قائمة بجميع الفصول الدراسية والسنوات الأكاديمية المسجلة</CardDescription>
          </CardHeader>
          <CardContent>
            {periods.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد فصول دراسية مسجلة</p>
                <p className="text-sm">قم بإضافة فصل دراسي جديد للبدء</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">السنة الأكاديمية</TableHead>
                    <TableHead className="text-right">الفصل الدراسي</TableHead>
                    <TableHead className="text-right">تاريخ البداية</TableHead>
                    <TableHead className="text-right">تاريخ النهاية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.academic_year}</TableCell>
                      <TableCell>{period.semester}</TableCell>
                      <TableCell>
                        {format(new Date(period.start_date), "dd/MM/yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(period.end_date), "dd/MM/yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {period.is_current ? (
                          <Badge className="bg-green-600">الفصل الحالي</Badge>
                        ) : (
                          <Badge variant="outline">غير نشط</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!period.is_current && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetCurrent(period)}
                              title="تعيين كفصل حالي"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(period)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(period)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الفصل الدراسي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>السنة الأكاديمية</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              >
                <option value="">اختر السنة الأكاديمية</option>
                {academicYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>الفصل الدراسي</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                <option value="">اختر الفصل الدراسي</option>
                {semesterOptions.map((sem) => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>تاريخ البداية</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>تاريخ النهاية</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEdit}>
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفصل الدراسي "{selectedPeriod?.semester}" للسنة "{selectedPeriod?.academic_year}"؟
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AcademicCalendar;
