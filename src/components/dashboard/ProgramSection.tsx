import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Clock,
  Lightbulb,
  Pencil,
  Plus,
  GraduationCap
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProgramStats, RecommendationDetail } from "./RoleBasedDashboard";

interface ProgramSectionProps {
  stats: ProgramStats;
  isExpanded?: boolean;
  userRole?: 'admin' | 'dean' | 'coordinator' | 'program_manager' | 'faculty';
  isCollegeLevel?: boolean;
}

const PROGRAM_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(162, 72%, 42%)',
  'hsl(28, 90%, 50%)',
  'hsl(280, 65%, 55%)',
  'hsl(350, 75%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(45, 90%, 50%)',
  'hsl(200, 80%, 50%)',
];

const getStatusBadge = (status: string, language: string) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: language === 'ar' ? 'جديدة' : 'New', className: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: language === 'ar' ? 'قيد الإجراء' : 'In Progress', className: 'bg-blue-100 text-blue-800' },
    resolved: { label: language === 'ar' ? 'تم الحل' : 'Resolved', className: 'bg-green-100 text-green-800' },
    closed: { label: language === 'ar' ? 'مغلقة' : 'Closed', className: 'bg-gray-100 text-gray-800' },
  };
  const info = map[status] || map.pending;
  return <Badge variant="secondary" className={info.className}>{info.label}</Badge>;
};

const getRecStatusBadge = (status: string, language: string) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: language === 'ar' ? 'قيد الانتظار' : 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: language === 'ar' ? 'قيد التنفيذ' : 'In Progress', className: 'bg-blue-100 text-blue-800' },
    completed: { label: language === 'ar' ? 'مكتملة' : 'Completed', className: 'bg-green-100 text-green-800' },
    postponed: { label: language === 'ar' ? 'مؤجلة' : 'Postponed', className: 'bg-gray-100 text-gray-800' },
  };
  const info = map[status] || map.pending;
  return <Badge variant="secondary" className={info.className}>{info.label}</Badge>;
};

const getPriorityBadge = (priority: string, language: string) => {
  const map: Record<string, { label: string; className: string }> = {
    high: { label: language === 'ar' ? 'عالية' : 'High', className: 'bg-red-100 text-red-800' },
    medium: { label: language === 'ar' ? 'متوسطة' : 'Medium', className: 'bg-orange-100 text-orange-800' },
    low: { label: language === 'ar' ? 'منخفضة' : 'Low', className: 'bg-green-100 text-green-800' },
  };
  const info = map[priority] || map.medium;
  return <Badge variant="secondary" className={info.className}>{info.label}</Badge>;
};

const getProgramInitial = (name: string): string => {
  const stripped = name.replace(/^برنامج\s*/, '');
  const withoutAl = stripped.replace(/^ال/, '');
  return withoutAl.charAt(0) || stripped.charAt(0) || name.charAt(0);
};

