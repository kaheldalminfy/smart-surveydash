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
  { keywords: ['تقييم الطلاب للمقرر', 'تقييم المقرر', 'رضا الطلاب عن المقرر'], label: 'رضا الطلاب عن المقررات' },
  { keywords: ['عضو هيئة التدريس', 'هيئة تدريس', 'رضا أعضاء'], label: 'رضا أعضاء هيئة التدريس' },
  { keywords: ['الامتحان النهائي', 'امتحان نهائي', 'الاختبار النهائي'], label: 'رضا الطلاب عن الامتحان النهائي' },
  { keywords: ['تقييم الخريج', 'خريجين', 'الخريج'], label: 'تقييم الخريجين' },
  { keywords: ['ورشة عمل', 'ورش عمل'], label: 'تقييم ورش العمل' },
];

function classifySurveyTitle(title: string): string {
  const normalized = title.trim();
  for (const { keywords, label } of SURVEY_TYPE_KEYWORDS) {
    if (keywords.some(k => normalized.includes(k))) return label;
  }
  return normalized;
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
      // For each program, fetch surveys with responses and answers
      const programSurveyMap: Record<string, { title: string; scores: number[]; responseCount: number }[]> = {};

      for (const programId of selectedPrograms) {
        let query = supabase
          .from("surveys")
          .select(`
            id, title,
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
        if (!surveys) { programSurveyMap[programId] = []; continue; }

        programSurveyMap[programId] = surveys.map(s => {
          const scores: number[] = [];
          let respCount = 0;
          for (const r of (s.responses || [])) {
            respCount++;
            for (const a of (r.answers || [])) {
              const q = a.questions as any;
              if ((q?.type === 'likert' || q?.type === 'rating') && a.numeric_value && a.numeric_value >= 1 && a.numeric_value <= 5) {
                scores.push(a.numeric_value);
              }
            }
          }
          return { title: s.title, scores, responseCount: respCount };
        });
      }

      // Group by survey type across programs
      const allTypesMap: Record<string, Record<string, { scores: number[]; responseCount: number }>> = {};

      for (const programId of selectedPrograms) {
        const surveys = programSurveyMap[programId];
        // Group surveys of same program by type
        const byType: Record<string, { scores: number[]; responseCount: number }> = {};
        for (const s of surveys) {
          const type = classifySurveyTitle(s.title);
          if (!byType[type]) byType[type] = { scores: [], responseCount: 0 };
          byType[type].scores.push(...s.scores);
          byType[type].responseCount += s.responseCount;
        }
        for (const [type, data] of Object.entries(byType)) {
          if (!allTypesMap[type]) allTypesMap[type] = {};
          allTypesMap[type][programId] = data;
        }
      }

      // Build surveyTypes
      const surveyTypes: SurveyTypeComparison[] = Object.entries(allTypesMap).map(([title, progMap]) => ({
        title,
        programData: selectedProgramsWithColors.map(p => {
          const d = progMap[p.id];
          if (!d || d.scores.length === 0) {
            return { programId: p.id, programName: p.name, averageScore: 0, responseCount: d?.responseCount || 0, exists: !!d };
          }
          const avg = d.scores.reduce((a, b) => a + b, 0) / d.scores.length;
          return { programId: p.id, programName: p.name, averageScore: parseFloat(avg.toFixed(2)), responseCount: d.responseCount, exists: true };
        }),
      }));

      // Build overall
      const overall: OverallData[] = selectedProgramsWithColors.map(p => {
        const surveys = programSurveyMap[p.id];
        const allScores = surveys.flatMap(s => s.scores);
        const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0);
        const mean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
        return {
          programName: p.name,
          programId: p.id,
          color: p.color,
          overallMean: parseFloat(mean.toFixed(2)),
          totalResponses,
          totalSurveys: surveys.length,
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
