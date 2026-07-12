import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  LayoutGrid, 
  List,
  FileDown,
  TrendingUp,
  Users,
  FileText,
  AlertCircle,
  GraduationCap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchAllCompleteSurveyResponses, fetchAllSurveyQuestions, mapWithConcurrency } from "@/lib/paginatedSurveyData";
import ProgramSection from "./ProgramSection";

interface Program {
  id: string;
  name: string;
  name_en?: string;
}

export interface SurveyDetail {
  id: string;
  title: string;
  responseCount: number;
  avgSatisfaction: number;
}

export interface ComplaintDetail {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  complainantType: string | null;
}

export interface RecommendationDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  semester: string | null;
  academic_year: string | null;
  program_id: string | null;
}

export interface ProgramStats {
  programId: string;
  programName: string;
  programNameEn?: string;
  colorIndex: number;
  totalResponses: number;
  averageSatisfaction: number;
  totalSurveys: number;
  textCommentsCount: number;
  complaintStats: {
    pending: number;
    inProgress: number;
    resolved: number;
  };
  courseSatisfaction: Array<{
    id: string;
    name: string;
    averageSatisfaction: number;
  }>;
  surveyDetails: SurveyDetail[];
  complaintDetails: ComplaintDetail[];
  recommendations: RecommendationDetail[];
}

interface RoleBasedDashboardProps {
  userRole: 'admin' | 'dean' | 'coordinator' | 'program_manager' | 'faculty';
  userProgramIds: string[];
}

interface SurveyMetric {
  responseCount: number;
  ratingScores: number[];
  textCommentsCount: number;
}

const loadSurveyMetrics = async (surveyIds: string[]) => {
  const entries = await mapWithConcurrency(surveyIds, 6, async (surveyId) => {
    const [questions, responses] = await Promise.all([
      fetchAllSurveyQuestions(surveyId),
      fetchAllCompleteSurveyResponses(surveyId),
    ]);
    const ratingQuestionIds = new Set(
      questions.filter(question => question.type === 'likert' || question.type === 'rating').map(question => question.id),
    );
    const textQuestionIds = new Set(
      questions.filter(question => question.type === 'text').map(question => question.id),
    );
    const answers = responses.flatMap(response => response.answers);
    const ratingScores = answers
      .filter(answer => ratingQuestionIds.has(answer.question_id))
      .map(answer => answer.numeric_value)
      .filter((value): value is number => value !== null && value >= 1 && value <= 5);
    const textCommentsCount = answers.filter(answer =>
      textQuestionIds.has(answer.question_id) && Boolean(answer.value?.trim())
    ).length;

    return [surveyId, { responseCount: responses.length, ratingScores, textCommentsCount }] as const;
  });

  return new Map<string, SurveyMetric>(entries);
};

