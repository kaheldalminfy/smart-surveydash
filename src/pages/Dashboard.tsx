import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, Plus, TrendingUp, Users, ClipboardList, AlertCircle, CheckCircle2, Archive, LogOut, BarChart, Home, Settings, Calendar, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import RoleBasedDashboard from "@/components/dashboard/RoleBasedDashboard";

type AppRole = 'admin' | 'dean' | 'coordinator' | 'program_manager' | 'faculty';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState({
    activeSurveys: 0,
    totalResponses: 0,
    responseRate: "0%",
    readyReports: 0
  });
  const [recentSurveys, setRecentSurveys] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<AppRole>('faculty');
  const [userProgramIds, setUserProgramIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'programs'>('overview');

  useEffect(() => {
    loadUser();
    loadStats();
    loadRecentSurveys();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, programs(name)")
        .eq("id", user.id)
        .single();
      setUser(profile);

      // Load user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, program_id")
        .eq("user_id", user.id);

      if (roles && roles.length > 0) {
        // Determine highest role
        const roleHierarchy: AppRole[] = ['admin', 'dean', 'coordinator', 'program_manager', 'faculty'];
        let highestRole: AppRole = 'faculty';
        const programIds: string[] = [];

        for (const userRole of roles) {
          const roleIndex = roleHierarchy.indexOf(userRole.role as AppRole);
          const currentIndex = roleHierarchy.indexOf(highestRole);
          if (roleIndex !== -1 && roleIndex < currentIndex) {
            highestRole = userRole.role as AppRole;
          }
          if (userRole.program_id) {
            programIds.push(userRole.program_id);
          }
        }

        setUserRole(highestRole);
        setUserProgramIds(programIds);
      }
    }
  };

  const loadStats = async () => {
    // Get active surveys count
    const { count: activeSurveys } = await supabase
      .from("surveys")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get total responses count
    const { count: totalResponses } = await supabase
      .from("responses")
      .select("*", { count: "exact", head: true });

    // Get ready reports count
    const { count: readyReports } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true });

    // Calculate REAL response rate from target_enrollment
    const { data: surveysWithEnrollment } = await supabase
      .from("surveys")
      .select("id, target_enrollment, status")
      .in("status", ["active", "closed"]);

    let calculatedResponseRate = "0%";
    
    if (surveysWithEnrollment && surveysWithEnrollment.length > 0) {
      // Sum all target enrollments
      const totalTargetEnrollment = surveysWithEnrollment.reduce(
        (sum, survey) => sum + (survey.target_enrollment || 0), 
        0
      );
      
      if (totalTargetEnrollment > 0 && totalResponses) {
        const rate = Math.min(100, (totalResponses / totalTargetEnrollment) * 100);
        calculatedResponseRate = `${rate.toFixed(1)}%`;
      } else if (totalResponses && totalResponses > 0) {
        calculatedResponseRate = language === 'ar' ? "بانتظار البيانات" : "Awaiting data";
      }
    }

    setStats({
      activeSurveys: activeSurveys || 0,
      totalResponses: totalResponses || 0,
      responseRate: calculatedResponseRate,
      readyReports: readyReports || 0
    });
  };

  const loadRecentSurveys = async () => {
    const { data } = await supabase
      .from("surveys")
      .select(`
        *,
        programs(name),
        responses(count)
      `)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) {
      setRecentSurveys(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: language === 'ar' ? "تم تسجيل الخروج" : "Logged out",
      description: language === 'ar' ? "نراك قريباً" : "See you soon",
    });
    navigate("/");
  };

  const statsDisplay = [
    { label: t('dashboard.activeSurveys'), value: stats.activeSurveys.toString(), icon: FileText, color: "text-primary" },
    { label: t('dashboard.totalResponses'), value: stats.totalResponses.toString(), icon: Users, color: "text-secondary" },
    { label: t('dashboard.responseRate'), value: stats.responseRate, icon: TrendingUp, color: "text-accent" },
    { label: t('dashboard.readyReports'), value: stats.readyReports.toString(), icon: BarChart3, color: "text-muted-foreground" },
  ];

  const getSurveyStatusLabel = (status: string) => {
    if (language === 'ar') {
      return status === "active" ? "نشط" : status === "closed" ? "مغلق" : "مسودة";
    }
    return status === "active" ? "Active" : status === "closed" ? "Closed" : "Draft";
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, { ar: string; en: string }> = {
      admin: { ar: 'مدير النظام', en: 'Admin' },
      dean: { ar: 'العميد', en: 'Dean' },
      coordinator: { ar: 'منسق البرنامج', en: 'Coordinator' },
      program_manager: { ar: 'مدير البرنامج', en: 'Program Manager' },
      faculty: { ar: 'عضو هيئة تدريس', en: 'Faculty' },
    };
    return labels[role]?.[language] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              title={t('nav.home')}
            >
              <Home className="h-5 w-5" />
            </Button>
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {user?.full_name ? `${t('dashboard.welcomeUser')} ${user.full_name}` : t('dashboard.systemTitle')}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {getRoleLabel(userRole)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <LanguageToggle />
            <Link to="/surveys/new">
              <Button variant="hero" size="lg">
                <Plus className="h-5 w-5 ml-2" />
                {t('dashboard.newSurvey')}
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-5 w-5 ml-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'programs')} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'ar' ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {language === 'ar' ? 'البرامج' : 'Programs'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsDisplay.map((stat, index) => (
                <Card key={index} className="hover-scale">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t('dashboard.recentSurveys')}</CardTitle>
                  <CardDescription>{t('dashboard.recentSurveysDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentSurveys.length > 0 ? (
                      recentSurveys.map((survey) => (
                        <div key={survey.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{survey.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{survey.responses?.length || 0} {t('dashboard.response')}</span>
                              <span>•</span>
                              <Badge variant={survey.status === "active" ? "default" : "secondary"}>
                                {getSurveyStatusLabel(survey.status)}
                              </Badge>
                            </div>
                          </div>
                          <Link to={`/reports/${survey.id}`}>
                            <Button variant="outline" size="sm">{t('dashboard.viewReport')}</Button>
                          </Link>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">{t('dashboard.noSurveys')}</p>
                    )}
                  </div>
                  <Link to="/surveys" className="block mt-4">
                    <Button variant="ghost" className="w-full">{t('dashboard.viewAllSurveys')}</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/surveys/new">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 ml-2" />
                      {t('dashboard.createSurvey')}
                    </Button>
                  </Link>
                  <Link to="/surveys">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 ml-2" />
                      {t('dashboard.manageSurveys')}
                    </Button>
                  </Link>
                  <Link to="/complaints">
                    <Button variant="outline" className="w-full justify-start">
                      <AlertCircle className="h-4 w-4 ml-2" />
                      {t('dashboard.manageComplaints')}
                    </Button>
                  </Link>
                  <Link to="/comparison">
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart className="h-4 w-4 ml-2" />
                      {t('nav.comparison')}
                    </Button>
                  </Link>
                  <Link to="/recommendations">
                    <Button variant="outline" className="w-full justify-start">
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                      {t('dashboard.followRecommendations')}
                    </Button>
                  </Link>
                  <Link to="/archives">
                    <Button variant="outline" className="w-full justify-start">
                      <Archive className="h-4 w-4 ml-2" />
                      {t('dashboard.semesterArchive')}
                    </Button>
                  </Link>
                  {(userRole === 'admin') && (
                    <Link to="/users">
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 ml-2" />
                        {t('dashboard.manageUsers')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/academic-calendar">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 ml-2" />
                      {language === 'ar' ? 'الأجندة الأكاديمية' : 'Academic Calendar'}
                    </Button>
                  </Link>
                  {(userRole === 'admin') && (
                    <Link to="/system-settings">
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 ml-2" />
                        {t('dashboard.systemSettings')}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Programs Tab - Role-Based Dashboard */}
          <TabsContent value="programs" className="mt-6">
            <RoleBasedDashboard 
              userRole={userRole} 
              userProgramIds={userProgramIds} 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
