import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowRight, ArrowLeft, Target, Sparkles, Save, 
  FileText, Upload, CheckCircle2, AlertCircle, 
  Lightbulb, TrendingUp, AlertTriangle, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AIAnalysisPanel } from "@/components/accreditation/AIAnalysisPanel";
import { EvidenceUploader } from "@/components/accreditation/EvidenceUploader";
import { ComplianceProgress } from "@/components/accreditation/ComplianceProgress";
import { ResponseForm } from "@/components/accreditation/ResponseForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Indicator {
  id: string;
  code: string;
  name: string;
  description: string | null;
  objective: string | null;
  responsible_party: string | null;
  importance_level: 'critical' | 'high' | 'medium' | 'low';
  required_evidence: any[];
  response_guidelines: string | null;
  response_template: string | null;
  standard: {
    id: string;
    code: string;
    name: string;
    framework: {
      id: string;
      name: string;
    };
  };
}

interface Response {
  id: string;
  response_text: string | null;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
  compliance_level: 'compliant' | 'partial' | 'non_compliant' | null;
  compliance_percentage: number;
  ai_feedback: string | null;
  ai_score: number | null;
  strengths: string[];
  gaps: string[];
  improvement_notes: string | null;
  academic_year: string | null;
  semester: string | null;
}

const IndicatorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadIndicator();
      loadResponse();
    }
  }, [id]);

  const loadIndicator = async () => {
    const { data, error } = await supabase
      .from("accreditation_indicators")
      .select(`
        *,
        standard:accreditation_standards(
          id,
          code,
          name,
          framework:accreditation_frameworks(id, name)
        )
      `)
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

    setIndicator(data as any);
    setLoading(false);
  };

  const loadResponse = async () => {
    const { data } = await supabase
      .from("indicator_responses")
      .select("*")
      .eq("indicator_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setResponse({
        ...data,
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        gaps: Array.isArray(data.gaps) ? data.gaps : []
      } as Response);
    }
  };

  const getImportanceColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getImportanceLabel = (level: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      critical: { ar: 'حرج', en: 'Critical' },
      high: { ar: 'عالي', en: 'High' },
      medium: { ar: 'متوسط', en: 'Medium' },
      low: { ar: 'منخفض', en: 'Low' },
    };
    return labels[level]?.[language] || level;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      submitted: { ar: 'مُقدم', en: 'Submitted' },
      reviewed: { ar: 'تمت المراجعة', en: 'Reviewed' },
      approved: { ar: 'معتمد', en: 'Approved' },
    };
    return labels[status]?.[language] || status;
  };

  if (loading || !indicator) {
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
                onClick={() => navigate(`/accreditation/framework/${indicator.standard.framework.id}`)}
              >
                {language === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
              <Target className="h-8 w-8 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{indicator.code}: {indicator.name}</h1>
                  <Badge className={getImportanceColor(indicator.importance_level)}>
                    {getImportanceLabel(indicator.importance_level)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {indicator.standard.framework.name} → {indicator.standard.code}: {indicator.standard.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <LanguageToggle />
              {response && (
                <Badge variant={response.status === 'approved' ? 'default' : 'secondary'}>
                  {getStatusLabel(response.status)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Indicator Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {language === 'ar' ? 'تفاصيل المؤشر' : 'Indicator Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {indicator.description && (
                  <div>
                    <h4 className="font-semibold mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</h4>
                    <p className="text-muted-foreground">{indicator.description}</p>
                  </div>
                )}
                
                {indicator.objective && (
                  <div>
                    <h4 className="font-semibold mb-1">{language === 'ar' ? 'الهدف' : 'Objective'}</h4>
                    <p className="text-muted-foreground">{indicator.objective}</p>
                  </div>
                )}
                
                {indicator.responsible_party && (
                  <div>
                    <h4 className="font-semibold mb-1">{language === 'ar' ? 'الجهة المسؤولة' : 'Responsible Party'}</h4>
                    <p className="text-muted-foreground">{indicator.responsible_party}</p>
                  </div>
                )}

                {indicator.required_evidence && indicator.required_evidence.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ar' ? 'الأدلة المطلوبة' : 'Required Evidence'}</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {indicator.required_evidence.map((evidence: any, index: number) => (
                        <li key={index}>{typeof evidence === 'string' ? evidence : evidence.title || evidence.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Response Form */}
            <ResponseForm 
              indicator={indicator}
              response={response}
              onResponseUpdate={loadResponse}
            />

            {/* Evidence Uploader */}
            <EvidenceUploader 
              responseId={response?.id}
              indicatorId={indicator.id}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {language === 'ar' ? 'حالة الاستيفاء' : 'Compliance Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComplianceProgress 
                  value={response?.compliance_percentage || 0} 
                  size="lg"
                  showLabel
                />
                {response?.compliance_level && (
                  <div className="mt-4 text-center">
                    <Badge 
                      variant={
                        response.compliance_level === 'compliant' ? 'default' :
                        response.compliance_level === 'partial' ? 'secondary' : 'destructive'
                      }
                      className="text-base px-4 py-1"
                    >
                      {response.compliance_level === 'compliant' 
                        ? (language === 'ar' ? 'مستوفى' : 'Compliant')
                        : response.compliance_level === 'partial'
                        ? (language === 'ar' ? 'مستوفى جزئياً' : 'Partially Compliant')
                        : (language === 'ar' ? 'غير مستوفى' : 'Non-Compliant')
                      }
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis Panel */}
            <AIAnalysisPanel 
              indicator={indicator}
              response={response}
              onAnalysisComplete={loadResponse}
            />

            {/* Response Guidelines */}
            {indicator.response_guidelines && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    {language === 'ar' ? 'إرشادات الرد' : 'Response Guidelines'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {indicator.response_guidelines}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* AI Feedback */}
            {response?.ai_feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    {language === 'ar' ? 'ملاحظات AI' : 'AI Feedback'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{response.ai_feedback}</p>
                  
                  {response.strengths && response.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-600 flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {language === 'ar' ? 'نقاط القوة' : 'Strengths'}
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {response.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {response.gaps && response.gaps.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 flex items-center gap-1 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        {language === 'ar' ? 'الفجوات' : 'Gaps'}
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {response.gaps.map((g, i) => <li key={i}>{g}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {response.improvement_notes && (
                    <div>
                      <h4 className="font-semibold text-blue-600 flex items-center gap-1 mb-2">
                        <Lightbulb className="h-4 w-4" />
                        {language === 'ar' ? 'اقتراحات التحسين' : 'Improvement Suggestions'}
                      </h4>
                      <p className="text-sm">{response.improvement_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default IndicatorDetails;
