import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, Printer, FileBarChart } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchAllCompleteSurveyResponses, fetchAllSurveyQuestions } from "@/lib/paginatedSurveyData";
import {
  normalizeSemester, meanOf, performanceLevel, aggregateQuestions, type SemesterKey,
} from "@/utils/annualReport";

interface SurveyStat {
  id: string; title: string; semester: SemesterKey; responses: number;
  target: number | null; mean: number | null;
  questions: { text: string; values: number[] }[];
}

const AnnualProgramReport = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [programId, setProgramId] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SurveyStat[] | null>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    supabase.from("programs").select("id,name").order("name").then(({ data }) => setPrograms(data ?? []));
    supabase.from("surveys").select("academic_year").not("academic_year", "is", null).then(({ data }) => {
      const ys = Array.from(new Set((data ?? []).map((d) => d.academic_year!.trim()))).sort().reverse();
      setYears(ys);
    });
  }, []);

  const generate = async () => {
    if (!programId || !year) return;
    setLoading(true); setStats(null);
    try {
      const { data: surveys, error } = await supabase.from("surveys")
        .select("id,title,semester,target_enrollment").eq("program_id", programId).eq("academic_year", year);
      if (error) throw error;
      const relevant = (surveys ?? []).filter((s) => normalizeSemester(s.semester));
      const result: SurveyStat[] = [];
      for (const s of relevant) {
        const [qs, rs] = await Promise.all([fetchAllSurveyQuestions(s.id), fetchAllCompleteSurveyResponses(s.id)]);
        const scored = qs.filter((q) => q.type === "likert" || q.type === "rating");
        const byQ = new Map<string, number[]>();
        rs.forEach((r) => r.answers.forEach((a) => {
          if (a.numeric_value == null || a.numeric_value < 1 || a.numeric_value > 5) return;
          if (!scored.some((q) => q.id === a.question_id)) return;
          byQ.set(a.question_id, [...(byQ.get(a.question_id) ?? []), a.numeric_value]);
        }));
        const questions = scored.map((q) => ({ text: q.text.trim(), values: byQ.get(q.id) ?? [] }));
        result.push({
          id: s.id, title: s.title, semester: normalizeSemester(s.semester)!, responses: rs.length,
          target: s.target_enrollment, mean: meanOf(questions.flatMap((q) => q.values)), questions,
        });
      }
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase.from("recommendations").select("title,description,status,semester,course_name").eq("program_id", programId).eq("academic_year", year),
        supabase.from("complaints").select("status,semester").eq("program_id", programId).eq("academic_year", year),
      ]);
      setRecs(r ?? []); setComplaints(c ?? []); setStats(result);
    } catch (e: any) {
      toast({ title: ar ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const sem = (k: SemesterKey) => (k === "fall" ? (ar ? "الخريف" : "Fall") : (ar ? "الربيع" : "Spring"));

  const summary = useMemo(() => {
    if (!stats) return null;
    const by = (k: SemesterKey) => {
      const list = stats.filter((s) => s.semester === k);
      const responses = list.reduce((a, s) => a + s.responses, 0);
      const target = list.reduce((a, s) => a + (s.target ?? 0), 0);
      return {
        count: list.length, responses,
        rate: target > 0 ? Math.min(100, (responses / target) * 100) : null,
        mean: meanOf(list.flatMap((s) => s.questions.flatMap((q) => q.values))),
      };
    };
    const fall = by("fall"), spring = by("spring");
    const annualMean = meanOf(stats.flatMap((s) => s.questions.flatMap((q) => q.values)));
    const questions = aggregateQuestions(stats);
    return { fall, spring, annualMean, questions };
  }, [stats]);

  const recCounts = {
    completed: recs.filter((r) => r.status === "completed").length,
    in_progress: recs.filter((r) => r.status === "in_progress").length,
    pending: recs.filter((r) => r.status === "pending" || r.status === "postponed" || !r.status).length,
  };
  const recLabel = (s: string) => s === "completed" ? (ar ? "أُنجز" : "Done") : s === "in_progress" ? (ar ? "تحت الإنجاز" : "In progress") : (ar ? "لم يتم الإنجاز" : "Not done");
  const programName = programs.find((p) => p.id === programId)?.name ?? "";
  const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));
  const strengths = summary?.questions.filter((q) => q.mean != null && q.mean >= 4).slice(0, 8) ?? [];
  const weaknesses = summary?.questions.filter((q) => q.mean != null && q.mean < 3.5).sort((a, b) => a.mean! - b.mean!).slice(0, 8) ?? [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="h-6 w-6" />{ar ? "التقرير السنوي للبرنامج" : "Annual Program Report"}</h1>
          <DashboardButton />
        </div>

        <Card className="print:hidden">
          <CardContent className="pt-6 grid gap-4 md:grid-cols-3 items-end">
            <div>
              <label className="text-sm font-medium">{ar ? "البرنامج" : "Program"}</label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر البرنامج" : "Select program"} /></SelectTrigger>
                <SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{ar ? "السنة الأكاديمية" : "Academic year"}</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر السنة" : "Select year"} /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={generate} disabled={!programId || !year || loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin mx-1" />}{ar ? "إنشاء التقرير" : "Generate"}
              </Button>
              {stats && <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mx-1" />{ar ? "طباعة / PDF" : "Print / PDF"}</Button>}
            </div>
          </CardContent>
        </Card>

        {stats && summary && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold">{ar ? "التقرير السنوي لتقييم البرنامج الأكاديمي" : "Annual Academic Program Evaluation Report"}</h2>
              <p className="text-muted-foreground">{programName} — {ar ? "السنة الأكاديمية" : "Academic year"} {year}</p>
            </div>

            {stats.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">{ar ? "لا توجد استبيانات لفصلي الخريف والربيع لهذا البرنامج في هذه السنة." : "No Fall/Spring surveys for this program and year."}</CardContent></Card>
            ) : (<>
              <Card>
                <CardHeader><CardTitle>{ar ? "1. المؤشرات الرئيسية" : "1. Key indicators"}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{ar ? "المؤشر" : "Indicator"}</TableHead><TableHead>{sem("fall")}</TableHead><TableHead>{sem("spring")}</TableHead><TableHead>{ar ? "السنوي" : "Annual"}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      <TableRow><TableCell>{ar ? "عدد الاستبيانات" : "Surveys"}</TableCell><TableCell>{summary.fall.count}</TableCell><TableCell>{summary.spring.count}</TableCell><TableCell>{stats.length}</TableCell></TableRow>
                      <TableRow><TableCell>{ar ? "عدد الاستجابات" : "Responses"}</TableCell><TableCell>{summary.fall.responses}</TableCell><TableCell>{summary.spring.responses}</TableCell><TableCell>{summary.fall.responses + summary.spring.responses}</TableCell></TableRow>
                      <TableRow><TableCell>{ar ? "نسبة الاستجابة" : "Response rate"}</TableCell><TableCell>{summary.fall.rate == null ? "—" : `${summary.fall.rate.toFixed(0)}%`}</TableCell><TableCell>{summary.spring.rate == null ? "—" : `${summary.spring.rate.toFixed(0)}%`}</TableCell><TableCell>—</TableCell></TableRow>
                      <TableRow><TableCell>{ar ? "متوسط الرضا (من 5)" : "Mean (of 5)"}</TableCell><TableCell>{fmt(summary.fall.mean)}</TableCell><TableCell>{fmt(summary.spring.mean)}</TableCell><TableCell className="font-bold">{fmt(summary.annualMean)}</TableCell></TableRow>
                      <TableRow><TableCell>{ar ? "مستوى الأداء" : "Level"}</TableCell><TableCell>{performanceLevel(summary.fall.mean, ar)}</TableCell><TableCell>{performanceLevel(summary.spring.mean, ar)}</TableCell><TableCell>{performanceLevel(summary.annualMean, ar)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                  {summary.fall.mean != null && summary.spring.mean != null && (
                    <p className="mt-3 text-sm">
                      {ar ? "التغير من الخريف إلى الربيع: " : "Change Fall → Spring: "}
                      <Badge variant={summary.spring.mean >= summary.fall.mean ? "default" : "destructive"}>
                        {(summary.spring.mean - summary.fall.mean >= 0 ? "+" : "") + (summary.spring.mean - summary.fall.mean).toFixed(2)}
                      </Badge>
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>{ar ? "2. نتائج الاستبيانات حسب الفصل" : "2. Survey results by semester"}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.map((s) => ({ name: s.title.slice(0, 25), full: s.title, [sem("fall")]: s.semester === "fall" ? Number(fmt(s.mean)) || 0 : null, [sem("spring")]: s.semester === "spring" ? Number(fmt(s.mean)) || 0 : null }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} height={60} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.full} />
                        <Legend />
                        <Bar dataKey={sem("fall")} fill="hsl(var(--primary))" />
                        <Bar dataKey={sem("spring")} fill="hsl(var(--accent-foreground))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{ar ? "الاستبيان" : "Survey"}</TableHead><TableHead>{ar ? "الفصل" : "Semester"}</TableHead><TableHead>{ar ? "الاستجابات" : "Responses"}</TableHead><TableHead>{ar ? "المتوسط" : "Mean"}</TableHead><TableHead>{ar ? "المستوى" : "Level"}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{[...stats].sort((a, b) => a.semester.localeCompare(b.semester)).map((s) => (
                      <TableRow key={s.id}><TableCell>{s.title}</TableCell><TableCell>{sem(s.semester)}</TableCell><TableCell>{s.responses}{s.target ? ` / ${s.target}` : ""}</TableCell><TableCell>{fmt(s.mean)}</TableCell><TableCell>{performanceLevel(s.mean, ar)}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>{ar ? "3. نقاط القوة وفرص التحسين" : "3. Strengths & improvement areas"}</CardTitle>
                  <CardDescription>{ar ? "القوة: متوسط ≥ 4 — التحسين: متوسط < 3.5 (أسئلة ليكرت/التقييم فقط)" : "Strength: mean ≥ 4 — Improvement: mean < 3.5 (Likert/rating only)"}</CardDescription></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  {[{ title: ar ? "نقاط القوة" : "Strengths", list: strengths }, { title: ar ? "فرص التحسين" : "Improvement areas", list: weaknesses }].map((b) => (
                    <div key={b.title}>
                      <h4 className="font-semibold mb-2">{b.title}</h4>
                      {b.list.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
                        <ul className="space-y-1 text-sm">{b.list.map((q) => <li key={q.text} className="flex justify-between gap-2 border-b pb-1"><span>{q.text}</span><Badge variant="outline">{fmt(q.mean)}</Badge></li>)}</ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>)}

            <Card>
              <CardHeader><CardTitle>{ar ? "4. متابعة التوصيات" : "4. Recommendations follow-up"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge>{recLabel("completed")}: {recCounts.completed}</Badge>
                  <Badge variant="secondary">{recLabel("in_progress")}: {recCounts.in_progress}</Badge>
                  <Badge variant="outline">{recLabel("pending")}: {recCounts.pending}</Badge>
                  <Badge variant="outline">{ar ? "نسبة الإنجاز" : "Completion"}: {recs.length ? Math.round((recCounts.completed / recs.length) * 100) : 0}%</Badge>
                </div>
                {recs.length > 0 && (
                  <Table>
                    <TableHeader><TableRow><TableHead>{ar ? "التوصية" : "Recommendation"}</TableHead><TableHead>{ar ? "المقرر" : "Course"}</TableHead><TableHead>{ar ? "الفصل" : "Semester"}</TableHead><TableHead>{ar ? "الحالة" : "Status"}</TableHead></TableRow></TableHeader>
                    <TableBody>{recs.map((r, i) => (
                      <TableRow key={i}><TableCell className="max-w-md">{r.description || r.title}</TableCell><TableCell>{r.course_name || "—"}</TableCell><TableCell>{r.semester || "—"}</TableCell><TableCell>{recLabel(r.status)}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{ar ? "5. الشكاوى" : "5. Complaints"}</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{ar ? "الإجمالي" : "Total"}: {complaints.length}</Badge>
                <Badge>{ar ? "تم الحل" : "Resolved"}: {complaints.filter((c) => c.status === "resolved" || c.status === "closed").length}</Badge>
                <Badge variant="secondary">{ar ? "قيد المعالجة" : "In progress"}: {complaints.filter((c) => c.status === "in_progress").length}</Badge>
                <Badge variant="outline">{ar ? "جديدة" : "New"}: {complaints.filter((c) => c.status === "pending").length}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{ar ? "6. التحليل العام وخطة التحسين للعام القادم" : "6. Analysis & next-year improvement plan"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{ar ? "تحليل المنسق للنتائج" : "Coordinator analysis"}</label>
                  <Textarea rows={4} value={analysis} onChange={(e) => setAnalysis(e.target.value)} className="print:border-0" />
                </div>
                <div>
                  <label className="text-sm font-medium">{ar ? "خطة التحسين (الإجراء، المسؤول، الموعد، مؤشر القياس)" : "Improvement plan (action, owner, date, KPI)"}</label>
                  <Textarea rows={5} value={plan} onChange={(e) => setPlan(e.target.value)} className="print:border-0" />
                </div>
                <div className="hidden print:grid grid-cols-2 gap-8 pt-10 text-sm">
                  <div>{ar ? "منسق البرنامج: ................" : "Program coordinator: ........"}</div>
                  <div>{ar ? "رئيس القسم / العميد: ................" : "Head / Dean: ........"}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnualProgramReport;
