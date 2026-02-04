import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, ChevronUp, Target, Plus, 
  CheckCircle2, AlertCircle, Clock, Edit, Trash2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddIndicatorDialog } from "./AddIndicatorDialog";
import { IndicatorCard } from "./IndicatorCard";

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

interface StandardAccordionProps {
  standard: Standard;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  frameworkId: string;
}

export const StandardAccordion = ({ 
  standard, 
  isExpanded, 
  onToggle, 
  onRefresh,
  frameworkId 
}: StandardAccordionProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [showAddIndicatorDialog, setShowAddIndicatorDialog] = useState(false);

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const completedIndicators = standard.indicators.filter(
    i => i.response?.status === 'approved' || i.response?.status === 'reviewed'
  ).length;

  const handleDeleteStandard = async () => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المعيار؟' : 'Are you sure you want to delete this standard?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("accreditation_standards")
        .delete()
        .eq("id", standard.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? "تم الحذف" : "Deleted",
        description: language === 'ar' ? "تم حذف المعيار بنجاح" : "Standard deleted successfully",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {standard.code}
                    </Badge>
                    <h3 className="font-semibold">{standard.name}</h3>
                  </div>
                  {standard.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {standard.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>
                      {completedIndicators}/{standard.indicators.length} {language === 'ar' ? 'مؤشر' : 'indicators'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-32">
                  <Progress value={standard.compliance_percentage || 0} className="h-2" />
                  <span className="text-sm font-semibold w-12">
                    {standard.compliance_percentage || 0}%
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 border-t">
              <div className="flex justify-between items-center py-3 mb-3">
                <h4 className="font-medium text-muted-foreground">
                  {language === 'ar' ? 'المؤشرات' : 'Indicators'}
                </h4>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddIndicatorDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    {language === 'ar' ? 'مؤشر جديد' : 'Add Indicator'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStandard();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {standard.indicators.length > 0 ? (
                <div className="space-y-2">
                  {standard.indicators.map((indicator) => (
                    <IndicatorCard
                      key={indicator.id}
                      indicator={indicator}
                      onRefresh={onRefresh}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{language === 'ar' ? 'لا توجد مؤشرات' : 'No indicators yet'}</p>
                  <Button 
                    variant="link" 
                    onClick={() => setShowAddIndicatorDialog(true)}
                  >
                    {language === 'ar' ? 'إضافة مؤشر' : 'Add Indicator'}
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <AddIndicatorDialog
        open={showAddIndicatorDialog}
        onOpenChange={setShowAddIndicatorDialog}
        standardId={standard.id}
        onSuccess={onRefresh}
        nextOrderIndex={standard.indicators.length + 1}
      />
    </>
  );
};
