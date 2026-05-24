import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, Minus, Loader2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Assessment {
  id: string;
  name: string;
  last: number | null;
  prev: number | null;
  trend: number | null;
  complaintsOpen: number;
  risk: "low" | "medium" | "high";
  reason: string;
  recommendation: string;
}

export default function ProgramRiskPanel() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Assessment[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("predict-program-risk", { body: {} });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      setData(res.programs || []);
      setGeneratedAt(res.generated_at);
    } catch (e: any) {
      toast({ title: language === "ar" ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (r: string) =>
    r === "high" ? "bg-red-500" : r === "medium" ? "bg-yellow-500" : "bg-green-500";
  const riskLabel = (r: string) =>
    language === "ar"
      ? r === "high" ? "مرتفع" : r === "medium" ? "متوسط" : "منخفض"
      : r;

  const TrendIcon = ({ t }: { t: number | null }) => {
    if (t == null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (t < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (t > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            {language === "ar" ? "توقع مخاطر جودة البرامج (AI)" : "Program Risk Prediction (AI)"}
          </CardTitle>
          {generatedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {language === "ar" ? "آخر تحليل: " : "Last analysis: "}
              {new Date(generatedAt).toLocaleString(language === "ar" ? "ar-SA" : "en-US")}
            </p>
          )}
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : language === "ar" ? "تشغيل التحليل" : "Run Analysis"}
        </Button>
      </CardHeader>
      <CardContent>
        {!data && !loading && (
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "اضغط 'تشغيل التحليل' ليحلل الذكاء الاصطناعي بيانات الاستبيانات والشكاوى ويصنّف البرامج حسب مستوى الخطر."
              : "Click 'Run Analysis' to let AI evaluate survey and complaint data and classify programs by risk level."}
          </p>
        )}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد بيانات." : "No data."}</p>
        )}
        {data && data.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {data
              .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.risk] - { high: 0, medium: 1, low: 2 }[b.risk]))
              .map((p) => (
                <div key={p.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <Badge className={`${riskColor(p.risk)} text-white`}>
                      {p.risk === "high" && <AlertTriangle className="h-3 w-3 ml-1" />}
                      {riskLabel(p.risk)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{language === "ar" ? "متوسط:" : "Avg:"} {p.last ?? "—"}</span>
                    <span className="flex items-center gap-1"><TrendIcon t={p.trend} />{p.trend ?? "—"}</span>
                    <span>{language === "ar" ? "شكاوى مفتوحة:" : "Open complaints:"} {p.complaintsOpen}</span>
                  </div>
                  <p className="text-xs">{p.reason}</p>
                  <p className="text-xs text-primary font-medium">💡 {p.recommendation}</p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
