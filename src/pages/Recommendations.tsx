import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CalendarDays, FileSpreadsheet, FileText } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { useLanguage } from "@/contexts/LanguageContext";
import RecommendationFilters from "@/components/recommendations/RecommendationFilters";
import RecommendationYearGroup, { type UnifiedRecommendation } from "@/components/recommendations/RecommendationYearGroup";
import { exportRecommendationsExcel, exportRecommendationsPDF, type ExportLabels } from "@/utils/exportRecommendations";

interface ReportRecommendation {
  report_id: string;
  recommendations_text: string;
  academic_year: string | null;
  semester: string | null;
  survey_id: string | null;
  survey_title: string;
  program_id: string | null;
  program_name: string;
  course_name: string | null;
}

const Recommendations = () => {
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
  const [search, setSearch] = useState("");

  const [reportRecs, setReportRecs] = useState<ReportRecommendation[]>([]);

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
    if (data) setRecommendations(data);
  };

  const loadReportRecommendations = async () => {
    const { data: reports } = await supabase
      .from("reports")
      .select("id, recommendations_text, statistics, academic_year, semester, survey_id, status, surveys(id, title, program_id, programs(id, name))");

    if (!reports) return;

    const surveyIds = reports.map((r: any) => r.survey_id).filter(Boolean);
    const { data: surveyCoursesData } = await supabase
      .from("survey_courses")
      .select("survey_id, courses(name, code)")
      .in("survey_id", surveyIds.length > 0 ? surveyIds : ["__none__"]);

    const courseMap = new Map<string, string[]>();
    if (surveyCoursesData) {
      for (const sc of surveyCoursesData as any[]) {
        if (!sc.survey_id || !sc.courses) continue;
        if (!courseMap.has(sc.survey_id)) courseMap.set(sc.survey_id, []);
        courseMap.get(sc.survey_id)!.push(sc.courses.name);
      }
    }

    const items: ReportRecommendation[] = [];

    for (const r of reports as any[]) {
      const base = {
        report_id: r.id,
        academic_year: r.academic_year || null,
        semester: r.semester || null,
        survey_id: r.survey_id,
        survey_title: r.surveys?.title || "",
        program_id: r.surveys?.program_id || null,
        program_name: r.surveys?.programs?.name || "",
      };

      const courseContent = (r.statistics?.course_content || {}) as Record<
        string,
        { summary?: string; recommendations?: string }
      >;
      const courseEntries = Object.entries(courseContent).filter(
        ([, v]) => (v?.recommendations || "").trim() !== ""
      );

      for (const [courseName, value] of courseEntries) {
        items.push({ ...base, recommendations_text: value.recommendations || "", course_name: courseName });
      }

      if (courseEntries.length === 0 && (r.recommendations_text || "").trim() !== "") {
        items.push({
          ...base,
          recommendations_text: r.recommendations_text,
          course_name: (courseMap.get(r.survey_id) || []).join(", ") || null,
        });
      }
    }

    setReportRecs(items);
  };

  // Unified list: tracked rows from the recommendations table + report
  // recommendations that were not transferred yet.
  const unified = useMemo<UnifiedRecommendation[]>(() => {
    const tracked: UnifiedRecommendation[] = recommendations.map((r) => ({
      key: `rec-${r.id}`,
      kind: r.source_type === "survey" && r.source_id ? "report" : "manual",
      id: r.id,
      title: r.title,
      description: r.description || "",
      course_name: r.course_name || null,
      program_id: r.program_id || null,
      program_name: r.programs?.name || "",
      academic_year: r.academic_year || null,
      semester: r.semester || null,
      status: r.status || "pending",
      priority: r.priority || "medium",
      updated_at: r.updated_at || r.created_at || null,
      survey_id: null,
    }));

    const trackedKeys = new Set(
      recommendations
        .filter((r) => r.source_id)
        .map((r) => `${r.source_id}::${r.course_name || ""}`)
    );

    const untracked: UnifiedRecommendation[] = reportRecs
      .filter((r) => !trackedKeys.has(`${r.report_id}::${r.course_name || ""}`))
      .map((r) => ({
        key: `rep-${r.report_id}-${r.course_name || "all"}`,
        kind: "report" as const,
        id: null,
        title: r.survey_title,
        description: r.recommendations_text,
        course_name: r.course_name,
        program_id: r.program_id,
        program_name: r.program_name,
        academic_year: r.academic_year,
        semester: r.semester,
        status: null,
        priority: null,
        updated_at: null,
        survey_id: r.survey_id,
      }));

    return [...tracked, ...untracked];
  }, [recommendations, reportRecs]);

  const academicYears = useMemo(() => {
    const years = new Set<string>();
    unified.forEach((r) => r.academic_year && years.add(r.academic_year));
    return Array.from(years).sort().reverse();
  }, [unified]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unified.filter((r) => {
      if (filterProgram !== "all" && r.program_id !== filterProgram) return false;
      if (filterYear !== "all" && r.academic_year !== filterYear) return false;
      if (filterSemester !== "all" && r.semester !== filterSemester) return false;
      if (q) {
        const haystack = `${r.title} ${r.course_name || ""} ${r.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [unified, filterProgram, filterYear, filterSemester, search]);

  // Group by academic year, newest first
  const yearGroups = useMemo(() => {
    const map = new Map<string, UnifiedRecommendation[]>();
    filtered.forEach((r) => {
      const key = r.academic_year || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => {
      if (!a[0]) return 1;
      if (!b[0]) return -1;
      return b[0].localeCompare(a[0], undefined, { numeric: true });
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((r) => r.status === "completed").length;
    const inProgress = filtered.filter((r) => r.status === "in_progress").length;
    const pending = filtered.filter((r) => r.status === "pending" || r.status === null).length;
    return {
      total, completed, inProgress, pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [filtered]);

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("recommendations").update({ status: status as any }).eq("id", id);
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
      return;
    }
    setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r)));
    toast({ title: t("recommendations.statusUpdated") });
  };

  const buildExportLabels = (): ExportLabels => ({
    isArabic: language === "ar",
    documentTitle: t("recommendations.exportTitle"),
    year: t("common.academicYear"),
    program: t("recommendations.programLabel"),
    semester: t("common.semester"),
    course: t("recommendations.courseName"),
    title: t("recommendations.titleLabel"),
    description: t("recommendations.recommendationText"),
    priority: t("recommendations.priority"),
    status: t("recommendations.status"),
    source: t("recommendations.source"),
    notTracked: t("recommendations.notTracked"),
    none: t("recommendations.noCourses"),
    semesterLabel: (s) =>
      s === "first" ? t("recommendations.firstSem")
        : s === "second" ? t("recommendations.secondSem")
        : s === "summer" ? t("recommendations.summerSemester")
        : s || "-",
    statusLabel: (s) =>
      s === "completed" ? t("recommendations.completed")
        : s === "in_progress" ? t("recommendations.inProgress")
        : s === "postponed" ? t("recommendations.postponed")
        : t("recommendations.pending"),
    priorityLabel: (p) =>
      p === "high" ? t("recommendations.high")
        : p === "low" ? t("recommendations.low")
        : p ? t("recommendations.medium") : "-",
    sourceLabel: (k) => (k === "report" ? t("recommendations.sourceReport") : t("recommendations.sourceManual")),
  });

  const handleExport = async (format: "excel" | "pdf", year: string, items: UnifiedRecommendation[]) => {
    if (items.length === 0) {
      toast({ title: t("recommendations.exportEmpty"), variant: "destructive" });
      return;
    }
    try {
      const labels = buildExportLabels();
      if (format === "excel") await exportRecommendationsExcel(year, items, labels);
      else await exportRecommendationsPDF(year, items, labels);
      toast({ title: t("recommendations.exportDone") });
    } catch (e) {
      console.error("Recommendations export failed", e);
      toast({ title: t("recommendations.exportError"), variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("recommendations").update(formData as any).eq("id", editingId);
        if (error) throw error;
        toast({ title: t('common.updated') });
      } else {
        const { error } = await supabase.from("recommendations").insert(formData as any);
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

  const handleEdit = (id: string) => {
    const rec = recommendations.find((r) => r.id === id);
    if (!rec) return;
    setFormData({
      title: rec.title || "", description: rec.description || "", program_id: rec.program_id || "",
      priority: rec.priority || "medium", status: rec.status || "pending", source_type: rec.source_type || "survey",
      academic_year: rec.academic_year || "", semester: rec.semester || "",
    });
    setEditingId(id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", program_id: "", priority: "medium", status: "pending", source_type: "survey", academic_year: new Date().getFullYear().toString(), semester: "" });
    setEditingId(null);
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
                          <SelectItem value="postponed">{t('recommendations.postponed')}</SelectItem>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.total')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.completed')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{stats.completed}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.inProgress')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.pending')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-orange-600">{stats.pending}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">{t('recommendations.completionRate')}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.completionRate}%</div><Progress value={stats.completionRate} className="mt-2" /></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
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
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                className="ltr:pl-9 rtl:pr-9"
                placeholder={t('recommendations.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Unified record grouped by academic year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {t('recommendations.recordTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {yearGroups.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">{t('recommendations.noResults')}</p>
            ) : (
              <Accordion type="multiple" defaultValue={[yearGroups[0][0] || "__none__"]} className="space-y-2">
                {yearGroups.map(([year, items]) => {
                  const completed = items.filter((i) => i.status === "completed").length;
                  const rate = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
                  return (
                    <AccordionItem key={year || "__none__"} value={year || "__none__"} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-1 flex-wrap items-center gap-3 text-start">
                          <span className="font-semibold">{year || t('recommendations.unknownYear')}</span>
                          <Badge variant="secondary">{items.length} {t('recommendations.itemsCount')}</Badge>
                          <Badge variant="outline">{t('recommendations.completionRate')}: {rate}%</Badge>
                          <div className="ms-auto flex items-center gap-2 pe-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              onClick={(e) => { e.stopPropagation(); handleExport("excel", year, items); }}
                            >
                              <span><FileSpreadsheet className="h-4 w-4 me-1" />{t('recommendations.exportExcel')}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              onClick={(e) => { e.stopPropagation(); handleExport("pdf", year, items); }}
                            >
                              <span><FileText className="h-4 w-4 me-1" />{t('recommendations.exportPDF')}</span>
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-6">
                        <RecommendationYearGroup
                          items={items}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEdit}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Recommendations;
