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
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchAllCompleteSurveyResponses, fetchAllSurveyQuestions, mapWithConcurrency } from "@/lib/paginatedSurveyData";

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
  const { t } = useLanguage();
  const [mode, setMode] = useState<'programs' | 'surveys'>('programs');
  const [programs, setPrograms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [singleProgram, setSingleProgram] = useState<string>('');
  const [availableSurveys, setAvailableSurveys] = useState<{ id: string; title: string }[]>([]);
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (mode !== 'surveys' || !singleProgram || !selectedAcademicYear) {
      setAvailableSurveys([]);
      setSelectedSurveyIds([]);
      return;
    }
    (async () => {
      let query = supabase
        .from("surveys")
        .select("id, title")
        .eq("program_id", singleProgram)
        .eq("academic_year", selectedAcademicYear)
        .order("created_at", { ascending: false });
      if (selectedSemester && selectedSemester !== 'all') {
        query = query.eq("semester", selectedSemester);
      }
      const { data } = await query;
      setAvailableSurveys(data || []);
      setSelectedSurveyIds([]);
      setComparisonResult(null);
    })();
  }, [mode, singleProgram, selectedAcademicYear, selectedSemester]);

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

  const selectedSurveysWithColors = useMemo(() => {
    return selectedSurveyIds.map((id, i) => ({
      id,
      name: availableSurveys.find(s => s.id === id)?.title || '',
      color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
    }));
  }, [selectedSurveyIds, availableSurveys]);

  const entities = mode === 'programs' ? selectedProgramsWithColors : selectedSurveysWithColors;


  const loadSurveyComparison = async () => {
    if (!selectedAcademicYear) {
      toast({ title: t('progComp.notice'), description: t('progComp.needAY'), variant: "destructive" });
      return;
    }
    if (!singleProgram) {
      toast({ title: t('progComp.notice'), description: t('progComp.needProgram'), variant: "destructive" });
      return;
    }
    if (selectedSurveyIds.length < 2) {
      toast({ title: t('progComp.notice'), description: t('progComp.minSurveys'), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const perSurvey = await mapWithConcurrency(selectedSurveysWithColors, 4, async (entity) => {
        const [questions, responses] = await Promise.all([
          fetchAllSurveyQuestions(entity.id),
          fetchAllCompleteSurveyResponses(entity.id),
        ]);
        const ratingQuestions = questions.filter(
          q => (q.type === 'likert' || q.type === 'rating') && !q.is_archived,
        );
        const ratingIds = new Set(ratingQuestions.map(q => q.id));
        const answers = responses
          .flatMap(r => r.answers)
          .filter(a => ratingIds.has(a.question_id) && a.numeric_value !== null && a.numeric_value >= 1 && a.numeric_value <= 5);

        const byQuestion = new Map<string, { text: string; values: number[] }>();
        for (const q of ratingQuestions.sort((a, b) => a.order_index - b.order_index)) {
          byQuestion.set(q.id, { text: q.text, values: [] });
        }
        for (const a of answers) {
          byQuestion.get(a.question_id)?.values.push(a.numeric_value as number);
        }

        return {
          entity,
          responseCount: responses.length,
          totalSurveys: 1,
          allScores: answers.map(a => a.numeric_value as number),
          questions: [...byQuestion.values()],
        };
      });

      // Cluster questions across surveys by similarity
      const rows: { label: string; values: Map<string, { avg: number; count: number }> }[] = [];
      for (const s of perSurvey) {
        for (const q of s.questions) {
          if (q.values.length === 0) continue;
          const avg = q.values.reduce((a, b) => a + b, 0) / q.values.length;
          const existing = rows.find(r => !r.values.has(s.entity.id) && questionsMatch(r.label, q.text));
          if (existing) {
            existing.values.set(s.entity.id, { avg, count: q.values.length });
            if (q.text.length < existing.label.length) existing.label = q.text;
          } else {
            const row = { label: q.text, values: new Map<string, { avg: number; count: number }>() };
            row.values.set(s.entity.id, { avg, count: q.values.length });
            rows.push(row);
          }
        }
      }

      const surveyTypes: SurveyTypeComparison[] = rows.map(row => ({
        title: row.label,
        programData: selectedSurveysWithColors.map(e => {
          const v = row.values.get(e.id);
          return {
            programId: e.id,
            programName: e.name,
            averageScore: v ? parseFloat(v.avg.toFixed(2)) : 0,
            responseCount: v?.count || 0,
            exists: !!v,
          };
        }),
      }));

      const overall: OverallData[] = perSurvey.map(s => {
        const mean = s.allScores.length > 0 ? s.allScores.reduce((a, b) => a + b, 0) / s.allScores.length : 0;
        return {
          programName: s.entity.name,
          programId: s.entity.id,
          color: s.entity.color,
          overallMean: parseFloat(mean.toFixed(2)),
          totalResponses: s.responseCount,
          totalSurveys: 1,
          satisfactionRate: ((mean / 5) * 100).toFixed(1),
        };
      });

      setComparisonResult({ surveyTypes, overall });
    } catch (error) {
      toast({ title: t('progComp.error'), description: t('progComp.loadErr'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    if (mode === 'surveys') return loadSurveyComparison();
    if (selectedPrograms.length < 2) {
      toast({ title: t('progComp.notice'), description: t('progComp.minPrograms'), variant: "destructive" });
      return;
    }

    if (!selectedAcademicYear) {
      toast({ title: t('progComp.notice'), description: t('progComp.needAY'), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const allSurveysFlat: SurveyWithQuestions[] = [];

      for (const programId of selectedPrograms) {
        let query = supabase
          .from("surveys")
          .select("id, title")
          .eq("program_id", programId)
          .eq("academic_year", selectedAcademicYear);

        if (selectedSemester && selectedSemester !== 'all') {
          query = query.eq("semester", selectedSemester);
        }

        const { data: surveys, error: surveysError } = await query;
        if (surveysError) throw surveysError;

        const programSurveys = await mapWithConcurrency(surveys || [], 6, async (survey) => {
          const [questions, responses] = await Promise.all([
            fetchAllSurveyQuestions(survey.id),
            fetchAllCompleteSurveyResponses(survey.id),
          ]);
          const ratingQuestionIds = new Set(
            questions
              .filter(question => question.type === 'likert' || question.type === 'rating')
              .map(question => question.id),
          );
          const likertQuestions = questions
            .filter(question => !question.is_archived && ratingQuestionIds.has(question.id))
            .sort((a, b) => a.order_index - b.order_index)
            .map(question => question.text);
          const scores = responses
            .flatMap(response => response.answers)
            .filter(answer => ratingQuestionIds.has(answer.question_id))
            .map(answer => answer.numeric_value)
            .filter((value): value is number => value !== null && value >= 1 && value <= 5);

          return {
            id: survey.id,
            title: survey.title,
            programId,
            likertQuestions,
            scores,
            responseCount: responses.length,
          };
        });
        allSurveysFlat.push(...programSurveys);
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
      toast({ title: t('progComp.error'), description: t('progComp.loadErr'), variant: "destructive" });
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
            <span className="font-bold">{entry.value !== null ? `${entry.value}/5` : t('progComp.unavailable')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('progComp.title')}
          </CardTitle>
          <CardDescription>{t('progComp.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode */}
          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium">{t('progComp.mode')}</label>
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as 'programs' | 'surveys');
                setComparisonResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="programs">{t('progComp.modePrograms')}</SelectItem>
                <SelectItem value="surveys">{t('progComp.modeSurveys')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Academic Year */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('progComp.academicYear')} <span className="text-destructive">*</span></label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger>
                  <SelectValue placeholder={t('progComp.selectAY')} />
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
              <label className="text-sm font-medium">{t('progComp.semester')}</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder={t('progComp.allSemesters')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('progComp.allSemesters')}</SelectItem>
                  <SelectItem value="خريف">{t('progComp.fall')}</SelectItem>
                  <SelectItem value="ربيع">{t('progComp.spring')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Programs (multi) */}
            {mode === 'programs' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('progComp.selectPrograms')}</label>
                <Select
                  onValueChange={(value) => {
                    if (!selectedPrograms.includes(value)) {
                      setSelectedPrograms([...selectedPrograms, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('progComp.addProgram')} />
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
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('progComp.selectProgram')} <span className="text-destructive">*</span></label>
                <Select
                  value={singleProgram}
                  onValueChange={(v) => { setSingleProgram(v); setComparisonResult(null); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('progComp.selectOneProgram')} />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Surveys picker */}
          {mode === 'surveys' && singleProgram && selectedAcademicYear && (
            <div className="space-y-2 max-w-xl">
              <label className="text-sm font-medium">{t('progComp.selectSurveys')}</label>
              {availableSurveys.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('progComp.noSurveys')}</p>
              ) : (
                <Select
                  onValueChange={(value) => {
                    if (!selectedSurveyIds.includes(value)) {
                      setSelectedSurveyIds([...selectedSurveyIds, value]);
                      setComparisonResult(null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('progComp.addSurvey')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSurveys
                      .filter(s => !selectedSurveyIds.includes(s.id))
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Selected badges */}
          <div className="flex flex-wrap gap-2">
            {entities.map((p) => (
              <Badge
                key={p.id}
                className="cursor-pointer text-white px-3 py-1 text-sm"
                style={{ backgroundColor: p.color }}
                onClick={() => {
                  if (mode === 'programs') {
                    setSelectedPrograms(selectedPrograms.filter(id => id !== p.id));
                  } else {
                    setSelectedSurveyIds(selectedSurveyIds.filter(id => id !== p.id));
                  }
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
            disabled={loading || entities.length < 2 || !selectedAcademicYear || (mode === 'surveys' && !singleProgram)}
            className="w-full md:w-auto"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> {t('progComp.analyzing')}</> : t('progComp.start')}
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
                      <div className="text-muted-foreground text-xs">{t('progComp.surveys')}</div>
                      <div className="text-xl font-bold">{p.totalSurveys}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-muted-foreground text-xs">{t('progComp.responses')}</div>
                      <div className="text-xl font-bold">{p.totalResponses}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">{t('progComp.overallMean')}</span>
                    <span className="text-lg font-bold" style={{ color: p.color }}>{p.overallMean}/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('progComp.satisfaction')}</span>
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
                  {t('progComp.byType')}
                </CardTitle>
                <CardDescription>{t('progComp.byTypeDesc')}</CardDescription>
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
                    {entities.map((p) => (
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
                  {t('progComp.radarTitle')}
                </CardTitle>
                <CardDescription>{t('progComp.radarDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                    {entities.map((p) => (
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
                {t('progComp.tableTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right min-w-[200px]">{t('progComp.tableType')}</TableHead>
                      {entities.map(p => (
                        <TableHead key={p.id} className="text-center min-w-[120px]">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </div>
                        </TableHead>
                      ))}
                      {entities.length === 2 && (
                        <TableHead className="text-center min-w-[80px]">{t('progComp.diff')}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonResult.surveyTypes.map((st, i) => {
                      const scores = st.programData.map(pd => pd.exists ? pd.averageScore : null);
                      const diff = entities.length === 2 && scores[0] !== null && scores[1] !== null
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
                                <span className="text-muted-foreground text-xs">{t('progComp.unavailable')}</span>
                              )}
                            </TableCell>
                          ))}
                          {entities.length === 2 && (
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
                      <TableCell className="text-right">{t('progComp.overallRow')}</TableCell>
                      {comparisonResult.overall.map((p, i) => (
                        <TableCell key={i} className="text-center">
                          <span style={{ color: p.color }}>{p.overallMean}</span>
                        </TableCell>
                      ))}
                      {entities.length === 2 && (
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
