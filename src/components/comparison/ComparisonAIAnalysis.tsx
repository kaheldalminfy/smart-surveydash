import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb, Sigma } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Analysis {
  summary?: string;
  satisfaction?: { name: string; level: string; percent: string; note?: string }[];
  key_differences?: string[];
  strengths?: string[];
  weaknesses?: string[];
  statistical_notes?: string[];
  recommendations?: string[];
}

interface Props {
  mode: "programs" | "surveys";
  context: Record<string, unknown>;
  overall: any[];
  rows: any[];
}

const levelClass = (level?: string) => {
  const l = (level || "").toLowerCase();
  if (l.includes("high") || l.includes("مرتفع")) return "border-green-500 text-green-600";
  if (l.includes("low") || l.includes("منخفض")) return "border-red-500 text-red-600";
  return "border-amber-500 text-amber-600";
};

const ComparisonAIAnalysis = ({ mode, context, overall, rows }: Props) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-comparison", {
        body: { mode, language, context, overall, rows },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis || {});
    } catch (e: any) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: e.message || (isAr ? "تعذّر إجراء التحليل" : "Analysis failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const List = ({ icon, title, items }: { icon: React.ReactNode; title: string; items?: string[] }) => {
    if (!items?.length) return null;
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">{icon}{title}</h4>
        <ul className="space-y-1 text-sm text-muted-foreground list-disc ms-5">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    );
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {isAr ? "التحليل الذكي للرضا والمقارنة" : "AI Satisfaction & Comparison Analysis"}
        </CardTitle>
        <CardDescription>
          {isAr
            ? "تحليل إحصائي بالذكاء الاصطناعي لمستوى الرضا والفروق بين النماذج المختارة"
            : "AI-powered statistical analysis of satisfaction levels and gaps between the selected forms"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Sparkles className="h-4 w-4 me-2" />}
          {analysis
            ? (isAr ? "إعادة التحليل" : "Re-analyze")
            : (isAr ? "تحليل بالذكاء الاصطناعي" : "Analyze with AI")}
        </Button>

        {analysis && (
          <div className="space-y-5">
            {analysis.summary && (
              <p className="text-sm leading-7 bg-muted/40 rounded-lg p-4">{analysis.summary}</p>
            )}

            {!!analysis.satisfaction?.length && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.satisfaction.map((s, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{s.name}</span>
                      <Badge variant="outline" className={levelClass(s.level)}>{s.level} · {s.percent}%</Badge>
                    </div>
                    {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                  </div>
                ))}
              </div>
            )}

            <List icon={<TrendingUp className="h-4 w-4 text-primary" />} title={isAr ? "أبرز الفروق" : "Key differences"} items={analysis.key_differences} />
            <List icon={<TrendingUp className="h-4 w-4 text-green-600" />} title={isAr ? "نقاط القوة" : "Strengths"} items={analysis.strengths} />
            <List icon={<AlertTriangle className="h-4 w-4 text-red-600" />} title={isAr ? "نقاط الضعف" : "Weaknesses"} items={analysis.weaknesses} />
            <List icon={<Sigma className="h-4 w-4 text-muted-foreground" />} title={isAr ? "ملاحظات إحصائية" : "Statistical notes"} items={analysis.statistical_notes} />
            <List icon={<Lightbulb className="h-4 w-4 text-amber-500" />} title={isAr ? "التوصيات" : "Recommendations"} items={analysis.recommendations} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComparisonAIAnalysis;
