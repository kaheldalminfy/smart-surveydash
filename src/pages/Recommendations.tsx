import { useEffect, useState, useMemo } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import RecommendationFilters from "@/components/recommendations/RecommendationFilters";
import ReportRecommendationsSection, { type ReportRecommendation } from "@/components/recommendations/ReportRecommendationsSection";

const Recommendations = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Filters
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");

  // Report recommendations
  const [reportRecs, setReportRecs] = useState<ReportRecommendation[]>([]);

  const [stats, setStats] = useState({
    total: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0,
  });

  const [formData, setFormData] = useState({
    title: "", description: "", program_id: "", priority: "medium",
    status: "pending", source_type: "survey",
    academic_year: new Date().getFullYear().toString(), semester: "",
  });

  useEffect(() => {
    loadRecommendations();
    loadPrograms();
    loadReportRecommendations();
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
        total, completed, inProgress, pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }
  };

  const loadReportRecommendations = async () => {
    // Fetch reports with recommendations_text, joined with surveys
    const { data: reports } = await supabase
      .from("reports")
      .select("id, recommendations_text, academic_year, semester, survey_id, surveys(id, title, program_id, programs(id, name))")
      .not("recommendations_text", "is", null)
      .neq("recommendations_text", "");

    if (!reports) return;

    // Fetch all survey_courses with courses
    const surveyIds = reports.map((r: any) => r.survey_id).filter(Boolean);
    const { data: surveyCoursesData } = await supabase
      .from("survey_courses")
      .select("survey_id, courses(name, code)")
      .in("survey_id", surveyIds.length > 0 ? surveyIds : ["__none__"]);

    // Build course map: survey_id -> courses[]
    const courseMap = new Map<string, { name: string; code: string }[]>();
    if (surveyCoursesData) {
      for (const sc of surveyCoursesData as any[]) {
        if (!sc.survey_id || !sc.courses) continue;
        if (!courseMap.has(sc.survey_id)) courseMap.set(sc.survey_id, []);
        courseMap.get(sc.survey_id)!.push({ name: sc.courses.name, code: sc.courses.code });
      }
    }

    const items: ReportRecommendation[] = (reports as any[]).map((r) => ({
      report_id: r.id,
      recommendations_text: r.recommendations_text,
      academic_year: r.academic_year || r.surveys?.academic_year || null,
      semester: r.semester || r.surveys?.semester || null,
      survey_id: r.survey_id,
      survey_title: r.surveys?.title || "",
      program_id: r.surveys?.program_id || null,
      program_name: r.surveys?.programs?.name || "",
      courses: courseMap.get(r.survey_id) || [],
    }));

    setReportRecs(items);
  };

  // Collect all academic years from both sources for filter
  const academicYears = useMemo(() => {
    const years = new Set<string>();
    recommendations.forEach((r) => r.academic_year && years.add(r.academic_year));
    reportRecs.forEach((r) => r.academic_year && years.add(r.academic_year));
    return Array.from(years).sort().reverse();
  }, [recommendations, reportRecs]);

  // Apply filters
  const filteredManual = useMemo(() => {
    return recommendations.filter((r) => {
      if (filterProgram !== "all" && r.program_id !== filterProgram) return false;
      if (filterYear !== "all" && r.academic_year !== filterYear) return false;
      if (filterSemester !== "all" && r.semester !== filterSemester) return false;
      return true;
    });
  }, [recommendations, filterProgram, filterYear, filterSemester]);

  const filteredReportRecs = useMemo(() => {
    return reportRecs.filter((r) => {
      if (filterProgram !== "all" && r.program_id !== filterProgram) return false;
      if (filterYear !== "all" && r.academic_year !== filterYear) return false;
      if (filterSemester !== "all" && r.semester !== filterSemester) return false;
      return true;
    });
  }, [reportRecs, filterProgram, filterYear, filterSemester]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("recommendations").update(formData).eq("id", editingId);
        if (error) throw error;
        toast({ title: t('common.updated') });
      } else {
        const { error } = await supabase.from("recommendations").insert(formData);
        if (error) throw error;
        toast({ title: t('common.saved') });
      }
      setIsDialogOpen(false);
      resetForm();
      loadRecommendations();
    } catch {
      toast({ title: t('common.error'), description: language === 'ar' ? "حدث خطأ أثناء حفظ التوصية" : "Error saving recommendation", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rec: any) => {
    setFormData({
      title: rec.title, description: rec.description, program_id: rec.program_id,
      priority: rec.priority, status: rec.status, source_type: rec.source_type,
      academic_year: rec.academic_year, semester: rec.semester,
    });
    setEditingId(rec.id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", program_id: "", priority: "medium", status: "pending", source_type: "survey", academic_year: new Date().getFullYear().toString(), semester: "" });
    setEditingId(null);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "secondary" | "default" }> = {
      pending: { label: t('recommendations.pending'), variant: "secondary" },
      in_progress: { label: t('recommendations.inProgress'), variant: "default" },
      completed: { label: t('recommendations.completed'), variant: "default" },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { label: string; variant: "outline" | "secondary" | "destructive" }> = {
      low: { label: t('recommendations.low'), variant: "outline" },
      medium: { label: t('recommendations.medium'), variant: "secondary" },
      high: { label: t('recommendations.high'), variant: "destructive" },
    };
    const p = map[priority] || map.medium;
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
                <h1 className="text-2xl font-bold">{t('recommendations.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('recommendations.subtitle')}</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 ml-2" />{t('recommendations.add')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? t('recommendations.editTitle') : t('recommendations.addNew')}</DialogTitle>
                  <DialogDescription>{editingId ? t('recommendations.editDescription') : t('recommendations.addDescription')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('recommendations.recommendationTitle')} *</Label>
                    <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('recommendations.details')} *</Label>
                    <Textarea id="description" required rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('recommendations.programLabel')} *</Label>
                      <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })} required>
                        <SelectTrigger><SelectValue placeholder={t('recommendations.selectProgram')} /></SelectTrigger>
                        <SelectContent>{programs.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('recommendations.priority')} *</Label>
                      <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('recommendations.low')}</SelectItem>
                          <SelectItem value="medium">{t('recommendations.medium')}</SelectItem>
                          <SelectItem value="high">{t('recommendations.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('recommendations.status')} *</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('recommendations.pending')}</SelectItem>
                          <SelectItem value="in_progress">{t('recommendations.inProgress')}</SelectItem>
                          <SelectItem value="completed">{t('recommendations.completed')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('recommendations.source')} *</Label>
                      <Select value={formData.source_type} onValueChange={(v) => setFormData({ ...formData, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="survey">{t('recommendations.survey')}</SelectItem>
                          <SelectItem value="complaint">{t('recommendations.complaint')}</SelectItem>
                          <SelectItem value="manual">{t('recommendations.manual')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('common.academicYear')} *</Label>
                      <Input required value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.semester')} *</Label>
                      <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                        <SelectTrigger><SelectValue placeholder={t('recommendations.selectSemester')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">{t('recommendations.first')}</SelectItem>
                          <SelectItem value="second">{t('recommendations.second')}</SelectItem>
                          <SelectItem value="summer">{t('recommendations.summerSem')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('recommendations.saving') : editingId ? t('recommendations.update') : t('common.add')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.total')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.completed')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{stats.completed}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.inProgress')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.pending')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-orange-600">{stats.pending}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.completionRate')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.completionRate}%</div><Progress value={stats.completionRate} className="mt-2" /></CardContent></Card>
        </div>

        {/* Filters */}
        <RecommendationFilters
          programs={programs}
          academicYears={academicYears}
          selectedProgram={filterProgram}
          selectedYear={filterYear}
          selectedSemester={filterSemester}
          onProgramChange={setFilterProgram}
          onYearChange={setFilterYear}
          onSemesterChange={setFilterSemester}
        />

        {/* Report Recommendations */}
        <ReportRecommendationsSection reportRecommendations={filteredReportRecs} />

        {/* Manual Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>{t('recommendations.manualRecommendations')}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredManual.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t('recommendations.noManualRecommendations')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('recommendations.date')}</TableHead>
                    <TableHead>{t('recommendations.titleLabel')}</TableHead>
                    <TableHead>{t('recommendations.programLabel')}</TableHead>
                    <TableHead>{t('recommendations.source')}</TableHead>
                    <TableHead>{t('recommendations.priority')}</TableHead>
                    <TableHead>{t('recommendations.status')}</TableHead>
                    <TableHead>{t('recommendations.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredManual.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{new Date(rec.created_at).toLocaleDateString(language === 'ar' ? "ar-SA" : "en-US")}</TableCell>
                      <TableCell className="font-medium">{rec.title}</TableCell>
                      <TableCell>{rec.programs?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rec.source_type === "survey" ? t('recommendations.survey') : rec.source_type === "complaint" ? t('recommendations.complaint') : t('recommendations.manual')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(rec)}>
                          <Edit className="h-4 w-4 ml-2" />{t('recommendations.edit')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Recommendations;
