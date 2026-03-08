import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  FileText,
  Building2,
  BarChart3,
  LayoutDashboard
} from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import ComplaintsStatistics from "@/components/ComplaintsStatistics";
import ComplaintsDashboard from "@/components/ComplaintsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Complaint, Program } from "@/components/complaints/complaintsHelpers";
import ComplaintCard from "@/components/complaints/ComplaintCard";
import ComplaintClickableStats from "@/components/complaints/ComplaintClickableStats";
import ComplaintStatusDashboard from "@/components/complaints/ComplaintStatusDashboard";
import ComplaintDetailsDialog from "@/components/complaints/ComplaintDetailsDialog";
import ComplaintEditDialog from "@/components/complaints/ComplaintEditDialog";
import ComplaintResolutionDialog from "@/components/complaints/ComplaintResolutionDialog";
import NewComplaintDialog from "@/components/complaints/NewComplaintDialog";
import ComplaintQRSection from "@/components/complaints/ComplaintQRSection";
import ComplaintFiltersCard from "@/components/complaints/ComplaintFiltersCard";

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
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrCodeData(qrData);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyComplaintLink = () => {
    const complaintUrl = `${window.location.origin}/submit-complaint`;
    navigator.clipboard.writeText(complaintUrl);
    toast({ title: "تم النسخ", description: "تم نسخ رابط تقديم الشكوى" });
  };

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role, program_id")
        .eq("user_id", user.id);

      const adminStatus = userRoles?.some(r => r.role === 'admin') || false;
      const deanStatus = userRoles?.some(r => r.role === 'dean') || false;
      const programManagerStatus = userRoles?.some(r => r.role === 'program_manager') || false;
      const coordinatorStatus = userRoles?.some(r => r.role === 'coordinator') || false;
      const programIds = userRoles?.map(r => r.program_id).filter(Boolean) as string[] || [];

      setIsAdmin(adminStatus);
      setIsDean(deanStatus);
      setIsProgramManager(programManagerStatus);
      setIsCoordinator(coordinatorStatus);
      setUserProgramIds(programIds);

      let query = supabase.from("complaints").select(`*, programs (name)`);
      if (!adminStatus && !deanStatus && programIds.length > 0) {
        query = query.in("program_id", programIds);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setComplaints(data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: "فشل في تحميل الشكاوى", variant: "destructive" });
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
      const current = data.find((c: any) => c.is_current);
      if (current) {
        setSelectedAcademicYear(current.academic_year);
        setSelectedSemester(current.semester);
      }
    }
  };

  const handleSubmitComplaint = async () => {
    if (!newComplaint.title || !newComplaint.description) {
      toast({ title: "خطأ", description: "الرجاء إدخال العنوان والوصف", variant: "destructive" });
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
      toast({ title: "تم إرسال الشكوى", description: "تم إرسال شكواك بنجاح وسيتم مراجعتها قريباً" });
      setNewComplaint({ title: "", description: "", category: "academic", priority: "medium", program_id: "" });
      setShowNewComplaintDialog(false);
      loadComplaints();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "فشل في إرسال الشكوى", variant: "destructive" });
    }
  };

  const deleteComplaint = async (complaintId: string) => {
    try {
      const { error } = await supabase.from("complaints").delete().eq("id", complaintId);
      if (error) throw error;
      toast({ title: "تم الحذف", description: "تم حذف الشكوى بنجاح" });
      loadComplaints();
    } catch (error: any) {
      toast({ title: "خطأ", description: "فشل في حذف الشكوى", variant: "destructive" });
    }
  };

  const updateComplaintStatus = async (complaintId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (notes) {
        updateData.resolution_notes = notes;
        if (newStatus === 'resolved') {
          updateData.resolved_at = new Date().toISOString();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) updateData.resolved_by = user.id;
        }
      }
      const { error } = await supabase.from("complaints").update(updateData).eq("id", complaintId);
      if (error) throw error;
      toast({ title: "تم التحديث", description: "تم تحديث حالة الشكوى بنجاح" });
      setShowResolutionDialog(false);
      setResolutionNotes("");
      setComplaintToResolve(null);
      loadComplaints();
    } catch (error: any) {
      toast({ title: "خطأ", description: "فشل في تحديث حالة الشكوى", variant: "destructive" });
    }
  };

  const handleEditComplaint = async () => {
    if (!editComplaintData.id) return;
    try {
      const { error } = await supabase.from("complaints").update({
        subject: editComplaintData.subject,
        description: editComplaintData.description,
        type: editComplaintData.type,
        complaint_category: editComplaintData.complaint_category,
        updated_at: new Date().toISOString()
      }).eq("id", editComplaintData.id);
      if (error) throw error;
      toast({ title: "تم التحديث", description: "تم تحديث الشكوى بنجاح" });
      setIsEditingComplaint(false);
      setSelectedComplaint(null);
      loadComplaints();
    } catch (error: any) {
      toast({ title: "خطأ", description: "فشل في تحديث الشكوى", variant: "destructive" });
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

  const getComplaintsByProgram = (programId: string | null) => {
    return complaints.filter(c => c.program_id === programId);
  };

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

  const filteredComplaints = getFilteredComplaints();
  const canManage = isAdmin || isCoordinator;
  const programsWithComplaints = programs.filter(p => complaints.some(c => c.program_id === p.id));

  const handleStatClick = (status: string, context: { type: 'all' | 'program'; programId?: string }) => {
    setActiveStatusView(status);
    setActiveStatusContext(context);
  };

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
          {statusComplaints.map(c => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              canManage={canManage}
              onView={setSelectedComplaint}
              onStatusChange={initiateStatusChange}
              onDelete={deleteComplaint}
            />
          ))}
        </div>
      </div>
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
          <Button 
            variant={showDashboard ? "default" : "outline"} 
            onClick={() => setShowDashboard(!showDashboard)}
          >
            <LayoutDashboard className="h-4 w-4 ml-2" />
            {showDashboard ? 'إخفاء لوحة التحكم' : 'لوحة التحكم'}
          </Button>
          <Button variant="outline" onClick={() => setShowStatistics(true)}>
            <BarChart3 className="h-4 w-4 ml-2" />
            التقارير الإحصائية
          </Button>
          {canManage && (
            <NewComplaintDialog
              isOpen={showNewComplaintDialog}
              onOpenChange={setShowNewComplaintDialog}
              newComplaint={newComplaint}
              onChange={setNewComplaint}
              onSubmit={handleSubmitComplaint}
              programs={programs}
            />
          )}
        </div>
      </div>

      {/* Global Stats - Clickable */}
      <ComplaintClickableStats
        complaintsData={complaints}
        context={{ type: 'all' }}
        activeStatusView={activeStatusView}
        activeStatusContext={activeStatusContext}
        onStatClick={handleStatClick}
      />

      {/* Status Dashboard - Shows when a stat is clicked for "all" context */}
      {activeStatusView && activeStatusContext?.type === 'all' && (
        <ComplaintStatusDashboard
          complaintsData={complaints}
          status={activeStatusView}
          canManage={canManage}
          onClose={() => setActiveStatusView(null)}
          onView={setSelectedComplaint}
          onStatusChange={initiateStatusChange}
          onDelete={deleteComplaint}
        />
      )}

      {/* QR Code Section */}
      <ComplaintQRSection qrCodeData={qrCodeData} onCopyLink={copyComplaintLink} />

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
          {(isAdmin || isDean) && (
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              جميع الشكاوى
              <Badge variant="secondary" className="mr-1">{complaints.length}</Badge>
            </TabsTrigger>
          )}
          
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

        {/* All Complaints Tab */}
        {(isAdmin || isDean) && (
          <TabsContent value="all" className="space-y-4">
            <ComplaintFiltersCard
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedProgram={selectedProgram}
              onProgramChange={setSelectedProgram}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              selectedAcademicYear={selectedAcademicYear}
              onAcademicYearChange={setSelectedAcademicYear}
              selectedSemester={selectedSemester}
              onSemesterChange={setSelectedSemester}
              programs={programs}
            />

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
              <ComplaintClickableStats
                complaintsData={programComplaints}
                context={{ type: 'program', programId: program.id }}
                activeStatusView={activeStatusView}
                activeStatusContext={activeStatusContext}
                onStatClick={handleStatClick}
              />

              {activeStatusView && activeStatusContext?.type === 'program' && activeStatusContext?.programId === program.id && (
                <ComplaintStatusDashboard
                  complaintsData={programComplaints}
                  status={activeStatusView}
                  canManage={canManage}
                  onClose={() => setActiveStatusView(null)}
                  onView={setSelectedComplaint}
                  onStatusChange={initiateStatusChange}
                  onDelete={deleteComplaint}
                />
              )}

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
            {complaints.filter(c => !c.program_id).map(c => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                canManage={canManage}
                onView={setSelectedComplaint}
                onStatusChange={initiateStatusChange}
                onDelete={deleteComplaint}
              />
            ))}
          </TabsContent>
        )}
      </Tabs>

      {/* Complaint Details Dialog */}
      {selectedComplaint && !isEditingComplaint && (
        <ComplaintDetailsDialog
          complaint={selectedComplaint}
          canManage={canManage}
          onClose={() => setSelectedComplaint(null)}
          onEdit={(c) => { setEditComplaintData(c); setIsEditingComplaint(true); }}
          onDelete={deleteComplaint}
          onStatusChange={initiateStatusChange}
        />
      )}

      {/* Edit Complaint Dialog */}
      <ComplaintEditDialog
        isOpen={isEditingComplaint}
        editData={editComplaintData}
        onClose={() => { setIsEditingComplaint(false); setEditComplaintData({}); }}
        onChange={setEditComplaintData}
        onSave={handleEditComplaint}
      />

      {/* Resolution Notes Dialog */}
      <ComplaintResolutionDialog
        isOpen={showResolutionDialog}
        resolutionNotes={resolutionNotes}
        onNotesChange={setResolutionNotes}
        onClose={() => { setShowResolutionDialog(false); setResolutionNotes(""); setComplaintToResolve(null); }}
        onConfirm={() => {
          if (complaintToResolve && resolutionNotes.trim()) {
            updateComplaintStatus(complaintToResolve.id, complaintToResolve.newStatus, resolutionNotes);
          }
        }}
      />

      {/* Complaints Statistics Modal */}
      <ComplaintsStatistics 
        isOpen={showStatistics} 
        onClose={() => setShowStatistics(false)} 
      />
    </div>
  );
};

export default Complaints;
