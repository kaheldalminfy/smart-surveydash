import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Clock, Edit
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface IndicatorCardProps {
  indicator: Indicator;
  onRefresh: () => void;
}

export const IndicatorCard = ({ indicator, onRefresh }: IndicatorCardProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const getImportanceColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  const getStatusIcon = () => {
    if (!indicator.response) {
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
    switch (indicator.response.status) {
      case 'approved':
      case 'reviewed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Edit className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = () => {
    if (!indicator.response) {
      return language === 'ar' ? 'لم يبدأ' : 'Not Started';
    }
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      submitted: { ar: 'مُقدم', en: 'Submitted' },
      reviewed: { ar: 'تمت المراجعة', en: 'Reviewed' },
      approved: { ar: 'معتمد', en: 'Approved' },
    };
    return labels[indicator.response.status]?.[language] || indicator.response.status;
  };

  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors cursor-pointer group"
      onClick={() => navigate(`/accreditation/indicator/${indicator.id}`)}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Badge variant="outline" className="font-mono text-xs">
            {indicator.code}
          </Badge>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{indicator.name}</h4>
          {indicator.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {indicator.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge className={`text-xs ${getImportanceColor(indicator.importance_level)}`}>
          {getImportanceLabel(indicator.importance_level)}
        </Badge>
        
        <div className="flex items-center gap-2 w-24">
          <Progress 
            value={indicator.response?.compliance_percentage || 0} 
            className="h-1.5" 
          />
          <span className="text-xs font-medium w-8">
            {indicator.response?.compliance_percentage || 0}%
          </span>
        </div>

        <Badge variant="secondary" className="text-xs">
          {getStatusLabel()}
        </Badge>

        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          {language === 'ar' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
