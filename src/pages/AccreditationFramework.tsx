import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, ArrowLeft, Award, Plus, Home, 
  ChevronDown, ChevronUp, Target, FileText,
  CheckCircle2, AlertCircle, Clock, Sparkles, Edit, Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { StandardAccordion } from "@/components/accreditation/StandardAccordion";
import { AddStandardDialog } from "@/components/accreditation/AddStandardDialog";
import { ComplianceProgress } from "@/components/accreditation/ComplianceProgress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Framework {
  id: string;
  name: string;
  name_en: string | null;
  type: 'institutional' | 'programmatic';
  scope: 'national' | 'international';
  version: string | null;
  description: string | null;
  is_active: boolean;
  program_id: string | null;
  programs?: { name: string } | null;
}

interface Standard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  order_index: number;
  weight: number;
  indicators: Indicator[];
  compliance_percentage?: number;
}

interface Indicator {
  id: string;
  code: string;
  name: string;
  description: string | null;
  importance_level: 'critical' | 'high' | 'medium' | 'low';
  order_index: number;
  response?: {
    status: string;
    compliance_percentage: number;
  };
}

const AccreditationFramework = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [framework, setFramework] = useState<Framework | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStandardDialog, setShowAddStandardDialog] = useState(false);
  const [expandedStandards, setExpandedStandards] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadFramework();
      loadStandards();
    }
  }, [id]);

  const loadFramework = async () => {
    const { data, error } = await supabase
      .from("accreditation_frameworks")
      .select("*, programs(name)")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/accreditation");
      return;
    }

    setFramework(data);
  };

  const loadStandards = async () => {
    setLoading(true);
    try {
      const { data: standardsData, error: standardsError } = await supabase
        .from("accreditation_standards")
        .select("*")
        .eq("framework_id", id)
        .order("order_index", { ascending: true });

      if (standardsError) throw standardsError;

      // Load indicators for each standard
      const standardsWithIndicators = await Promise.all(
        (standardsData || []).map(async (standard) => {
          const { data: indicators } = await supabase
            .from("accreditation_indicators")
            .select("*")
            .eq("standard_id", standard.id)
            .order("order_index", { ascending: true });

          // Load responses for each indicator
          const indicatorsWithResponses = await Promise.all(
            (indicators || []).map(async (indicator) => {
              const { data: response } = await supabase
                .from("indicator_responses")
                .select("status, compliance_percentage")
                .eq("indicator_id", indicator.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              return {
                ...indicator,
                response: response || undefined
              };
            })
          );

          // Calculate standard compliance
          const indicatorsWithCompliance = indicatorsWithResponses.filter(i => i.response?.compliance_percentage != null);
          const standardCompliance = indicatorsWithCompliance.length > 0
            ? Math.round(indicatorsWithCompliance.reduce((sum, i) => sum + (i.response?.compliance_percentage || 0), 0) / indicatorsWithCompliance.length)
            : 0;

          return {
            ...standard,
            indicators: indicatorsWithResponses,
            compliance_percentage: standardCompliance
          };
        })
      );

      setStandards(standardsWithIndicators);
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

  const toggleStandard = (standardId: string) => {
    setExpandedStandards(prev => 
      prev.includes(standardId) 
        ? prev.filter(id => id !== standardId)
        : [...prev, standardId]
    );
  };

  const expandAll = () => {
    setExpandedStandards(standards.map(s => s.id));
  };

  const collapseAll = () => {
    setExpandedStandards([]);
  };

  const overallCompliance = standards.length > 0
    ? Math.round(standards.reduce((sum, s) => sum + (s.compliance_percentage || 0), 0) / standards.length)
    : 0;

  const totalIndicators = standards.reduce((sum, s) => sum + s.indicators.length, 0);
  const completedIndicators = standards.reduce((sum, s) => 
    sum + s.indicators.filter(i => i.response?.status === 'approved' || i.response?.status === 'reviewed').length, 0
  );

  if (!framework) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/accreditation")}
              >
                {language === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
              <Award className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{framework.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={framework.type === 'institutional' ? 'default' : 'secondary'}>
                    {framework.type === 'institutional' 
                      ? (language === 'ar' ? 'مؤسسي' : 'Institutional')
                      : (language === 'ar' ? 'برامجي' : 'Programmatic')
                    }
                  </Badge>
                  <Badge variant="outline">
                    {framework.scope === 'national'
                      ? (language === 'ar' ? 'وطني' : 'National')
                      : (language === 'ar' ? 'دولي' : 'International')
                    }
                  </Badge>
                  {framework.version && (
                    <span>v{framework.version}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <LanguageToggle />
              <Button variant="hero" onClick={() => setShowAddStandardDialog(true)}>
                <Plus className="h-5 w-5 ml-2" />
                {language === 'ar' ? 'معيار جديد' : 'New Standard'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {language === 'ar' ? 'نسبة الاستيفاء الكلية' : 'Overall Compliance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceProgress value={overallCompliance} size="lg" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {language === 'ar' ? 'المعايير' : 'Standards'}
              </CardTitle>
              <FileText className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{standards.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {language === 'ar' ? 'المؤشرات' : 'Indicators'}
              </CardTitle>
              <Target className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalIndicators}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {language === 'ar' ? 'المكتملة' : 'Completed'}
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedIndicators}/{totalIndicators}</div>
            </CardContent>
          </Card>
        </div>

        {/* Standards List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{language === 'ar' ? 'المعايير والمؤشرات' : 'Standards & Indicators'}</CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'انقر على المعيار لعرض المؤشرات المرتبطة'
                    : 'Click on a standard to view related indicators'
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  <ChevronDown className="h-4 w-4 ml-1" />
                  {language === 'ar' ? 'توسيع الكل' : 'Expand All'}
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  <ChevronUp className="h-4 w-4 ml-1" />
                  {language === 'ar' ? 'طي الكل' : 'Collapse All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : standards.length > 0 ? (
              <div className="space-y-4">
                {standards.map((standard) => (
                  <StandardAccordion
                    key={standard.id}
                    standard={standard}
                    isExpanded={expandedStandards.includes(standard.id)}
                    onToggle={() => toggleStandard(standard.id)}
                    onRefresh={loadStandards}
                    frameworkId={id!}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'ar' ? 'لا توجد معايير' : 'No Standards'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {language === 'ar' 
                    ? 'ابدأ بإضافة معايير لهذا الإطار'
                    : 'Start by adding standards to this framework'
                  }
                </p>
                <Button onClick={() => setShowAddStandardDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'إضافة معيار' : 'Add Standard'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AddStandardDialog
        open={showAddStandardDialog}
        onOpenChange={setShowAddStandardDialog}
        frameworkId={id!}
        onSuccess={loadStandards}
        nextOrderIndex={standards.length + 1}
      />
    </div>
  );
};

export default AccreditationFramework;
