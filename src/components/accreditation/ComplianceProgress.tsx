import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComplianceProgressProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ComplianceProgress = ({ 
  value, 
  size = 'md',
  showLabel = false,
  className 
}: ComplianceProgressProps) => {
  const { language } = useLanguage();
  
  const getColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = (percentage: number) => {
    if (percentage >= 80) return 'stroke-green-500';
    if (percentage >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const sizes = {
    sm: { width: 60, stroke: 4, fontSize: 'text-sm' },
    md: { width: 80, stroke: 6, fontSize: 'text-lg' },
    lg: { width: 120, stroke: 8, fontSize: 'text-2xl' },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-500", getBgColor(value))}
          />
        </svg>
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center font-bold",
            fontSize,
            getColor(value)
          )}
        >
          {value}%
        </div>
      </div>
      {showLabel && (
        <p className="text-sm text-muted-foreground mt-2">
          {language === 'ar' ? 'نسبة الاستيفاء' : 'Compliance Rate'}
        </p>
      )}
    </div>
  );
};
