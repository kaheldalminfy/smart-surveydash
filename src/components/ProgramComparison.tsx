import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";
import { TrendingUp, Award, Star, BarChart3, Radar as RadarIcon, TableIcon, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PROGRAM_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const SURVEY_TYPE_KEYWORDS: { keywords: string[]; label: string }[] = [
  { keywords: ['تقييم الطلاب للمقرر', 'تقييم المقرر', 'رضا الطلاب عن المقرر', 'نموذج تقييم الطلاب للمقرر', 'استبانة تقييم الطلاب للمقرر'], label: 'رضا الطلاب عن المقررات' },
  { keywords: ['عضو هيئة التدريس', 'هيئة تدريس', 'رضا أعضاء', 'رضا عضو هيئة التدريس عن جودة', 'استبانة تقييم عضو هيئة التدريس'], label: 'رضا أعضاء هيئة التدريس' },
  { keywords: ['الامتحان النهائي', 'امتحان نهائي', 'الاختبار النهائي', 'نموذج تقييم مدى رضا الطالب عن الامتحان'], label: 'رضا الطلاب عن الامتحان النهائي' },
  { keywords: ['تقييم الخريج', 'خريجين', 'الخريج', 'ورشة عمل للخريجين'], label: 'تقييم الخريجين' },
  { keywords: ['ورشة عمل', 'ورش عمل', 'تقييم ورشة عمل'], label: 'تقييم ورش العمل' },
  { keywords: ['تقييم جودة البرنامج', 'تقييم البرنامج'], label: 'تقييم البرنامج الأكاديمي' },
];

function classifySurveyTitle(title: string): string {
  const normalized = title.trim();
  for (const { keywords, label } of SURVEY_TYPE_KEYWORDS) {
    if (keywords.some(k => normalized.includes(k))) return label;
  }
  return normalized;
}

// --- Question-based similarity matching ---

function normalizeText(text: string): string {
  return text
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(' ').filter(w => w.length > 1));
  const wordsB = new Set(normalizeText(b).split(' ').filter(w => w.length > 1));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) { if (wordsB.has(w)) common++; }
  return common / Math.max(wordsA.size, wordsB.size);
}

function questionsMatch(qA: string, qB: string): boolean {
  const nA = normalizeText(qA);
  const nB = normalizeText(qB);
  if (nA.includes(nB) || nB.includes(nA)) return true;
  return wordSimilarity(qA, qB) >= 0.7;
}

function calculateQuestionsSimilarity(questionsA: string[], questionsB: string[]): number {
  if (questionsA.length === 0 && questionsB.length === 0) return 1;
  if (questionsA.length === 0 || questionsB.length === 0) return 0;
  const usedB = new Set<number>();
  let matches = 0;
  for (const qA of questionsA) {
    for (let j = 0; j < questionsB.length; j++) {
      if (!usedB.has(j) && questionsMatch(qA, questionsB[j])) {
        matches++;
        usedB.add(j);
        break;
      }
    }
  }
  return matches / Math.max(questionsA.length, questionsB.length);
}

interface SurveyWithQuestions {
  id: string;
  title: string;
  programId: string;
  likertQuestions: string[];
  scores: number[];
  responseCount: number;
}

interface SurveyCluster {
  label: string;
  surveys: SurveyWithQuestions[];
}

