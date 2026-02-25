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
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
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
  reportId: string;
  surveyId: string;
  surveyTitle: string;
  recommendationsText: string;
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

const RoleBasedDashboard = ({ userRole, userProgramIds }: RoleBasedDashboardProps) => {
  const { language, t } = useLanguage();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programStats, setProgramStats] = useState<ProgramStats[]>([]);
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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgramStats = async (program: Program, colorIndex: number): Promise<ProgramStats> => {
    // Get surveys for this program with titles
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('program_id', program.id);

    const surveyIds = surveys?.map(s => s.id) || [];
    
    // Get total responses for program's surveys
    let totalResponses = 0;
    if (surveyIds.length > 0) {
      const { count } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds);
      totalResponses = count || 0;
    }

    // Build survey details with per-survey averages
    const surveyDetails: SurveyDetail[] = [];
    const surveyAverages: number[] = [];

    if (surveys && surveys.length > 0) {
      for (const survey of surveys) {
        // Get responses for this survey
        const { data: surveyResponses } = await supabase
          .from('responses')
          .select('id')
          .eq('survey_id', survey.id);

        const responseCount = surveyResponses?.length || 0;
        const responseIds = surveyResponses?.map(r => r.id) || [];

        let avgSatisfaction = 0;
        if (responseIds.length > 0) {
          const { data: surveyAnswers } = await supabase
            .from('answers')
            .select('numeric_value, questions!inner(type)')
            .in('response_id', responseIds)
            .not('numeric_value', 'is', null)
            .in('questions.type', ['likert', 'rating']);

          const validAnswers = (surveyAnswers || []).filter((a: any) => 
            a.numeric_value != null && a.numeric_value >= 1 && a.numeric_value <= 5
          );
          if (validAnswers.length > 0) {
            const sum = validAnswers.reduce((acc: number, curr: any) => acc + curr.numeric_value, 0);
            avgSatisfaction = sum / validAnswers.length;
            surveyAverages.push(avgSatisfaction);
          }
        }

        surveyDetails.push({
          id: survey.id,
          title: survey.title,
          responseCount,
          avgSatisfaction,
        });
      }
    }

    // Average of averages (more fair)
    const averageSatisfaction = surveyAverages.length > 0
      ? surveyAverages.reduce((a, b) => a + b, 0) / surveyAverages.length
      : 0;

    // Get text comments count
    let textCommentsCount = 0;
    if (surveyIds.length > 0) {
      const { data: textAnswers } = await supabase
        .from('answers')
        .select('value, question_id, questions!inner(type, survey_id)')
        .not('value', 'is', null);

      if (textAnswers) {
        textCommentsCount = textAnswers.filter((a: any) => 
          a.questions?.type === 'text' && 
          surveyIds.includes(a.questions?.survey_id) &&
          a.value && a.value.trim().length > 0
        ).length;
      }
    }

    // Get complaints for this program with details
    const { data: complaints } = await supabase
      .from('complaints')
      .select('id, subject, status, created_at, complainant_type')
      .eq('program_id', program.id)
      .order('created_at', { ascending: false });

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

    // Get course satisfaction
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, name_en')
      .eq('program_id', program.id);

    const courseSatisfaction: Array<{ id: string; name: string; averageSatisfaction: number }> = [];
    
    if (courses && courses.length > 0 && surveyIds.length > 0) {
      const { data: surveyCourses } = await supabase
        .from('survey_courses')
        .select('course_id, survey_id')
        .in('survey_id', surveyIds);

      for (const course of courses) {
        const courseSurveyIds = surveyCourses
          ?.filter(sc => sc.course_id === course.id)
          .map(sc => sc.survey_id) || [];

        if (courseSurveyIds.length > 0) {
          const { data: courseResponses } = await supabase
            .from('responses')
            .select('id')
            .in('survey_id', courseSurveyIds);

          const responseIds = courseResponses?.map(r => r.id) || [];

          if (responseIds.length > 0) {
            const { data: courseAnswers } = await supabase
              .from('answers')
              .select('numeric_value, questions!inner(type)')
              .in('response_id', responseIds)
              .not('numeric_value', 'is', null)
              .in('questions.type', ['likert', 'rating']);

            const validCourseAnswers = (courseAnswers || []).filter((a: any) => 
              a.numeric_value != null && a.numeric_value >= 1 && a.numeric_value <= 5
            );
            if (validCourseAnswers.length > 0) {
              const sum = validCourseAnswers.reduce((acc: number, curr: any) => acc + curr.numeric_value, 0);
              const avg = sum / validCourseAnswers.length;
              courseSatisfaction.push({
                id: course.id,
                name: language === 'ar' ? course.name : (course.name_en || course.name),
                averageSatisfaction: avg,
              });
            }
          }
        }
      }
    }

    // Get recommendations from reports
    const recommendations: RecommendationDetail[] = [];
    if (surveyIds.length > 0) {
      const { data: reports } = await supabase
        .from('reports')
        .select('id, survey_id, recommendations_text')
        .in('survey_id', surveyIds)
        .not('recommendations_text', 'is', null);

      if (reports) {
        for (const report of reports) {
          if (report.recommendations_text && report.recommendations_text.trim()) {
            const surveyTitle = surveys?.find(s => s.id === report.survey_id)?.title || '';
            recommendations.push({
              reportId: report.id,
              surveyId: report.survey_id || '',
              surveyTitle,
              recommendationsText: report.recommendations_text,
            });
          }
        }
      }
    }

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

      {/* Program Sections */}
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
    </div>
  );
};

export default RoleBasedDashboard;
