import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Award, Target, CheckCircle2, AlertCircle, 
  TrendingUp, BarChart3, PieChart, AlertTriangle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Framework {
  id: string;
  name: string;
  type: 'institutional' | 'programmatic';
  scope: 'national' | 'international';
  standards_count?: number;
  indicators_count?: number;
  compliance_percentage?: number;
}

interface AccreditationDashboardProps {
  frameworks: Framework[];
}

export const AccreditationDashboard = ({ frameworks }: AccreditationDashboardProps) => {
  const { language } = useLanguage();

  // Calculate statistics
  const totalFrameworks = frameworks.length;
  const totalStandards = frameworks.reduce((sum, f) => sum + (f.standards_count || 0), 0);
  const totalIndicators = frameworks.reduce((sum, f) => sum + (f.indicators_count || 0), 0);
  
  const avgCompliance = totalFrameworks > 0
    ? Math.round(frameworks.reduce((sum, f) => sum + (f.compliance_percentage || 0), 0) / totalFrameworks)
    : 0;

  const highCompliance = frameworks.filter(f => (f.compliance_percentage || 0) >= 80).length;
  const mediumCompliance = frameworks.filter(f => (f.compliance_percentage || 0) >= 50 && (f.compliance_percentage || 0) < 80).length;
  const lowCompliance = frameworks.filter(f => (f.compliance_percentage || 0) < 50).length;

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBg = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100";
    if (percentage >= 50) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'متوسط الاستيفاء العام' : 'Overall Avg. Compliance'}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getComplianceColor(avgCompliance)}`}>
              {avgCompliance}%
            </div>
            <Progress value={avgCompliance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'أُطر الاعتماد' : 'Frameworks'}
            </CardTitle>
            <Award className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalFrameworks}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'ar' ? 'إطار نشط' : 'active frameworks'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'المعايير' : 'Standards'}
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalStandards}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'ar' ? 'معيار' : 'standards'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'المؤشرات' : 'Indicators'}
            </CardTitle>
            <Target className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalIndicators}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'ar' ? 'مؤشر' : 'indicators'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {language === 'ar' ? 'توزيع نسب الاستيفاء' : 'Compliance Distribution'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'تصنيف الأُطر حسب نسبة الاستيفاء' : 'Frameworks by compliance level'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>{language === 'ar' ? 'مستيفي (80%+)' : 'Compliant (80%+)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {highCompliance}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({totalFrameworks > 0 ? Math.round((highCompliance / totalFrameworks) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>{language === 'ar' ? 'جزئي (50-79%)' : 'Partial (50-79%)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {mediumCompliance}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({totalFrameworks > 0 ? Math.round((mediumCompliance / totalFrameworks) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>{language === 'ar' ? 'غير مستوفي (<50%)' : 'Non-Compliant (<50%)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {lowCompliance}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({totalFrameworks > 0 ? Math.round((lowCompliance / totalFrameworks) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {language === 'ar' ? 'الأُطر التي تحتاج اهتمام' : 'Frameworks Needing Attention'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'أُطر بنسبة استيفاء أقل من 50%' : 'Frameworks with compliance below 50%'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {frameworks.filter(f => (f.compliance_percentage || 0) < 50).length > 0 ? (
              <div className="space-y-3">
                {frameworks
                  .filter(f => (f.compliance_percentage || 0) < 50)
                  .sort((a, b) => (a.compliance_percentage || 0) - (b.compliance_percentage || 0))
                  .slice(0, 5)
                  .map((framework) => (
                    <div key={framework.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{framework.name}</span>
                      </div>
                      <Badge variant="destructive">
                        {framework.compliance_percentage || 0}%
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'جميع الأُطر بحالة جيدة!'
                    : 'All frameworks are in good standing!'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Framework List */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'نظرة سريعة على الأُطر' : 'Frameworks Overview'}</CardTitle>
        </CardHeader>
        <CardContent>
          {frameworks.length > 0 ? (
            <div className="space-y-3">
              {frameworks.map((framework) => (
                <div 
                  key={framework.id} 
                  className={`flex items-center justify-between p-4 rounded-lg ${getComplianceBg(framework.compliance_percentage || 0)}`}
                >
                  <div className="flex items-center gap-3">
                    <Award className={`h-5 w-5 ${getComplianceColor(framework.compliance_percentage || 0)}`} />
                    <div>
                      <h4 className="font-medium">{framework.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {framework.standards_count || 0} {language === 'ar' ? 'معيار' : 'standards'} • 
                        {framework.indicators_count || 0} {language === 'ar' ? 'مؤشر' : 'indicators'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <Progress value={framework.compliance_percentage || 0} className="h-2" />
                    </div>
                    <span className={`font-bold ${getComplianceColor(framework.compliance_percentage || 0)}`}>
                      {framework.compliance_percentage || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد أُطر اعتماد بعد' : 'No frameworks yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
