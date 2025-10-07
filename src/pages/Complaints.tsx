import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Complaints() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [formData, setFormData] = useState<{
    program_id: string;
    student_name: string;
    student_email: string;
    type: "academic" | "administrative" | "technical" | "other";
    subject: string;
    description: string;
  }>({
    program_id: "",
    student_name: "",
    student_email: "",
    type: "academic",
    subject: "",
    description: "",
  });

  useEffect(() => {
    loadPrograms();
    loadComplaints();
  }, []);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*");
    if (data) setPrograms(data);
  };

  const loadComplaints = async () => {
    const { data } = await supabase
      .from("complaints")
      .select(`
        *,
        programs(name)
      `)
      .order("created_at", { ascending: false });
    if (data) setComplaints(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("complaints").insert([
      {
        ...formData,
        semester: "خريف 2025",
        academic_year: "2025-2026",
      },
    ]);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل إرسال الشكوى",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم بنجاح",
        description: "تم إرسال الشكوى بنجاح",
      });
      setShowForm(false);
      setFormData({
        program_id: "",
        student_name: "",
        student_email: "",
        type: "academic",
        subject: "",
        description: "",
      });
      loadComplaints();
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      resolved: "bg-green-500",
      closed: "bg-gray-500",
    };
    const labels: any = {
      pending: "قيد الانتظار",
      in_progress: "قيد المعالجة",
      resolved: "تم الحل",
      closed: "مغلق",
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const labels: any = {
      academic: "أكاديمية",
      administrative: "إدارية",
      technical: "فنية",
      other: "أخرى",
    };
    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">إدارة الشكاوى</h1>
            <p className="text-muted-foreground">استقبال ومتابعة شكاوى الطلاب</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              العودة للوحة القيادة
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="ml-2 h-5 w-5" />
              شكوى جديدة
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-bold">{complaints.filter(c => c.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold">{complaints.filter(c => c.status === 'in_progress').length}</p>
                <p className="text-sm text-muted-foreground">قيد المعالجة</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold">{complaints.filter(c => c.status === 'resolved').length}</p>
                <p className="text-sm text-muted-foreground">تم الحل</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                <p className="text-3xl font-bold">{complaints.length}</p>
                <p className="text-sm text-muted-foreground">إجمالي الشكاوى</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>تقديم شكوى جديدة</CardTitle>
              <CardDescription>املأ النموذج أدناه لتقديم شكوى</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الاسم</Label>
                    <Input
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={formData.student_email}
                      onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>البرنامج</Label>
                    <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر البرنامج" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الشكوى</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(v: "academic" | "administrative" | "technical" | "other") => 
                        setFormData({ ...formData, type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">أكاديمية</SelectItem>
                        <SelectItem value="administrative">إدارية</SelectItem>
                        <SelectItem value="technical">فنية</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>الموضوع</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? "جاري الإرسال..." : "إرسال الشكوى"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Complaints List */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الشكاوى</CardTitle>
            <CardDescription>عرض جميع الشكاوى المقدمة</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>البرنامج</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>{new Date(complaint.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{complaint.student_name}</TableCell>
                    <TableCell>{complaint.programs?.name}</TableCell>
                    <TableCell>{getTypeBadge(complaint.type)}</TableCell>
                    <TableCell>{complaint.subject}</TableCell>
                    <TableCell>{getStatusBadge(complaint.status)}</TableCell>
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
