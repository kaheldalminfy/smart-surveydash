import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award, Plus, Home, LogOut, Building2, GraduationCap, 
  Globe, Flag, FileText, CheckCircle2, AlertCircle, Clock,
  Upload, Search, Filter, BarChart3, Target, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FrameworkCard } from "@/components/accreditation/FrameworkCard";
import { AddFrameworkDialog } from "@/components/accreditation/AddFrameworkDialog";
import { AccreditationDashboard } from "@/components/accreditation/AccreditationDashboard";

interface Framework {
  id: string;
  name: string;
  name_en: string | null;
  type: 'institutional' | 'programmatic';
  scope: 'national' | 'international';
  version: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  program_id: string | null;
  programs?: { name: string } | null;
  standards_count?: number;
  indicators_count?: number;
  compliance_percentage?: number;
}

const Accreditation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'frameworks'>('overview');

  useEffect(() => {
    loadFrameworks();
  }, []);

  const loadFrameworks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accreditation_frameworks")
        .select(`
          *,
          programs(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load standards and indicators count for each framework
      const frameworksWithStats = await Promise.all(
        (data || []).map(async (framework) => {
          const { count: standardsCount } = await supabase
            .from("accreditation_standards")
            .select("*", { count: "exact", head: true })
            .eq("framework_id", framework.id);

          // Get all standards for this framework to count indicators
          const { data: standards } = await supabase
            .from("accreditation_standards")
            .select("id")
            .eq("framework_id", framework.id);

          let indicatorsCount = 0;
          if (standards && standards.length > 0) {
            const standardIds = standards.map(s => s.id);
            const { count } = await supabase
              .from("accreditation_indicators")
              .select("*", { count: "exact", head: true })
              .in("standard_id", standardIds);
            indicatorsCount = count || 0;
          }

          // Calculate compliance percentage from responses
          let compliancePercentage = 0;
          if (indicatorsCount > 0) {
            const { data: indicators } = await supabase
              .from("accreditation_indicators")
              .select("id")
              .in("standard_id", standards?.map(s => s.id) || []);

            if (indicators && indicators.length > 0) {
              const { data: responses } = await supabase
                .from("indicator_responses")
                .select("compliance_percentage")
                .in("indicator_id", indicators.map(i => i.id))
                .not("compliance_percentage", "is", null);

              if (responses && responses.length > 0) {
                const totalCompliance = responses.reduce((sum, r) => sum + (r.compliance_percentage || 0), 0);
                compliancePercentage = Math.round(totalCompliance / responses.length);
              }
            }
          }

          return {
            ...framework,
            standards_count: standardsCount || 0,
            indicators_count: indicatorsCount,
            compliance_percentage: compliancePercentage
          };
        })
      );

      setFrameworks(frameworksWithStats);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredFrameworks = frameworks.filter(framework => {
    const matchesSearch = framework.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (framework.name_en?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || framework.type === typeFilter;
    const matchesScope = scopeFilter === "all" || framework.scope === scopeFilter;
    return matchesSearch && matchesType && matchesScope;
  });

  const stats = {
    total: frameworks.length,
    institutional: frameworks.filter(f => f.type === 'institutional').length,
    programmatic: frameworks.filter(f => f.type === 'programmatic').length,
    averageCompliance: frameworks.length > 0 
      ? Math.round(frameworks.reduce((sum, f) => sum + (f.compliance_percentage || 0), 0) / frameworks.length)
      : 0
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              title={language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
            >
              <Home className="h-5 w-5" />
            </Button>
            <Award className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                {language === 'ar' ? 'وحدة الاعتماد الذكية' : 'Smart Accreditation Module'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إدارة معايير الاعتماد المؤسسي والبرامجي' : 'Manage institutional and programmatic accreditation standards'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <LanguageToggle />
            <Button variant="hero" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-5 w-5 ml-2" />
              {language === 'ar' ? 'إطار جديد' : 'New Framework'}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-5 w-5 ml-2" />
              {language === 'ar' ? 'خروج' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'frameworks')} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'ar' ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="frameworks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'أُطر الاعتماد' : 'Frameworks'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <AccreditationDashboard frameworks={frameworks} />
          </TabsContent>

          <TabsContent value="frameworks" className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الأُطر' : 'Total Frameworks'}
                  </CardTitle>
                  <Award className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'اعتماد مؤسسي' : 'Institutional'}
                  </CardTitle>
                  <Building2 className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.institutional}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'اعتماد برامجي' : 'Programmatic'}
                  </CardTitle>
                  <GraduationCap className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.programmatic}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'متوسط الاستيفاء' : 'Avg. Compliance'}
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.averageCompliance}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'البحث في الأُطر...' : 'Search frameworks...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={language === 'ar' ? 'نوع الاعتماد' : 'Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="institutional">{language === 'ar' ? 'مؤسسي' : 'Institutional'}</SelectItem>
                  <SelectItem value="programmatic">{language === 'ar' ? 'برامجي' : 'Programmatic'}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={language === 'ar' ? 'النطاق' : 'Scope'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="national">{language === 'ar' ? 'وطني' : 'National'}</SelectItem>
                  <SelectItem value="international">{language === 'ar' ? 'دولي' : 'International'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frameworks Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            ) : filteredFrameworks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFrameworks.map((framework) => (
                  <FrameworkCard 
                    key={framework.id} 
                    framework={framework}
                    onRefresh={loadFrameworks}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {language === 'ar' ? 'لا توجد أُطر اعتماد' : 'No Frameworks Found'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {language === 'ar' 
                      ? 'ابدأ بإضافة إطار اعتماد جديد لتتبع معايير ومؤشرات الجودة'
                      : 'Start by adding a new accreditation framework to track quality standards'}
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    {language === 'ar' ? 'إضافة إطار جديد' : 'Add New Framework'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AddFrameworkDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadFrameworks}
      />
    </div>
  );
};

export default Accreditation;
