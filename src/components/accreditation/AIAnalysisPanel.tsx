import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Lightbulb, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Indicator {
  id: string;
  code: string;
  name: string;
  description: string | null;
  objective: string | null;
  responsible_party: string | null;
  importance_level: string;
  required_evidence: any[];
  response_guidelines: string | null;
  response_template: string | null;
}

interface Response {
  id: string;
  response_text: string | null;
  status: string;
  compliance_percentage: number;
  ai_feedback: string | null;
}

interface AIAnalysisPanelProps {
  indicator: Indicator;
  response: Response | null;
  onAnalysisComplete: () => void;
}

export const AIAnalysisPanel = ({ indicator, response, onAnalysisComplete }: AIAnalysisPanelProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const analyzeResponse = async () => {
    if (!response?.response_text) {
      toast({
        title: language === 'ar' ? "تنبيه" : "Note",
        description: language === 'ar' ? "يرجى كتابة رد أولاً" : "Please write a response first",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-response', {
        body: {
          indicatorId: indicator.id,
          responseText: response.response_text,
          indicatorName: indicator.name,
          indicatorDescription: indicator.description,
          indicatorObjective: indicator.objective,
          requiredEvidence: indicator.required_evidence,
        }
      });

      if (error) throw error;

      // Update response with AI feedback
      const { error: updateError } = await supabase
        .from("indicator_responses")
        .update({
          ai_feedback: data.feedback,
          ai_score: data.score,
          compliance_percentage: data.compliance_percentage,
          compliance_level: data.compliance_level,
          strengths: data.strengths || [],
          gaps: data.gaps || [],
          improvement_notes: data.improvement_notes,
        })
        .eq("id", response.id);

      if (updateError) throw updateError;

      toast({
        title: language === 'ar' ? "تم التحليل" : "Analysis Complete",
        description: language === 'ar' ? "تم تقييم الرد بنجاح" : "Response evaluated successfully",
      });
      
      onAnalysisComplete();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const generateSuggestion = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-indicator', {
        body: {
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          indicatorDescription: indicator.description,
          indicatorObjective: indicator.objective,
          requiredEvidence: indicator.required_evidence,
          responseGuidelines: indicator.response_guidelines,
        }
      });

      if (error) throw error;

      setAiSuggestion(data.suggestion);
      
      toast({
        title: language === 'ar' ? "تم إنشاء الاقتراح" : "Suggestion Generated",
      });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Sparkles className="h-5 w-5" />
          {language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'احصل على مساعدة في صياغة الرد وتقييمه'
            : 'Get help with drafting and evaluating your response'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          variant="outline" 
          className="w-full border-purple-300 hover:bg-purple-100"
          onClick={generateSuggestion}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'اقتراح صياغة للرد' : 'Suggest Response Draft'}
            </>
          )}
        </Button>

        {response?.response_text && (
          <Button 
            variant="outline" 
            className="w-full border-purple-300 hover:bg-purple-100"
            onClick={analyzeResponse}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                {language === 'ar' ? 'جاري التقييم...' : 'Evaluating...'}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 ml-2" />
                {language === 'ar' ? 'تقييم الرد' : 'Evaluate Response'}
              </>
            )}
          </Button>
        )}

        {aiSuggestion && (
          <div className="p-4 rounded-lg bg-white border border-purple-200">
            <h4 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              {language === 'ar' ? 'اقتراح AI' : 'AI Suggestion'}
            </h4>
            <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