function clusterSurveys(allSurveys: SurveyWithQuestions[]): SurveyCluster[] {
  const clusters: SurveyCluster[] = [];
  const SIMILARITY_THRESHOLD = 0.5;

  for (const survey of allSurveys) {
    let bestCluster: SurveyCluster | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      // Compare with first survey in cluster (representative)
      const rep = cluster.surveys[0];
      // Try question similarity first
      const qSim = calculateQuestionsSimilarity(survey.likertQuestions, rep.likertQuestions);
      if (qSim >= SIMILARITY_THRESHOLD && qSim > bestScore) {
        bestScore = qSim;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.surveys.push(survey);
    } else {
      // Check if keyword fallback groups it with an existing cluster
      const surveyType = classifySurveyTitle(survey.title);
      const existingByKeyword = clusters.find(c => {
        const repType = classifySurveyTitle(c.surveys[0].title);
        return repType === surveyType && surveyType !== survey.title.trim();
      });
      if (existingByKeyword) {
        existingByKeyword.surveys.push(survey);
      } else {
        clusters.push({ label: surveyType, surveys: [survey] });
      }
    }
  }

  // Smart labeling: use shortest title or keyword label
  for (const cluster of clusters) {
    const keywordLabel = classifySurveyTitle(cluster.surveys[0].title);
    if (keywordLabel !== cluster.surveys[0].title.trim()) {
      cluster.label = keywordLabel;
    } else {
      // Use shortest title in cluster
      cluster.label = cluster.surveys.reduce((shortest, s) =>
        s.title.length < shortest.length ? s.title : shortest
      , cluster.surveys[0].title);
    }
  }

  return clusters;
}

interface ProgramSurveyData {
  programId: string;
  programName: string;
  averageScore: number;
  responseCount: number;
  exists: boolean;
}

interface SurveyTypeComparison {
  title: string;
  programData: ProgramSurveyData[];
}

interface OverallData {
  programName: string;
  programId: string;
  color: string;
  overallMean: number;
  totalResponses: number;
  totalSurveys: number;
  satisfactionRate: string;
}

interface ComparisonResult {
  surveyTypes: SurveyTypeComparison[];
  overall: OverallData[];
}

