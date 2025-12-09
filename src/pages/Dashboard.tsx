import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Plus, TrendingUp, Users, ClipboardList, AlertCircle, CheckCircle2, Archive, LogOut, BarChart, Home, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

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
    }
  };

  const loadStats = async () => {
    const { count: activeSurveys } = await supabase
      .from("surveys")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: totalResponses } = await supabase
      .from("responses")
      .select("*", { count: "exact", head: true });

    const { count: readyReports } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true });

    setStats({
      activeSurveys: activeSurveys || 0,
      totalResponses: totalResponses || 0,
      responseRate: totalResponses ? "78%" : "0%",
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
              <p className="text-sm text-muted-foreground">
                {user?.full_name ? `${t('dashboard.welcomeUser')} ${user.full_name}` : t('dashboard.systemTitle')}
              </p>
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
              <Link to="/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 ml-2" />
                  {t('dashboard.manageUsers')}
                </Button>
              </Link>
              <Link to="/system-settings">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 ml-2" />
                  {t('dashboard.systemSettings')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
