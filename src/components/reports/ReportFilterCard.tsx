import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Target, Users } from "lucide-react";

interface ReportFilterCardProps {
  allQuestions: any[];
  hasAnswersData: boolean;
  filterQuestion: string;
  filterValues: string[];
  filteredResponsesCount: number;
  manualEnrollment: string;
  onFilterQuestionChange: (questionId: string) => void;
  onFilterValueChange: (value: string) => void;
  onClearFilter: () => void;
  onManualEnrollmentChange: (v: string) => void;
  getFilterOptions: () => string[];
}

export const ReportFilterCard = ({
  allQuestions,
  hasAnswersData,
  filterQuestion,
  filterValues,
  filteredResponsesCount,
  manualEnrollment,
  onFilterQuestionChange,
  onFilterValueChange,
  onClearFilter,
  onManualEnrollmentChange,
  getFilterOptions,
}: ReportFilterCardProps) => {
  if (allQuestions.length === 0 || !hasAnswersData) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            فلترة التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">اختر السؤال للفلترة</Label>
              <Select value={filterQuestion} onValueChange={onFilterQuestionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر سؤالاً..." />
                </SelectTrigger>
                <SelectContent>
                  {allQuestions.filter(q => q.type !== 'text').map((q, i) => (
                    <SelectItem key={q.id} value={q.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {q.type === 'mcq' ? 'اختيار' : q.type === 'likert' ? 'ليكرت' : 'تقييم'}
                        </Badge>
                        س{i + 1}: {q.text.substring(0, 35)}{q.text.length > 35 ? '...' : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">اختر القيم (يتم تطبيق الفلتر تلقائياً)</Label>
              <div className={`border rounded-lg p-3 max-h-40 overflow-y-auto ${!filterQuestion ? 'opacity-50 pointer-events-none' : ''}`}>
                {!filterQuestion ? (
                  <p className="text-sm text-muted-foreground text-center">اختر سؤالاً أولاً</p>
                ) : getFilterOptions().length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">لا توجد خيارات</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getFilterOptions().map((opt: string, i: number) => {
                      const selectedQuestion = allQuestions.find(q => q.id === filterQuestion);
                      const isLikert = selectedQuestion?.type === 'likert' || selectedQuestion?.type === 'rating';
                      const isSelected = filterValues.includes(opt);

                      return (
                        <Badge
                          key={i}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer px-3 py-1"
                          onClick={() => onFilterValueChange(opt)}
                        >
                          {isLikert ? `${opt}/5` : opt}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(filterQuestion || filterValues.length > 0) && (
            <Button variant="ghost" size="sm" onClick={onClearFilter} className="mt-3">
              مسح الفلتر
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual enrollment card - shown when filter is active */}
      {filterQuestion && filterValues.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-indigo-500/5 to-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              حساب نسبة الاستجابة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">أدخل عدد المسجلين</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="أدخل عدد المسجلين..."
                  value={manualEnrollment}
                  onChange={(e) => onManualEnrollmentChange(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">عدد المستجيبين (من النظام)</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold">{filteredResponsesCount}</span>
                  <span className="text-sm text-muted-foreground">مستجيب</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">نسبة الاستجابة</Label>
                {(() => {
                  const manualNum = parseInt(manualEnrollment);
                  if (!manualEnrollment || isNaN(manualNum) || manualNum <= 0) {
                    return (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30">
                        <span className="text-sm text-muted-foreground">أدخل العدد لحساب النسبة</span>
                      </div>
                    );
                  }
                  const rate = Math.min(100, Math.round((filteredResponsesCount / manualNum) * 100));
                  const rateColor = rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-orange-600';
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                        <span className={`text-2xl font-bold ${rateColor}`}>{rate}%</span>
                        <span className="text-sm text-muted-foreground">
                          ({filteredResponsesCount} / {manualNum})
                        </span>
                      </div>
                      <Progress value={rate} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {rate < 50 ? '⚠️ نسبة استجابة منخفضة' : rate >= 70 ? '✓ نسبة استجابة جيدة' : '⚡ نسبة استجابة مقبولة'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