const ProgramComparison = () => {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
    loadAcademicYears();
  }, []);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*").order("name");
    setPrograms(data || []);
  };

  const loadAcademicYears = async () => {
    const { data } = await supabase
      .from("surveys")
      .select("academic_year")
      .not("academic_year", "is", null);
    if (data) {
      const unique = [...new Set(data.map(d => d.academic_year).filter(Boolean))] as string[];
      unique.sort().reverse();
      setAcademicYears(unique);
    }
  };

  const selectedProgramsWithColors = useMemo(() => {
    return selectedPrograms.map((id, i) => ({
      id,
      name: programs.find(p => p.id === id)?.name || '',
      color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
    }));
  }, [selectedPrograms, programs]);

  const loadComparisonData = async () => {
    if (selectedPrograms.length < 2) {
      toast({ title: "تنبيه", description: "يرجى اختيار برنامجين على الأقل", variant: "destructive" });
      return;
    }
    if (!selectedAcademicYear) {
      toast({ title: "تنبيه", description: "يرجى اختيار العام الأكاديمي", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const allSurveysFlat: SurveyWithQuestions[] = [];

      for (const programId of selectedPrograms) {
        let query = supabase
          .from("surveys")
          .select(`
            id, title,
            questions (id, text, type, order_index),
            responses (
              id,
              answers (
                numeric_value,
                questions (type)
              )
            )
          `)
          .eq("program_id", programId)
          .eq("academic_year", selectedAcademicYear);

        if (selectedSemester && selectedSemester !== 'all') {
          query = query.eq("semester", selectedSemester);
        }

        const { data: surveys } = await query;
        if (!surveys) continue;

        for (const s of surveys) {
          // Extract likert/rating question texts
          const likertQuestions = ((s.questions || []) as any[])
            .filter((q: any) => q.type === 'likert' || q.type === 'rating')
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((q: any) => q.text);

          // Extract scores
          const scores: number[] = [];
          let respCount = 0;
          for (const r of (s.responses || [])) {
            respCount++;
            for (const a of (r.answers || []) as any[]) {
              const q = a.questions as any;
              if ((q?.type === 'likert' || q?.type === 'rating') && a.numeric_value && a.numeric_value >= 1 && a.numeric_value <= 5) {
                scores.push(a.numeric_value);
              }
            }
          }

          allSurveysFlat.push({
            id: s.id,
            title: s.title,
            programId,
            likertQuestions,
            scores,
            responseCount: respCount,
          });
        }
      }

      // Cluster surveys by question similarity
      const clusters = clusterSurveys(allSurveysFlat);

      // Build surveyTypes from clusters
      const surveyTypes: SurveyTypeComparison[] = clusters.map(cluster => {
        return {
          title: cluster.label,
          programData: selectedProgramsWithColors.map(p => {
            const programSurveys = cluster.surveys.filter(s => s.programId === p.id);
            if (programSurveys.length === 0) {
              return { programId: p.id, programName: p.name, averageScore: 0, responseCount: 0, exists: false };
            }
            const allScores = programSurveys.flatMap(s => s.scores);
            const totalResp = programSurveys.reduce((sum, s) => sum + s.responseCount, 0);
            const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
            return { programId: p.id, programName: p.name, averageScore: parseFloat(avg.toFixed(2)), responseCount: totalResp, exists: true };
          }),
        };
      });

      // Build overall
      const overall: OverallData[] = selectedProgramsWithColors.map(p => {
        const programSurveys = allSurveysFlat.filter(s => s.programId === p.id);
        const allScores = programSurveys.flatMap(s => s.scores);
        const totalResponses = programSurveys.reduce((sum, s) => sum + s.responseCount, 0);
        const mean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
        return {
          programName: p.name,
          programId: p.id,
          color: p.color,
          overallMean: parseFloat(mean.toFixed(2)),
          totalResponses,
          totalSurveys: programSurveys.length,
          satisfactionRate: ((mean / 5) * 100).toFixed(1),
        };
      });

      setComparisonResult({ surveyTypes, overall });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحميل بيانات المقارنة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (!comparisonResult) return [];
    return comparisonResult.surveyTypes.map(st => {
      const row: any = { name: st.title };
      for (const pd of st.programData) {
        row[pd.programName] = pd.exists && pd.averageScore > 0 ? pd.averageScore : null;
        row[`${pd.programName}_responses`] = pd.responseCount;
        row[`${pd.programName}_exists`] = pd.exists;
      }
      return row;
    });
  }, [comparisonResult]);

  // Prepare radar chart data
  const radarChartData = useMemo(() => {
    if (!comparisonResult) return [];
    return comparisonResult.surveyTypes.map(st => {
      const row: any = { subject: st.title };
      for (const pd of st.programData) {
        row[pd.programName] = pd.exists && pd.averageScore > 0 ? pd.averageScore : 0;
      }
      return row;
    });
  }, [comparisonResult]);

  const bestProgram = useMemo(() => {
    if (!comparisonResult) return null;
    return comparisonResult.overall.reduce((best, p) => p.overallMean > (best?.overallMean || 0) ? p : best, comparisonResult.overall[0]);
  }, [comparisonResult]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg text-sm" dir="rtl">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: </span>
            <span className="font-bold">{entry.value !== null ? `${entry.value}/5` : 'غير متوفر'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            مقارنة البرامج الأكاديمية
          </CardTitle>
          <CardDescription>قارن أداء البرامج حسب نوع الاستبيان والعام الأكاديمي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Academic Year */}
            <div className="space-y-2">
              <label className="text-sm font-medium">العام الأكاديمي <span className="text-destructive">*</span></label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العام الأكاديمي" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester */}
            <div className="space-y-2">
              <label className="text-sm font-medium">الفصل الدراسي</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الفصول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفصول</SelectItem>
                  <SelectItem value="خريف">خريف</SelectItem>
                  <SelectItem value="ربيع">ربيع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Programs */}
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر البرامج (2+)</label>
              <Select
                onValueChange={(value) => {
                  if (!selectedPrograms.includes(value)) {
                    setSelectedPrograms([...selectedPrograms, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="أضف برنامج" />
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter(p => !selectedPrograms.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Programs Badges */}
          <div className="flex flex-wrap gap-2">
            {selectedProgramsWithColors.map((p) => (
              <Badge
                key={p.id}
                className="cursor-pointer text-white px-3 py-1 text-sm"
                style={{ backgroundColor: p.color }}
                onClick={() => {
                  setSelectedPrograms(selectedPrograms.filter(id => id !== p.id));
                  setComparisonResult(null);
                }}
              >
                {p.name}
                <X className="h-3 w-3 mr-1" />
              </Badge>
            ))}
          </div>

          <Button
            onClick={loadComparisonData}
            disabled={loading || selectedPrograms.length < 2 || !selectedAcademicYear}
            className="w-full md:w-auto"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري التحليل...</> : 'بدء المقارنة'}
          </Button>
        </CardContent>
      </Card>

      {comparisonResult && (
        <>
          {/* Section 1: KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonResult.overall.map((p) => (
              <Card key={p.programId} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1" style={{ backgroundColor: p.color }} />
                {bestProgram?.programId === p.programId && (
                  <div className="absolute top-3 left-3">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.programName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-muted-foreground text-xs">الاستبيانات</div>
                      <div className="text-xl font-bold">{p.totalSurveys}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-muted-foreground text-xs">الاستجابات</div>
                      <div className="text-xl font-bold">{p.totalResponses}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">المتوسط العام:</span>
                    <span className="text-lg font-bold" style={{ color: p.color }}>{p.overallMean}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">نسبة الرضا:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-primary">{p.satisfactionRate}%</span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Section 2: Grouped Bar Chart */}
          {barChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  مقارنة حسب نوع الاستبيان
                </CardTitle>
                <CardDescription>المتوسط العام لكل نوع استبيان مقسّم حسب البرنامج</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barChartData} barGap={4} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {selectedProgramsWithColors.map((p) => (
                      <Bar
                        key={p.id}
                        dataKey={p.name}
                        fill={p.color}
                        name={p.name}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Radar Chart */}
          {radarChartData.length >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RadarIcon className="h-5 w-5 text-primary" />
                  مخطط الأداء الشامل
                </CardTitle>
                <CardDescription>مقارنة شاملة لأداء البرامج عبر جميع أنواع الاستبيانات</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                    {selectedProgramsWithColors.map((p) => (
                      <Radar
                        key={p.id}
                        name={p.name}
                        dataKey={p.name}
                        stroke={p.color}
                        fill={p.color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-primary" />
                جدول المقارنة التفصيلي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right min-w-[200px]">نوع الاستبيان</TableHead>
                      {selectedProgramsWithColors.map(p => (
                        <TableHead key={p.id} className="text-center min-w-[120px]">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </div>
                        </TableHead>
                      ))}
                      {selectedPrograms.length === 2 && (
                        <TableHead className="text-center min-w-[80px]">الفرق</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonResult.surveyTypes.map((st, i) => {
                      const scores = st.programData.map(pd => pd.exists ? pd.averageScore : null);
                      const diff = selectedPrograms.length === 2 && scores[0] !== null && scores[1] !== null
                        ? parseFloat((scores[0]! - scores[1]!).toFixed(2))
                        : null;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-right">{st.title}</TableCell>
                          {st.programData.map((pd, j) => (
                            <TableCell key={j} className="text-center">
                              {pd.exists && pd.averageScore > 0 ? (
                                <span className="font-semibold">{pd.averageScore}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">غير متوفر</span>
                              )}
                            </TableCell>
                          ))}
                          {selectedPrograms.length === 2 && (
                            <TableCell className="text-center">
                              {diff !== null ? (
                                <Badge
                                  variant="outline"
                                  className={diff > 0 ? 'border-green-500 text-green-600' : diff < 0 ? 'border-red-500 text-red-600' : ''}
                                >
                                  {diff > 0 ? '+' : ''}{diff}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {/* Overall Row */}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell className="text-right">المتوسط العام</TableCell>
                      {comparisonResult.overall.map((p, i) => (
                        <TableCell key={i} className="text-center">
                          <span style={{ color: p.color }}>{p.overallMean}</span>
                        </TableCell>
                      ))}
                      {selectedPrograms.length === 2 && (
                        <TableCell className="text-center">
                          {(() => {
                            const d = parseFloat((comparisonResult.overall[0].overallMean - comparisonResult.overall[1].overallMean).toFixed(2));
                            return (
                              <Badge variant="outline" className={d > 0 ? 'border-green-500 text-green-600' : d < 0 ? 'border-red-500 text-red-600' : ''}>
                                {d > 0 ? '+' : ''}{d}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProgramComparison;