const ProgramSection = ({ stats, isExpanded = true, userRole, isCollegeLevel = false }: ProgramSectionProps) => {
  const { language } = useLanguage();
  const programColor = PROGRAM_COLORS[stats.colorIndex % PROGRAM_COLORS.length];
  const [showSurveys, setShowSurveys] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [editingRec, setEditingRec] = useState<RecommendationDetail | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [localRecommendations, setLocalRecommendations] = useState<RecommendationDetail[]>(stats.recommendations || []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  
  const canEdit = userRole === 'admin' || userRole === 'coordinator';
  
  const complaintStats = stats.complaintStats || { pending: 0, inProgress: 0, resolved: 0 };
  const totalComplaints = complaintStats.pending + complaintStats.inProgress + complaintStats.resolved;
  const resolutionRate = totalComplaints > 0 
    ? Math.round((complaintStats.resolved / totalComplaints) * 100) 
    : 0;

  const sortedCourses = [...(stats.courseSatisfaction || [])].sort((a, b) => b.averageSatisfaction - a.averageSatisfaction);
  const surveyDetails = stats.surveyDetails || [];
  const complaintDetails = stats.complaintDetails || [];

  const complaintStatusData = [
    { name: language === 'ar' ? 'جديدة' : 'New', value: complaintStats.pending, fill: '#f59e0b' },
    { name: language === 'ar' ? 'قيد الإجراء' : 'In Progress', value: complaintStats.inProgress, fill: '#3b82f6' },
    { name: language === 'ar' ? 'تم الحل' : 'Resolved', value: complaintStats.resolved, fill: '#22c55e' },
  ].filter(item => item.value > 0);

  const handleSaveRecommendation = async () => {
    if (!editingRec) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('recommendations')
        .update({ title: editTitle, description: editDescription, priority: editPriority })
        .eq('id', editingRec.id);
      if (error) throw error;
      setLocalRecommendations(prev => prev.map(r => 
        r.id === editingRec.id ? { ...r, title: editTitle, description: editDescription, priority: editPriority } : r
      ));
      toast.success(language === 'ar' ? 'تم حفظ التوصية بنجاح' : 'Recommendation saved successfully');
      setEditingRec(null);
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving recommendation');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecommendation = async () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error(language === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .insert({
          title: newTitle,
          description: newDescription,
          priority: newPriority,
          program_id: stats.programId,
          source_type: 'manual',
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      setLocalRecommendations(prev => [{
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        semester: data.semester,
        academic_year: data.academic_year,
        program_id: data.program_id,
      }, ...prev]);
      toast.success(language === 'ar' ? 'تمت إضافة التوصية بنجاح' : 'Recommendation added successfully');
      setShowAddDialog(false);
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الإضافة' : 'Error adding recommendation');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="space-y-4">
      {/* Program Header */}
      <div 
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{ 
          background: isCollegeLevel 
            ? `linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%)`
            : `linear-gradient(135deg, ${programColor}15 0%, ${programColor}05 100%)`,
          borderLeft: isCollegeLevel ? `4px solid hsl(var(--primary))` : `4px solid ${programColor}`
        }}
      >
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: isCollegeLevel ? 'hsl(var(--primary))' : programColor }}
        >
          {isCollegeLevel ? <GraduationCap className="h-6 w-6" /> : getProgramInitial(stats.programName)}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{stats.programName}</h3>
          {stats.programNameEn && (
            <p className="text-sm text-muted-foreground">{stats.programNameEn}</p>
          )}
        </div>
        <Badge 
          variant="secondary"
          className="text-white"
          style={{ backgroundColor: programColor }}
        >
          {stats.totalSurveys} {language === 'ar' ? 'استبيان' : 'Survey'}
        </Badge>
      </div>

      {isExpanded && (
        <>
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4" style={{ borderLeftColor: programColor }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الاستجابات' : 'Total Responses'}
                    </p>
                    <p className="text-xl font-bold">{stats.totalResponses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: programColor }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'المتوسط العام' : 'Avg Satisfaction'}
                    </p>
                    <p className="text-xl font-bold">{stats.averageSatisfaction.toFixed(2)}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Surveys KPI - Collapsible */}
            <Collapsible open={showSurveys} onOpenChange={setShowSurveys}>
              <CollapsibleTrigger asChild>
                <Card className="border-l-4 cursor-pointer hover:shadow-md transition-shadow" style={{ borderLeftColor: programColor }}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'الاستبيانات' : 'Surveys'}
                        </p>
                        <p className="text-xl font-bold">{stats.totalSurveys}</p>
                      </div>
                      {showSurveys ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
            </Collapsible>

            {/* Complaints KPI - Collapsible */}
            <Collapsible open={showComplaints} onOpenChange={setShowComplaints}>
              <CollapsibleTrigger asChild>
                <Card className="border-l-4 cursor-pointer hover:shadow-md transition-shadow" style={{ borderLeftColor: programColor }}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'الشكاوى' : 'Complaints'}
                        </p>
                        <p className="text-xl font-bold">{totalComplaints}</p>
                      </div>
                      {showComplaints ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Survey Details - Collapsible Content */}
          <Collapsible open={showSurveys} onOpenChange={setShowSurveys}>
            <CollapsibleContent>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {language === 'ar' ? 'تفاصيل الاستبيانات' : 'Survey Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {surveyDetails.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'اسم الاستبيان' : 'Survey Name'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الاستجابات' : 'Responses'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'المتوسط' : 'Average'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'رابط' : 'Link'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {surveyDetails.map(survey => (
                          <TableRow key={survey.id}>
                            <TableCell className="font-medium">{survey.title}</TableCell>
                            <TableCell className="text-center">{survey.responseCount}</TableCell>
                            <TableCell className="text-center">
                              {survey.avgSatisfaction > 0 ? (
                                <Badge variant="secondary" className={
                                  survey.avgSatisfaction >= 4 ? 'bg-green-100 text-green-800' :
                                  survey.avgSatisfaction >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {survey.avgSatisfaction.toFixed(2)}/5
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Link to="/surveys" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'ar' ? 'لا توجد استبيانات' : 'No surveys'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Complaint Details - Collapsible Content */}
          <Collapsible open={showComplaints} onOpenChange={setShowComplaints}>
            <CollapsibleContent>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {language === 'ar' ? 'تفاصيل الشكاوى' : 'Complaint Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {complaintDetails.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'الموضوع' : 'Subject'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'رابط' : 'Link'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaintDetails.map(complaint => (
                          <TableRow key={complaint.id}>
                            <TableCell className="font-medium">{complaint.subject}</TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(complaint.status, language)}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              <span className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(complaint.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Link to="/complaints" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'ar' ? 'لا توجد شكاوى' : 'No complaints'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Recommendations Section - Always visible */}
          <Collapsible open={showRecommendations} onOpenChange={setShowRecommendations}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {localRecommendations.length} {language === 'ar' ? 'توصية' : 'recommendation(s)'}
                      </p>
                    </div>
                    {showRecommendations ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                    </CardTitle>
                    {canEdit && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowAddDialog(true); }}>
                        <Plus className="h-4 w-4 mr-1" />
                        {language === 'ar' ? 'إضافة توصية' : 'Add Recommendation'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {localRecommendations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                          {canEdit && <TableHead className="text-center w-20">{language === 'ar' ? 'تعديل' : 'Edit'}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {localRecommendations.map(rec => (
                          <TableRow key={rec.id}>
                            <TableCell className="font-medium whitespace-nowrap">{rec.title}</TableCell>
                            <TableCell className="whitespace-pre-wrap text-sm max-w-md">{rec.description}</TableCell>
                            <TableCell className="text-center">{getRecStatusBadge(rec.status, language)}</TableCell>
                            <TableCell className="text-center">{getPriorityBadge(rec.priority, language)}</TableCell>
                            {canEdit && (
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingRec(rec);
                                    setEditTitle(rec.title);
                                    setEditDescription(rec.description);
                                    setEditPriority(rec.priority);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'ar' ? 'لا توجد توصيات' : 'No recommendations'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Edit Recommendation Dialog */}
          <Dialog open={!!editingRec} onOpenChange={(open) => !open && setEditingRec(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'تعديل التوصية' : 'Edit Recommendation'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'الأولوية' : 'Priority'}</label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                      <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                      <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingRec(null)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleSaveRecommendation} disabled={saving}>
                  {saving 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                    : (language === 'ar' ? 'حفظ' : 'Save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Recommendation Dialog */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'إضافة توصية جديدة' : 'Add New Recommendation'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'العنوان' : 'Title'}</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={language === 'ar' ? 'عنوان التوصية' : 'Recommendation title'}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder={language === 'ar' ? 'وصف التوصية' : 'Recommendation description'}
                    rows={5}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'ar' ? 'الأولوية' : 'Priority'}</label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                      <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                      <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleAddRecommendation} disabled={saving}>
                  {saving 
                    ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...') 
                    : (language === 'ar' ? 'إضافة' : 'Add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Course Satisfaction Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'ar' ? 'رضا الطلبة عن المقررات' : 'Student Satisfaction by Course'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedCourses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(200, sortedCourses.length * 35)}>
                    <BarChart
                      data={sortedCourses}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" domain={[0, 5]} tickCount={6} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value.toFixed(2), language === 'ar' ? 'المتوسط' : 'Average']}
                        contentStyle={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                      />
                      <Bar dataKey="averageSatisfaction" radius={[0, 4, 4, 0]}>
                        {sortedCourses.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={programColor}
                            opacity={0.7 + (0.3 * (sortedCourses.length - index) / sortedCourses.length)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Complaints Status Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {language === 'ar' ? 'حالة الشكاوى' : 'Complaints Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaintStatusData.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={complaintStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {complaintStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, language === 'ar' ? 'شكوى' : 'Complaints']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'نسبة الحل' : 'Resolution Rate'}
                        </span>
                        <Badge 
                          variant="secondary"
                          className={resolutionRate >= 70 ? 'bg-green-100 text-green-800' : resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                        >
                          {resolutionRate}%
                        </Badge>
                      </div>
                      <Progress value={resolutionRate} className="h-2" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                    <p>{language === 'ar' ? 'لا توجد شكاوى' : 'No complaints'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ProgramSection;