const RoleBasedDashboard = ({ userRole, userProgramIds }: RoleBasedDashboardProps) => {
  const { language, t } = useLanguage();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programStats, setProgramStats] = useState<ProgramStats[]>([]);
  const [collegeStats, setCollegeStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  
  const isDeanOrAdmin = userRole === 'admin' || userRole === 'dean';

  useEffect(() => {
    loadData();
  }, [userRole, userProgramIds]);

  const loadData = async () => {
    setLoading(true);
    try {
      let programsQuery = supabase.from('programs').select('*');
      
      if (!isDeanOrAdmin && userProgramIds.length > 0) {
        programsQuery = programsQuery.in('id', userProgramIds);
      }
      
      const { data: programsData } = await programsQuery;
      const loadedPrograms = programsData || [];
      setPrograms(loadedPrograms);

      const stats: ProgramStats[] = [];
      
      for (let i = 0; i < loadedPrograms.length; i++) {
        const program = loadedPrograms[i];
        const programStat = await loadProgramStats(program, i);
        stats.push(programStat);
      }
      
      setProgramStats(stats);

      // Load college-level stats (program_id IS NULL)
      if (isDeanOrAdmin) {
        const collegeStat = await loadCollegeLevelStats();
        setCollegeStats(collegeStat);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgramStats = async (program: Program, colorIndex: number): Promise<ProgramStats> => {
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('program_id', program.id);
    if (surveysError) throw surveysError;

    const surveyIds = (surveys || []).map(survey => survey.id);
    const surveyMetrics = await loadSurveyMetrics(surveyIds);
    const surveyDetails: SurveyDetail[] = (surveys || []).map(survey => {
      const metric = surveyMetrics.get(survey.id);
      const ratingScores = metric?.ratingScores || [];
      return {
        id: survey.id,
        title: survey.title,
        responseCount: metric?.responseCount || 0,
        avgSatisfaction: ratingScores.length
          ? ratingScores.reduce((sum, value) => sum + value, 0) / ratingScores.length
          : 0,
      };
    });
    const surveyAverages = surveyDetails
      .map(survey => survey.avgSatisfaction)
      .filter(average => average > 0);
    const averageSatisfaction = surveyAverages.length
      ? surveyAverages.reduce((sum, average) => sum + average, 0) / surveyAverages.length
      : 0;
    const totalResponses = [...surveyMetrics.values()].reduce((sum, metric) => sum + metric.responseCount, 0);
    const textCommentsCount = [...surveyMetrics.values()].reduce((sum, metric) => sum + metric.textCommentsCount, 0);

    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('id, subject, status, created_at, complainant_type')
      .eq('program_id', program.id)
      .order('created_at', { ascending: false });
    if (complaintsError) throw complaintsError;

    const complaintStats = {
      pending: complaints?.filter(c => c.status === 'pending').length || 0,
      inProgress: complaints?.filter(c => c.status === 'in_progress').length || 0,
      resolved: complaints?.filter(c => c.status === 'resolved' || c.status === 'closed').length || 0,
    };

    const complaintDetails: ComplaintDetail[] = (complaints || []).map(c => ({
      id: c.id,
      subject: c.subject,
      status: c.status || 'pending',
      createdAt: c.created_at || '',
      complainantType: c.complainant_type,
    }));

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, name, name_en')
      .eq('program_id', program.id);
    if (coursesError) throw coursesError;

    const courseSatisfaction: Array<{ id: string; name: string; averageSatisfaction: number }> = [];
    
    if (courses && courses.length > 0 && surveyIds.length > 0) {
      const { data: surveyCourses, error: surveyCoursesError } = await supabase
        .from('survey_courses')
        .select('course_id, survey_id')
        .in('survey_id', surveyIds);
      if (surveyCoursesError) throw surveyCoursesError;

      for (const course of courses) {
        const courseSurveyIds = surveyCourses
          ?.filter(sc => sc.course_id === course.id)
          .map(sc => sc.survey_id) || [];

        const courseScores = courseSurveyIds.flatMap(surveyId => surveyMetrics.get(surveyId)?.ratingScores || []);
        if (courseScores.length > 0) {
          courseSatisfaction.push({
            id: course.id,
            name: language === 'ar' ? course.name : (course.name_en || course.name),
            averageSatisfaction: courseScores.reduce((sum, value) => sum + value, 0) / courseScores.length,
          });
        }
      }
    }

    const { data: recsData, error: recommendationsError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('program_id', program.id)
      .order('created_at', { ascending: false });
    if (recommendationsError) throw recommendationsError;

    const recommendations: RecommendationDetail[] = (recsData || []).map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status || 'pending',
      priority: r.priority || 'medium',
      semester: r.semester,
      academic_year: r.academic_year,
      program_id: r.program_id,
    }));

    return {
      programId: program.id,
      programName: program.name,
      programNameEn: program.name_en || undefined,
      colorIndex,
      totalResponses,
      averageSatisfaction,
      totalSurveys: surveyIds.length,
      textCommentsCount,
      complaintStats,
      courseSatisfaction,
      surveyDetails,
      complaintDetails,
      recommendations,
    };
  };

  const loadCollegeLevelStats = async (): Promise<ProgramStats> => {
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title')
      .is('program_id', null);
    if (surveysError) throw surveysError;

    const surveyIds = (surveys || []).map(survey => survey.id);
    const surveyMetrics = await loadSurveyMetrics(surveyIds);
    const surveyDetails: SurveyDetail[] = (surveys || []).map(survey => {
      const metric = surveyMetrics.get(survey.id);
      const scores = metric?.ratingScores || [];
      return {
        id: survey.id,
        title: survey.title,
        responseCount: metric?.responseCount || 0,
        avgSatisfaction: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
      };
    });
    const surveyAverages = surveyDetails.map(survey => survey.avgSatisfaction).filter(average => average > 0);
    const averageSatisfaction = surveyAverages.length
      ? surveyAverages.reduce((sum, average) => sum + average, 0) / surveyAverages.length
      : 0;
    const totalResponses = [...surveyMetrics.values()].reduce((sum, metric) => sum + metric.responseCount, 0);
    const textCommentsCount = [...surveyMetrics.values()].reduce((sum, metric) => sum + metric.textCommentsCount, 0);

    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('id, subject, status, created_at, complainant_type')
      .is('program_id', null)
      .order('created_at', { ascending: false });
    if (complaintsError) throw complaintsError;

    const complaintStats = {
      pending: complaints?.filter(c => c.status === 'pending').length || 0,
      inProgress: complaints?.filter(c => c.status === 'in_progress').length || 0,
      resolved: complaints?.filter(c => c.status === 'resolved' || c.status === 'closed').length || 0,
    };

    const complaintDetails: ComplaintDetail[] = (complaints || []).map(c => ({
      id: c.id, subject: c.subject, status: c.status || 'pending',
      createdAt: c.created_at || '', complainantType: c.complainant_type,
    }));

    const { data: recsData, error: recommendationsError } = await supabase
      .from('recommendations')
      .select('*')
      .is('program_id', null)
      .order('created_at', { ascending: false });
    if (recommendationsError) throw recommendationsError;

    const recommendations: RecommendationDetail[] = (recsData || []).map(r => ({
      id: r.id, title: r.title, description: r.description,
      status: r.status || 'pending', priority: r.priority || 'medium',
      semester: r.semester, academic_year: r.academic_year, program_id: r.program_id,
    }));

    return {
      programId: 'college',
      programName: language === 'ar' ? 'الكلية' : 'College',
      programNameEn: language === 'ar' ? 'College' : undefined,
      colorIndex: 0,
      totalResponses,
      averageSatisfaction,
      totalSurveys: surveyIds.length,
      textCommentsCount,
      complaintStats,
      courseSatisfaction: [],
      surveyDetails,
      complaintDetails,
      recommendations,
    };
  };

  // Calculate overall stats for header
  const overallStats = {
    totalPrograms: programs.length,
    totalResponses: programStats.reduce((acc, p) => acc + p.totalResponses, 0),
    avgSatisfaction: programStats.length > 0 
      ? programStats.reduce((acc, p) => acc + p.averageSatisfaction, 0) / programStats.length 
      : 0,
    totalComplaints: programStats.reduce((acc, p) => 
      acc + p.complaintStats.pending + p.complaintStats.inProgress + p.complaintStats.resolved, 0
    ),
  };

  const filteredStats = selectedProgram === 'all' 
    ? programStats 
    : programStats.filter(p => p.programId === selectedProgram);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-6 w-6 text-primary" />
                {isDeanOrAdmin 
                  ? (language === 'ar' ? 'لوحة تحكم العميد' : 'Dean Dashboard')
                  : (language === 'ar' ? 'لوحة تحكم البرنامج' : 'Program Dashboard')}
              </CardTitle>
              <CardDescription>
                {isDeanOrAdmin
                  ? (language === 'ar' ? 'نظرة شاملة على أداء جميع البرامج الأكاديمية' : 'Overview of all academic programs performance')
                  : (language === 'ar' ? 'متابعة أداء برنامجك الأكاديمي' : 'Track your program performance')}
              </CardDescription>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-3">
              {isDeanOrAdmin && programs.length > 1 && (
                <>
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger className="w-56 bg-background">
                      <SelectValue placeholder={language === 'ar' ? 'اختر البرنامج' : 'Select Program'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'جميع البرامج' : 'All Programs'}
                      </SelectItem>
                      <SelectItem value="college">
                        {language === 'ar' ? 'الكلية' : 'College'}
                      </SelectItem>
                      {programs.map(program => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall KPIs (Dean View) */}
      {isDeanOrAdmin && selectedProgram === 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'عدد البرامج' : 'Programs'}
                  </p>
                  <p className="text-3xl font-bold">{overallStats.totalPrograms}</p>
                </div>
                <Building2 className="h-10 w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الاستجابات' : 'Total Responses'}
                  </p>
                  <p className="text-3xl font-bold">{overallStats.totalResponses}</p>
                </div>
                <Users className="h-10 w-10 text-secondary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المتوسط العام' : 'Avg Satisfaction'}
                  </p>
                  <p className="text-3xl font-bold">{overallStats.avgSatisfaction.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الشكاوى' : 'Total Complaints'}
                  </p>
                  <p className="text-3xl font-bold">{overallStats.totalComplaints}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* College Section */}
      {collegeStats && (selectedProgram === 'all' || selectedProgram === 'college') && (
        <Card className="overflow-hidden border-primary/30">
          <CardContent className="p-6">
            <ProgramSection stats={collegeStats} isExpanded={true} userRole={userRole} isCollegeLevel={true} />
          </CardContent>
        </Card>
      )}

      {/* Program Sections */}
      {selectedProgram !== 'college' && (
        <div className="space-y-6">
          {filteredStats.length > 0 ? (
            filteredStats.map((stats) => (
              <Card key={stats.programId} className="overflow-hidden">
                <CardContent className="p-6">
                  <ProgramSection stats={stats} isExpanded={true} userRole={userRole} />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleBasedDashboard;
