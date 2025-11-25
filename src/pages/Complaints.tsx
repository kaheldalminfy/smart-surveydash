import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  User,
  Calendar,
  FileText,
  Eye,
  QrCode,
  Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Complaint {
  id: string;
  subject: string;
  description: string;
  type: string;
  complaint_category?: string;
  status: string;
  student_name?: string;
  student_email?: string;
  student_id?: string;
  complainant_type?: string;
  complainant_id?: string;
  complainant_academic_id?: string;
  complainant_job_id?: string;
  semester?: string;
  academic_year?: string;
  created_at: string;
  updated_at?: string;
  program_id?: string;
  programs?: { name: string };
  attachments?: any;
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
}

const Complaints = () => {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewComplaintDialog, setShowNewComplaintDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [newComplaint, setNewComplaint] = useState({
    title: "",
    description: "",
    category: "academic",
    priority: "medium",
    program_id: "",
  });

  useEffect(() => {
    loadComplaints();
    loadPrograms();
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    const complaintUrl = `${window.location.origin}/submit-complaint`;
    try {
      const QRCode = (await import('qrcode')).default;
      const qrData = await QRCode.toDataURL(complaintUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeData(qrData);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyComplaintLink = () => {
    const complaintUrl = `${window.location.origin}/submit-complaint`;
    navigator.clipboard.writeText(complaintUrl);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رابط تقديم الشكوى",
    });
  };

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select(`
          *,
          programs (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الشكاوى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*").order("name");
    if (data) setPrograms(data);
  };

  const handleSubmitComplaint = async () => {
    if (!newComplaint.title || !newComplaint.description) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال العنوان والوصف",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("المستخدم غير مسجل الدخول");

      const { error } = await supabase.from("complaints").insert({
        ...newComplaint,
        submitted_by: user.id,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "تم إرسال الشكوى",
        description: "تم إرسال شكواك بنجاح وسيتم مراجعتها قريباً",
      });

      setNewComplaint({
        title: "",
        description: "",
        category: "academic",
        priority: "medium",
        program_id: "",
      });
      setShowNewComplaintDialog(false);
      loadComplaints();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال الشكوى",
        variant: "destructive",
      });
    }
  };

  const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", complaintId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الشكوى بنجاح",
      });

      loadComplaints();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الشكوى",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "قيد المراجعة", variant: "secondary" as const, icon: Clock },
      in_progress: { label: "قيد المعالجة", variant: "default" as const, icon: MessageSquare },
      resolved: { label: "تم الحل", variant: "default" as const, icon: CheckCircle },
      closed: { label: "مغلقة", variant: "outline" as const, icon: CheckCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: "منخفضة", variant: "outline" as const, color: "text-green-600" },
      medium: { label: "متوسطة", variant: "secondary" as const, color: "text-yellow-600" },
      high: { label: "عالية", variant: "destructive" as const, color: "text-red-600" },
      urgent: { label: "عاجلة", variant: "destructive" as const, color: "text-red-800" },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      academic: "أكاديمي",
      administrative: "إداري",
      technical: "تقني",
      facility: "مرافق",
      other: "أخرى",
    };
    return categories[category as keyof typeof categories] || category;
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getComplaintStats = () => {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === "pending").length;
    const inProgress = complaints.filter(c => c.status === "in_progress").length;
    const resolved = complaints.filter(c => c.status === "resolved").length;
    
    return { total, pending, inProgress, resolved };
  };

  const stats = getComplaintStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة الشكاوى</h1>
          <p className="text-muted-foreground">متابعة ومعالجة شكاوى الطلاب والموظفين</p>
        </div>
        <Dialog open={showNewComplaintDialog} onOpenChange={setShowNewComplaintDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              شكوى جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تقديم شكوى جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان الشكوى</Label>
                <Input
                  id="title"
                  placeholder="اكتب عنواناً واضحاً للشكوى"
                  value={newComplaint.title}
                  onChange={(e) => setNewComplaint({...newComplaint, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">الفئة</Label>
                  <select
                    id="category"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={newComplaint.category}
                    onChange={(e) => setNewComplaint({...newComplaint, category: e.target.value})}
                  >
                    <option value="academic">أكاديمي</option>
                    <option value="administrative">إداري</option>
                    <option value="technical">تقني</option>
                    <option value="facility">مرافق</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="priority">الأولوية</Label>
                  <select
                    id="priority"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={newComplaint.priority}
                    onChange={(e) => setNewComplaint({...newComplaint, priority: e.target.value})}
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="program">البرنامج (اختياري)</Label>
                <select
                  id="program"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={newComplaint.program_id}
                  onChange={(e) => setNewComplaint({...newComplaint, program_id: e.target.value})}
                >
                  <option value="">اختر البرنامج</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description">وصف الشكوى</Label>
                <Textarea
                  id="description"
                  placeholder="اشرح تفاصيل الشكوى بوضوح..."
                  rows={6}
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({...newComplaint, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewComplaintDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSubmitComplaint}>
                  إرسال الشكوى
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الشكاوى</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">قيد المراجعة</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">قيد المعالجة</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">تم الحل</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            رمز QR لتقديم الشكاوى
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              {qrCodeData && (
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = 'complaint-qr-code.png';
                  link.href = qrCodeData;
                  link.click();
                }}
                className="w-full"
              >
                تحميل رمز QR
              </Button>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">رابط تقديم الشكوى</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  يمكن للطلاب وأعضاء هيئة التدريس تقديم شكاواهم مباشرة عبر مسح رمز QR أو استخدام الرابط أدناه
                </p>
              </div>
              <div className="bg-background p-4 rounded-lg border">
                <p className="text-sm break-all">{`${window.location.origin}/submit-complaint`}</p>
              </div>
              <Button
                variant="outline"
                onClick={copyComplaintLink}
                className="w-full"
              >
                <Copy className="h-4 w-4 ml-2" />
                نسخ الرابط
              </Button>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>💡 <strong>نصائح:</strong></p>
                <ul className="mr-6 space-y-1">
                  <li>• اطبع رمز QR وضعه في أماكن مرئية بالكلية</li>
                  <li>• شارك الرابط عبر البريد الإلكتروني أو الواتساب</li>
                  <li>• الرابط لا يتطلب تسجيل دخول</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الشكاوى..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              className="rounded-md border border-input bg-background px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="in_progress">قيد المعالجة</option>
              <option value="resolved">تم الحل</option>
              <option value="closed">مغلقة</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      <div className="space-y-4">
        {filteredComplaints.map((complaint) => (
          <Card key={complaint.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{complaint.subject}</h3>
                    {getStatusBadge(complaint.status)}
                    <Badge variant="outline">{getCategoryLabel(complaint.type)}</Badge>
                  </div>
                  
                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {complaint.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{complaint.student_name || complaint.student_email || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(complaint.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    {complaint.programs && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{complaint.programs.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {complaint.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateComplaintStatus(complaint.id, "in_progress")}
                    >
                      بدء المعالجة
                    </Button>
                  )}
                  
                  {complaint.status === "in_progress" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateComplaintStatus(complaint.id, "resolved")}
                    >
                      تم الحل
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredComplaints.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد شكاوى</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "لا توجد شكاوى تطابق معايير البحث"
                  : "لم يتم تقديم أي شكاوى بعد"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Complaint Details Dialog */}
      {selectedComplaint && (
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                تفاصيل الشكوى
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedComplaint.status)}
                <Badge variant="outline">{getCategoryLabel(selectedComplaint.type)}</Badge>
                {selectedComplaint.complainant_type && (
                  <Badge variant="secondary">{selectedComplaint.complainant_type}</Badge>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">{selectedComplaint.subject}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">مقدم الشكوى:</span>
                  <p>{selectedComplaint.student_name || "غير محدد"}</p>
                </div>
                <div>
                  <span className="font-medium">البريد الإلكتروني:</span>
                  <p>{selectedComplaint.student_email || "غير محدد"}</p>
                </div>
                <div>
                  <span className="font-medium">البرنامج:</span>
                  <p>{selectedComplaint.programs?.name || "غير محدد"}</p>
                </div>
                <div>
                  <span className="font-medium">تاريخ التقديم:</span>
                  <p>{new Date(selectedComplaint.created_at).toLocaleDateString('ar-SA')}</p>
                </div>
                <div>
                  <span className="font-medium">آخر تحديث:</span>
                  <p>{selectedComplaint.updated_at ? new Date(selectedComplaint.updated_at).toLocaleDateString('ar-SA') : "لا يوجد"}</p>
                </div>
                {selectedComplaint.semester && (
                  <div>
                    <span className="font-medium">الفصل الدراسي:</span>
                    <p>{selectedComplaint.semester}</p>
                  </div>
                )}
                {selectedComplaint.academic_year && (
                  <div>
                    <span className="font-medium">السنة الأكاديمية:</span>
                    <p>{selectedComplaint.academic_year}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                  إغلاق
                </Button>
                {selectedComplaint.status !== "resolved" && selectedComplaint.status !== "closed" && (
                  <Button onClick={() => {
                    const newStatus = selectedComplaint.status === "pending" ? "in_progress" : "resolved";
                    updateComplaintStatus(selectedComplaint.id, newStatus);
                    setSelectedComplaint(null);
                  }}>
                    {selectedComplaint.status === "pending" ? "بدء المعالجة" : "تم الحل"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Complaints;
