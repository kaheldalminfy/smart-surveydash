import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, BarChart3, Target, ListChecks, MessageSquare, AlertTriangle } from "lucide-react";

interface ReportStatisticsCardsProps {
  filteredResponsesCount: number;
  totalResponses: number;
  targetEnrollment: number;
  overallMean: number;
  questionsCount: number;
  totalTextResponses: number;
  hasFilter: boolean;
  hasAnswersData: boolean;
}

export const ReportStatisticsCards = ({
  filteredResponsesCount,
  totalResponses,
  targetEnrollment,
  overallMean,
  questionsCount,
  totalTextResponses,
  hasFilter,
  hasAnswersData,
}: ReportStatisticsCardsProps) => {
  const responseRate = targetEnrollment > 0
    ? Math.min(100, Math.round((filteredResponsesCount / targetEnrollment) * 100))
    : null;
  const rateColor = responseRate === null
    ? 'text-muted-foreground'
    : responseRate >= 70
      ? 'text-green-600'
      : responseRate >= 50
        ? 'text-yellow-600'
        : 'text-orange-600';
  const rateBgColor = responseRate === null
    ? 'from-gray-500/10 to-gray-600/5 border-gray-200'
    : responseRate >= 70
      ? 'from-green-500/10 to-green-600/5 border-green-200'
      : responseRate >= 50
        ? 'from-yellow-500/10 to-yellow-600/5 border-yellow-200'
        : 'from-orange-500/10 to-orange-600/5 border-orange-200';

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الاستجابات</p>
                <p className="text-3xl font-bold text-blue-600">{filteredResponsesCount}</p>
                {targetEnrollment > 0 && (
                  <p className="text-xs text-muted-foreground">من {targetEnrollment} طالب</p>
                )}
                {hasFilter && (
                  <p className="text-xs text-muted-foreground">مفلتر من {totalResponses}</p>
                )}
              </div>
              <Users className="h-10 w-10 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${rateBgColor}`}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">معدل الاستجابة</p>
                <Target className={`h-6 w-6 ${rateColor} opacity-30`} />
              </div>
              <p className={`text-3xl font-bold ${rateColor}`}>
                {responseRate !== null ? `${responseRate}%` : 'غير محدد'}
              </p>
              {targetEnrollment > 0 && (
                <div className="space-y-1">
                  <Progress value={responseRate || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {responseRate && responseRate < 50 ? '⚠️ نسبة منخفضة' : responseRate && responseRate >= 70 ? '✓ نسبة جيدة' : ''}
                  </p>
                </div>
              )}
              {!targetEnrollment && (
                <p className="text-xs text-muted-foreground">أضف عدد الطلبة في الاستبيان</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المتوسط العام</p>
                <p className="text-3xl font-bold text-green-600">{overallMean.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">من 5.0</p>
              </div>
              <BarChart3 className="h-10 w-10 text-green-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">عدد الأسئلة</p>
                <p className="text-3xl font-bold text-purple-600">{questionsCount}</p>
              </div>
              <ListChecks className="h-10 w-10 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">التعليقات النصية</p>
                <p className="text-3xl font-bold text-amber-600">{totalTextResponses}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasAnswersData && totalResponses > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-destructive">تنبيه: لا توجد إجابات محفوظة</p>
                <p className="text-sm text-muted-foreground">
                  يوجد {totalResponses} استجابة لكن بدون إجابات مفصلة. قد تكون هناك مشكلة في حفظ الإجابات عند تعبئة الاستبيان.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
