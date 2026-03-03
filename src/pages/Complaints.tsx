import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  Copy,
  Trash2,
  Building2,
  BarChart3,
  Printer,
  LayoutDashboard
} from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import ComplaintsStatistics from "@/components/ComplaintsStatistics";
import ComplaintsDashboard from "@/components/ComplaintsDashboard";
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

interface Program {
  id: string;
  name: string;
}

const Complaints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [academicCalendar, setAcademicCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [showNewComplaintDialog, setShowNewComplaintDialog] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [isEditingComplaint, setIsEditingComplaint] = useState(false);
  const [editComplaintData, setEditComplaintData] = useState<Partial<Complaint>>({});
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [complaintToResolve, setComplaintToResolve] = useState<{id: string, newStatus: string} | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDean, setIsDean] = useState(false);
  const [isProgramManager, setIsProgramManager] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [userProgramIds, setUserProgramIds] = useState<string[]>([]);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedDashboardProgram, setSelectedDashboardProgram] = useState<string>("all");
  const [activeStatusView, setActiveStatusView] = useState<string | null>(null);
  const [activeStatusContext, setActiveStatusContext] = useState<{type: 'all' | 'program', programId?: string} | null>(null);
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
    loadAcademicCalendar();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role, program_id")
        .eq("user_id", user.id);

      const adminStatus = userRoles?.some(r => r.role === 'admin') || false;
      const deanStatus = userRoles?.some(r => r.role === 'dean') || false;
      const programManagerStatus = userRoles?.some(r => r.role === 'program_manager') || false;
      const coordinatorStatus = userRoles?.some(r => r.role === 'coordinator') || false;
      const programIds = userRoles?.map(r => r.program_id).filter(Boolean) as string[] || [];

      // Set user role states
      setIsAdmin(adminStatus);
      setIsDean(deanStatus);
      setIsProgramManager(programManagerStatus);
      setIsCoordinator(coordinatorStatus);
      setUserProgramIds(programIds);

      let query = supabase
        .from("complaints")
        .select(`
          *,
          programs (name)
        `);

      // Filter by program:
      // - Admin and Dean see all programs
      // - Program Manager and Coordinator see only their programs
      if (!adminStatus && !deanStatus && programIds.length > 0) {
        query = query.in("program_id", programIds);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

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

  const loadAcademicCalendar = async () => {
    const { data } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("academic_year", { ascending: false })
      .order("start_date", { ascending: false });
    if (data) {
      setAcademicCalendar(data);
      // Set current semester as default if available
      const current = data.find((c: any) => c.is_current);
      if (current) {
        setSelectedAcademicYear(current.academic_year);
        setSelectedSemester(current.semester);
      }
    }
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
        subject: newComplaint.title,
        description: newComplaint.description,
        type: newComplaint.category,
        program_id: newComplaint.program_id || null,
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

  const deleteComplaint = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from("complaints")
        .delete()
        .eq("id", complaintId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الشكوى بنجاح",
      });

      loadComplaints();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الشكوى",
        variant: "destructive",
      });
    }
  };

  const updateComplaintStatus = async (complaintId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updateData.resolution_notes = notes;
        if (newStatus === 'resolved') {
          updateData.resolved_at = new Date().toISOString();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) updateData.resolved_by = user.id;
        }
      }
      
      const { error } = await supabase
        .from("complaints")
        .update(updateData)
        .eq("id", complaintId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الشكوى بنجاح",
      });

      setShowResolutionDialog(false);
      setResolutionNotes("");
      setComplaintToResolve(null);
      loadComplaints();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الشكوى",
        variant: "destructive",
      });
    }
  };

  const handleEditComplaint = async () => {
    if (!editComplaintData.id) return;
    
    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          subject: editComplaintData.subject,
          description: editComplaintData.description,
          type: editComplaintData.type,
          complaint_category: editComplaintData.complaint_category,
          updated_at: new Date().toISOString()
        })
        .eq("id", editComplaintData.id);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث الشكوى بنجاح",
      });

      setIsEditingComplaint(false);
      setSelectedComplaint(null);
      loadComplaints();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الشكوى",
        variant: "destructive",
      });
    }
  };

  const initiateStatusChange = (complaintId: string, newStatus: string) => {
    if (newStatus === 'resolved') {
      setComplaintToResolve({ id: complaintId, newStatus });
      setShowResolutionDialog(true);
    } else {
      updateComplaintStatus(complaintId, newStatus);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "جديدة", variant: "secondary" as const, icon: Clock, className: "bg-blue-100 text-blue-800 border-blue-200" },
      in_progress: { label: "قيد الإجراء", variant: "default" as const, icon: MessageSquare, className: "bg-orange-100 text-orange-800 border-orange-200" },
      resolved: { label: "تم الحل", variant: "default" as const, icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Status options for dropdown
  const statusOptions = [
    { value: "pending", label: "جديدة" },
    { value: "in_progress", label: "قيد الإجراء" },
    { value: "resolved", label: "تم الحل" },
  ];

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

  // Filter complaints based on program, status, semester and academic year
  const getFilteredComplaints = () => {
    return complaints.filter(complaint => {
      const matchesSearch = complaint.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProgram = selectedProgram === "all" || complaint.program_id === selectedProgram;
      const matchesStatus = selectedStatus === "all" || complaint.status === selectedStatus;
      const matchesSemester = selectedSemester === "all" || complaint.semester === selectedSemester;
      const matchesAcademicYear = selectedAcademicYear === "all" || complaint.academic_year === selectedAcademicYear;
      
      return matchesSearch && matchesProgram && matchesStatus && matchesSemester && matchesAcademicYear;
    });
  };

  // Generate academic years (current year + 100 years ahead)
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 101 }, (_, i) => {
    const startYear = currentYear + i;
    return `${startYear}-${startYear + 1}`;
  });
  
  // Static semester options
  const semesterOptions = ["خريف", "ربيع", "صيفي"];

  // Get complaints grouped by program
  const getComplaintsByProgram = (programId: string | null) => {
    return complaints.filter(c => c.program_id === programId);
  };

  // Get stats for a specific program
  const getProgramStats = (programId: string | null) => {
    const programComplaints = programId === null 
      ? complaints.filter(c => !c.program_id)
      : complaints.filter(c => c.program_id === programId);
    
    return {
      total: programComplaints.length,
      pending: programComplaints.filter(c => c.status === "pending").length,
      inProgress: programComplaints.filter(c => c.status === "in_progress").length,
      resolved: programComplaints.filter(c => c.status === "resolved").length,
    };
  };

  // Get overall stats
  const getOverallStats = () => {
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === "pending").length,
      inProgress: complaints.filter(c => c.status === "in_progress").length,
      resolved: complaints.filter(c => c.status === "resolved").length,
    };
  };

  const stats = getOverallStats();
  const filteredComplaints = getFilteredComplaints();

  // Check if user can manage complaints (only admin and coordinator can manage)
  const canManage = isAdmin || isCoordinator;

  // Get unique programs that have complaints
  const programsWithComplaints = programs.filter(p => 
    complaints.some(c => c.program_id === p.id)
  );

  const renderComplaintCard = (complaint: Complaint) => (
    <Card key={complaint.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold">{complaint.subject}</h3>
              {getStatusBadge(complaint.status)}
              <Badge variant="outline">{getCategoryLabel(complaint.type)}</Badge>
            </div>
            
            <p className="text-muted-foreground mb-3 line-clamp-2">
              {complaint.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{complaint.student_name || complaint.student_email || "غير محدد"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(complaint.created_at).toLocaleDateString('ar-SA')} - {new Date(complaint.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {complaint.programs && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
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
            
            {/* Status dropdown only for admin and coordinator */}
            {canManage && (
              <>
                <select
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={complaint.status}
                  onChange={(e) => initiateStatusChange(complaint.id, e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد من حذف هذه الشكوى؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف الشكوى نهائياً ولا يمكن استرجاعها.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteComplaint(complaint.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStatusSection = (status: string, label: string, icon: React.ReactNode, complaintsToShow: Complaint[]) => {
    const statusComplaints = complaintsToShow.filter(c => c.status === status);
    if (statusComplaints.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          <span>{label}</span>
          <Badge variant="secondary">{statusComplaints.length}</Badge>
        </div>
        <div className="space-y-3">
          {statusComplaints.map(renderComplaintCard)}
        </div>
      </div>
    );
  };

  // Helper function to get status info
  const getStatusInfo = (status: string) => {
    const statusMap: { [key: string]: { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string } } = {
      all: { label: "إجمالي الشكاوى", icon: <FileText className="h-8 w-8" />, color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100", borderColor: "border-blue-200" },
      pending: { label: "جديدة", icon: <Clock className="h-8 w-8" />, color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100", borderColor: "border-blue-200" },
      in_progress: { label: "قيد الإجراء", icon: <MessageSquare className="h-8 w-8" />, color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100", borderColor: "border-orange-200" },
      resolved: { label: "تم الحل", icon: <CheckCircle className="h-8 w-8" />, color: "text-green-600", bgColor: "bg-green-50 hover:bg-green-100", borderColor: "border-green-200" },
    };
    return statusMap[status] || statusMap.all;
  };

  // Render clickable stats cards
  const renderClickableStats = (complaintsData: Complaint[], context: {type: 'all' | 'program', programId?: string}) => {
    const statsData = {
      total: complaintsData.length,
      pending: complaintsData.filter(c => c.status === "pending").length,
      inProgress: complaintsData.filter(c => c.status === "in_progress").length,
      resolved: complaintsData.filter(c => c.status === "resolved").length,
    };

    const handleStatClick = (status: string) => {
      setActiveStatusView(status);
      setActiveStatusContext(context);
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${getStatusInfo('all').bgColor} ${getStatusInfo('all').borderColor} border-2 ${activeStatusView === 'all' && activeStatusContext?.type === context.type && activeStatusContext?.programId === context.programId ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleStatClick('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الشكاوى</p>
                <p className="text-2xl font-bold">{statsData.total}</p>
              </div>
              <div className={getStatusInfo('all').color}>{getStatusInfo('all').icon}</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${getStatusInfo('pending').bgColor} ${getStatusInfo('pending').borderColor} border-2 ${activeStatusView === 'pending' && activeStatusContext?.type === context.type && activeStatusContext?.programId === context.programId ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleStatClick('pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">جديدة</p>
                <p className="text-2xl font-bold">{statsData.pending}</p>
              </div>
              <div className={getStatusInfo('pending').color}>{getStatusInfo('pending').icon}</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${getStatusInfo('in_progress').bgColor} ${getStatusInfo('in_progress').borderColor} border-2 ${activeStatusView === 'in_progress' && activeStatusContext?.type === context.type && activeStatusContext?.programId === context.programId ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleStatClick('in_progress')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">قيد الإجراء</p>
                <p className="text-2xl font-bold">{statsData.inProgress}</p>
              </div>
              <div className={getStatusInfo('in_progress').color}>{getStatusInfo('in_progress').icon}</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${getStatusInfo('resolved').bgColor} ${getStatusInfo('resolved').borderColor} border-2 ${activeStatusView === 'resolved' && activeStatusContext?.type === context.type && activeStatusContext?.programId === context.programId ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleStatClick('resolved')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">تم الحل</p>
                <p className="text-2xl font-bold">{statsData.resolved}</p>
              </div>
              <div className={getStatusInfo('resolved').color}>{getStatusInfo('resolved').icon}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render status dashboard with complainant type categorization
  const renderStatusDashboard = (complaintsData: Complaint[], status: string) => {
    const filteredByStatus = status === 'all' ? complaintsData : complaintsData.filter(c => c.status === status);
    const statusInfo = getStatusInfo(status);
    
    // Group by complainant type
    const studentComplaints = filteredByStatus.filter(c => c.complainant_type === 'طالب' || c.complainant_type === 'student');
    const facultyComplaints = filteredByStatus.filter(c => c.complainant_type === 'عضو هيئة تدريس' || c.complainant_type === 'faculty');
    const employeeComplaints = filteredByStatus.filter(c => c.complainant_type === 'موظف' || c.complainant_type === 'employee');
    const otherComplaints = filteredByStatus.filter(c => !c.complainant_type || !['طالب', 'student', 'عضو هيئة تدريس', 'faculty', 'موظف', 'employee'].includes(c.complainant_type));

    return (
      <Card className="mt-4">
        <CardHeader className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-b`}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className={statusInfo.color}>{statusInfo.icon}</div>
              <span>{statusInfo.label}</span>
              <Badge variant="secondary" className="text-lg px-3 py-1">{filteredByStatus.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActiveStatusView(null)}>
              إغلاق ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="البحث في الشكاوى..." className="pl-10" />
            </div>
          </div>

          {/* Complainant Type Tabs */}
          <Tabs defaultValue="all-types" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-muted p-2">
              <TabsTrigger value="all-types" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                الكل
                <Badge variant="secondary">{filteredByStatus.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                🎓 طلاب
                <Badge variant="secondary">{studentComplaints.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="faculty" className="flex items-center gap-2">
                👨‍🏫 أعضاء هيئة التدريس
                <Badge variant="secondary">{facultyComplaints.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="employees" className="flex items-center gap-2">
                👔 موظفين
                <Badge variant="secondary">{employeeComplaints.length}</Badge>
              </TabsTrigger>
              {otherComplaints.length > 0 && (
                <TabsTrigger value="other" className="flex items-center gap-2">
                  📋 أخرى
                  <Badge variant="secondary">{otherComplaints.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all-types" className="space-y-4">
              {filteredByStatus.length > 0 ? (
                <div className="grid gap-4">
                  {filteredByStatus.map(renderComplaintCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد شكاوى
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              {studentComplaints.length > 0 ? (
                <div className="grid gap-4">
                  {studentComplaints.map(renderComplaintCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد شكاوى من الطلاب
                </div>
              )}
            </TabsContent>

            <TabsContent value="faculty" className="space-y-4">
              {facultyComplaints.length > 0 ? (
                <div className="grid gap-4">
                  {facultyComplaints.map(renderComplaintCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد شكاوى من أعضاء هيئة التدريس
                </div>
              )}
            </TabsContent>

            <TabsContent value="employees" className="space-y-4">
              {employeeComplaints.length > 0 ? (
                <div className="grid gap-4">
                  {employeeComplaints.map(renderComplaintCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد شكاوى من الموظفين
                </div>
              )}
            </TabsContent>

            {otherComplaints.length > 0 && (
              <TabsContent value="other" className="space-y-4">
                <div className="grid gap-4">
                  {otherComplaints.map(renderComplaintCard)}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    );
  };

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
        <div className="flex items-center gap-4">
          <DashboardButton />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{t('complaints.title')}</h1>
              {isAdmin && <Badge variant="default" className="bg-purple-600">مدير النظام</Badge>}
              {isDean && !isAdmin && <Badge variant="default" className="bg-blue-600">العميد</Badge>}
              {isProgramManager && !isAdmin && !isDean && <Badge variant="default" className="bg-green-600">مدير البرنامج</Badge>}
              {isCoordinator && !isAdmin && !isDean && !isProgramManager && <Badge variant="secondary">منسق البرنامج</Badge>}
            </div>
            <p className="text-muted-foreground">
              {isAdmin || isDean 
                ? "عرض جميع شكاوى الطلاب والموظفين" 
                : isProgramManager
                  ? "عرض شكاوى برنامجك (للعرض فقط)"
                  : "متابعة ومعالجة شكاوى برنامجك"}
            </p>
            {(isDean || isProgramManager) && !isAdmin && !isCoordinator && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ صلاحية العرض فقط - لا يمكنك التعديل أو الرد
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Dashboard Toggle Button */}
          <Button 
            variant={showDashboard ? "default" : "outline"} 
            onClick={() => setShowDashboard(!showDashboard)}
          >
            <LayoutDashboard className="h-4 w-4 ml-2" />
            {showDashboard ? 'إخفاء لوحة التحكم' : 'لوحة التحكم'}
          </Button>
          {/* Statistics button for all roles */}
          <Button variant="outline" onClick={() => setShowStatistics(true)}>
            <BarChart3 className="h-4 w-4 ml-2" />
            التقارير الإحصائية
          </Button>
          {/* New Complaint button only for admin and coordinator */}
          {canManage && (
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
                  <Label htmlFor="program">البرنامج</Label>
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
          )}
        </div>
      </div>

      {/* Global Stats - Clickable */}
      {renderClickableStats(complaints, { type: 'all' })}

      {/* Status Dashboard - Shows when a stat is clicked for "all" context */}
      {activeStatusView && activeStatusContext?.type === 'all' && (
        renderStatusDashboard(complaints, activeStatusView)
      )}

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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-Based Dashboard */}
      {showDashboard && (
        <ComplaintsDashboard
          complaints={complaints}
          programs={programs}
          userRole={isAdmin ? 'admin' : isDean ? 'dean' : isCoordinator ? 'coordinator' : 'program_manager'}
          userProgramIds={userProgramIds}
          selectedDashboardProgram={selectedDashboardProgram}
          onProgramChange={setSelectedDashboardProgram}
        />
      )}

      {/* Program Tabs */}
      <Tabs defaultValue={isAdmin || isDean ? "all" : (userProgramIds[0] || "all")} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-muted p-2">
          {/* Show "All Complaints" tab only for admin and dean */}
          {(isAdmin || isDean) && (
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              جميع الشكاوى
              <Badge variant="secondary" className="mr-1">{complaints.length}</Badge>
            </TabsTrigger>
          )}
          
          {/* Show program tabs - for admin/dean show all, for coordinator show only their programs */}
          {(isAdmin || isDean ? programsWithComplaints : programsWithComplaints.filter(p => userProgramIds.includes(p.id))).map(program => {
            const programStats = getProgramStats(program.id);
            return (
              <TabsTrigger key={program.id} value={program.id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {program.name}
                <Badge variant="secondary" className="mr-1">{programStats.total}</Badge>
              </TabsTrigger>
            );
          })}
          
          {/* Show "No Program" tab only for admin and dean */}
          {(isAdmin || isDean) && complaints.some(c => !c.program_id) && (
            <TabsTrigger value="no-program" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              بدون برنامج
              <Badge variant="secondary" className="mr-1">
                {complaints.filter(c => !c.program_id).length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Complaints Tab - Only for admin and dean */}
        {(isAdmin || isDean) && (
          <TabsContent value="all" className="space-y-4">
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
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                  >
                    <option value="all">جميع البرامج</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    className="rounded-md border border-input bg-background px-3 py-2"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="pending">جديدة</option>
                    <option value="in_progress">قيد الإجراء</option>
                    <option value="resolved">تم الحل</option>
                  </select>

                  <select
                    className="rounded-md border border-input bg-background px-3 py-2"
                    value={selectedAcademicYear}
                    onChange={(e) => {
                      setSelectedAcademicYear(e.target.value);
                      setSelectedSemester("all");
                    }}
                  >
                    <option value="all">جميع السنوات</option>
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    className="rounded-md border border-input bg-background px-3 py-2"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                  >
                    <option value="all">جميع الفصول</option>
                    {semesterOptions.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Status-grouped complaints */}
            <div className="space-y-6">
              {renderStatusSection("pending", "جديدة", <Clock className="h-5 w-5 text-blue-600" />, filteredComplaints)}
              {renderStatusSection("in_progress", "قيد الإجراء", <MessageSquare className="h-5 w-5 text-orange-600" />, filteredComplaints)}
              {renderStatusSection("resolved", "تم الحل", <CheckCircle className="h-5 w-5 text-green-600" />, filteredComplaints)}
            </div>

            {filteredComplaints.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد شكاوى</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedStatus !== "all" || selectedProgram !== "all"
                      ? "لا توجد شكاوى تطابق معايير البحث"
                      : "لم يتم تقديم أي شكاوى بعد"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Program-specific tabs */}
        {(isAdmin || isDean ? programsWithComplaints : programsWithComplaints.filter(p => userProgramIds.includes(p.id))).map(program => {
          const programComplaints = getComplaintsByProgram(program.id);
          
          return (
            <TabsContent key={program.id} value={program.id} className="space-y-4">
              {/* Program Stats - Clickable */}
              {renderClickableStats(programComplaints, { type: 'program', programId: program.id })}

              {/* Status Dashboard - Shows when a stat is clicked for this program */}
              {activeStatusView && activeStatusContext?.type === 'program' && activeStatusContext?.programId === program.id && (
                renderStatusDashboard(programComplaints, activeStatusView)
              )}

              {/* Default view when no stat is clicked */}
              {!(activeStatusView && activeStatusContext?.type === 'program' && activeStatusContext?.programId === program.id) && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      شكاوى برنامج {program.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      انقر على أي من الأيقونات أعلاه لعرض الشكاوى حسب الحالة مع تصنيفها حسب نوع مقدم الشكوى
                    </p>
                    {programComplaints.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        لا توجد شكاوى في هذا البرنامج
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        إجمالي الشكاوى: {programComplaints.length}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}

        {/* No Program Tab */}
        {complaints.some(c => !c.program_id) && (
          <TabsContent value="no-program" className="space-y-4">
            {complaints.filter(c => !c.program_id).map(renderComplaintCard)}
          </TabsContent>
        )}
      </Tabs>

      {/* Complaint Details Dialog */}
      {selectedComplaint && !isEditingComplaint && (
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                تفاصيل الشكوى
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
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
                  <span className="font-medium">تاريخ ووقت التقديم:</span>
                  <p className="font-mono text-sm">
                    {new Date(selectedComplaint.created_at).toLocaleDateString('ar-SA')} - {new Date(selectedComplaint.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>

              {selectedComplaint.resolution_notes && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">ملاحظات المعالجة:</h4>
                  <p className="text-green-800 whitespace-pre-wrap">{selectedComplaint.resolution_notes}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 print:hidden">
                {/* Print Button */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const printContent = `
                        <!DOCTYPE html>
                        <html dir="rtl" lang="ar">
                        <head>
                          <meta charset="UTF-8">
                          <title>تفاصيل الشكوى - ${selectedComplaint.subject}</title>
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                              font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
                              padding: 40px; 
                              direction: rtl;
                              line-height: 1.6;
                            }
                            .header { 
                              text-align: center; 
                              border-bottom: 2px solid #333; 
                              padding-bottom: 20px; 
                              margin-bottom: 30px; 
                            }
                            .header h1 { font-size: 24px; margin-bottom: 10px; }
                            .header p { color: #666; }
                            .section { margin-bottom: 25px; }
                            .section-title { 
                              font-weight: bold; 
                              font-size: 16px; 
                              color: #333; 
                              border-bottom: 1px solid #ddd;
                              padding-bottom: 8px;
                              margin-bottom: 12px;
                            }
                            .info-grid { 
                              display: grid; 
                              grid-template-columns: 1fr 1fr; 
                              gap: 15px; 
                            }
                            .info-item { margin-bottom: 10px; }
                            .info-label { font-weight: bold; color: #555; }
                            .info-value { margin-top: 4px; }
                            .status-badge {
                              display: inline-block;
                              padding: 4px 12px;
                              border-radius: 4px;
                              font-weight: bold;
                            }
                            .status-pending { background: #e3f2fd; color: #1565c0; }
                            .status-in_progress { background: #fff3e0; color: #e65100; }
                            .status-resolved { background: #e8f5e9; color: #2e7d32; }
                            .description-box {
                              background: #f5f5f5;
                              padding: 15px;
                              border-radius: 8px;
                              white-space: pre-wrap;
                            }
                            .resolution-box {
                              background: #e8f5e9;
                              border: 1px solid #a5d6a7;
                              padding: 15px;
                              border-radius: 8px;
                            }
                            .footer { 
                              margin-top: 40px; 
                              text-align: center; 
                              color: #999; 
                              font-size: 12px; 
                              border-top: 1px solid #ddd;
                              padding-top: 20px;
                            }
                            @media print {
                              body { padding: 20px; }
                              .header { page-break-after: avoid; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>تفاصيل الشكوى</h1>
                            <p>رقم الشكوى: ${selectedComplaint.id.substring(0, 8).toUpperCase()}</p>
                          </div>
                          
                          <div class="section">
                            <div class="section-title">معلومات عامة</div>
                            <div class="info-grid">
                              <div class="info-item">
                                <div class="info-label">العنوان:</div>
                                <div class="info-value">${selectedComplaint.subject}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">الحالة:</div>
                                <div class="info-value">
                                  <span class="status-badge status-${selectedComplaint.status}">
                                    ${selectedComplaint.status === 'pending' ? 'جديدة' : selectedComplaint.status === 'in_progress' ? 'قيد الإجراء' : 'تم الحل'}
                                  </span>
                                </div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">التصنيف:</div>
                                <div class="info-value">${getCategoryLabel(selectedComplaint.type)}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">البرنامج:</div>
                                <div class="info-value">${selectedComplaint.programs?.name || 'غير محدد'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div class="section">
                            <div class="section-title">بيانات مقدم الشكوى</div>
                            <div class="info-grid">
                              <div class="info-item">
                                <div class="info-label">الاسم:</div>
                                <div class="info-value">${selectedComplaint.student_name || 'غير محدد'}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">البريد الإلكتروني:</div>
                                <div class="info-value">${selectedComplaint.student_email || 'غير محدد'}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">نوع مقدم الشكوى:</div>
                                <div class="info-value">${selectedComplaint.complainant_type || 'غير محدد'}</div>
                              </div>
                              <div class="info-item">
                                <div class="info-label">تاريخ ووقت التقديم:</div>
                                <div class="info-value" style="font-family: monospace;">
                                  ${new Date(selectedComplaint.created_at).toLocaleDateString('ar-SA')} - ${new Date(selectedComplaint.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div class="section">
                            <div class="section-title">تفاصيل الشكوى</div>
                            <div class="description-box">${selectedComplaint.description}</div>
                          </div>
                          
                          ${selectedComplaint.resolution_notes ? `
                          <div class="section">
                            <div class="section-title">ملاحظات المعالجة</div>
                            <div class="resolution-box">${selectedComplaint.resolution_notes}</div>
                          </div>
                          ` : ''}
                          
                          <div class="footer">
                            <p>تم طباعة هذا التقرير بتاريخ: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}</p>
                          </div>
                        </body>
                        </html>
                      `;
                      printWindow.document.write(printContent);
                      printWindow.document.close();
                      printWindow.onload = () => {
                        printWindow.print();
                      };
                    }
                  }}
                >
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
                
                {/* Action buttons only for admin and coordinator */}
                {canManage && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive">
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من حذف هذه الشكوى؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف الشكوى نهائياً ولا يمكن استرجاعها.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => {
                            deleteComplaint(selectedComplaint.id);
                            setSelectedComplaint(null);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                  إغلاق
                </Button>
                {canManage && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEditComplaintData(selectedComplaint);
                        setIsEditingComplaint(true);
                      }}
                    >
                      تعديل
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">الحالة:</Label>
                      <select
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        value={selectedComplaint.status}
                        onChange={(e) => {
                          initiateStatusChange(selectedComplaint.id, e.target.value);
                          setSelectedComplaint(null);
                        }}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Complaint Dialog */}
      {isEditingComplaint && editComplaintData && (
        <Dialog open={isEditingComplaint} onOpenChange={() => setIsEditingComplaint(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تعديل الشكوى</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-subject">عنوان الشكوى</Label>
                <Input
                  id="edit-subject"
                  value={editComplaintData.subject || ""}
                  onChange={(e) => setEditComplaintData({...editComplaintData, subject: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-type">نوع الشكوى</Label>
                <select
                  id="edit-type"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={editComplaintData.type || ""}
                  onChange={(e) => setEditComplaintData({...editComplaintData, type: e.target.value})}
                >
                  <option value="academic">أكاديمي</option>
                  <option value="administrative">إداري</option>
                  <option value="technical">تقني</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="edit-description">وصف الشكوى</Label>
                <Textarea
                  id="edit-description"
                  rows={6}
                  value={editComplaintData.description || ""}
                  onChange={(e) => setEditComplaintData({...editComplaintData, description: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditingComplaint(false);
                  setEditComplaintData({});
                }}>
                  إلغاء
                </Button>
                <Button onClick={handleEditComplaint}>
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Resolution Notes Dialog */}
      <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظات المعالجة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resolution-notes">ملاحظات المعالجة</Label>
              <Textarea
                id="resolution-notes"
                placeholder="اكتب هنا تفاصيل كيفية معالجة الشكوى والإجراءات المتخذة..."
                rows={6}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowResolutionDialog(false);
                setResolutionNotes("");
                setComplaintToResolve(null);
              }}>
                إلغاء
              </Button>
              <Button 
                onClick={() => {
                  if (complaintToResolve && resolutionNotes.trim()) {
                    updateComplaintStatus(complaintToResolve.id, complaintToResolve.newStatus, resolutionNotes);
                  }
                }}
                disabled={!resolutionNotes.trim()}
              >
                حفظ وتحديث الحالة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaints Statistics Modal */}
      <ComplaintsStatistics 
        isOpen={showStatistics} 
        onClose={() => setShowStatistics(false)} 
      />
    </div>
  );
};

export default Complaints;
