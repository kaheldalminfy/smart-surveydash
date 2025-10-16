import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, Award, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ProgramComparison = () => {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("name");

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error("Error loading programs:", error);
    }
  };

  const loadComparisonData = async () => {
    if (selectedPrograms.length < 2) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار برنامجين على الأقل للمقارنة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const comparisons = await Promise.all(
        selectedPrograms.map(async (programId) => {
          const { data: surveys } = await supabase
            .from("surveys")
            .select(`
              id,
              title,
              responses (
                id,
                answers (
                  numeric_value,
                  questions (type)
                )
              )
            `)
            .eq("program_id", programId);

          if (!surveys) return null;

          const program = programs.find(p => p.id === programId);
          const totalResponses = surveys.reduce((sum, s) => sum + (s.responses?.length || 0), 0);
          
          const likertAnswers = surveys.flatMap(s => 
            s.responses?.flatMap(r => 
              r.answers?.filter((a: any) => a.questions?.type === 'likert' && a.numeric_value) || []
            ) || []
          );

          const averageScore = likertAnswers.length > 0
            ? likertAnswers.reduce((sum: number, a: any) => sum + (a.numeric_value || 0), 0) / likertAnswers.length
            : 0;

          return {
            name: program?.name || 'برنامج',
            totalSurveys: surveys.length,
            totalResponses,
            averageScore: parseFloat(averageScore.toFixed(2)),
            satisfactionRate: ((averageScore / 5) * 100).toFixed(1),
          };
        })
      );

      const validComparisons = comparisons.filter(Boolean);
      
      if (validComparisons.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد بيانات كافية للمقارنة",
        });
        return;
      }

      setComparisonData({
        programs: validComparisons,
        radarData: validComparisons.map(c => ({
          subject: c?.name || '',
          A: c?.averageScore || 0,
          fullMark: 5,
        })),
      });

    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات المقارنة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>مقارنة البرامج الأكاديمية</CardTitle>
          <CardDescription>قارن أداء البرامج المختلفة بناءً على نتائج الاستبيانات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">اختر البرامج للمقارنة (2+)</label>
              <Select
                onValueChange={(value) => {
                  if (!selectedPrograms.includes(value)) {
                    setSelectedPrograms([...selectedPrograms, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر برنامج" />
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter(p => !selectedPrograms.includes(p.id))
                    .map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadComparisonData} disabled={loading || selectedPrograms.length < 2}>
              {loading ? "جاري التحليل..." : "مقارنة"}
              <ArrowRight className="h-4 w-4 mr-2" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedPrograms.map((programId) => {
              const program = programs.find(p => p.id === programId);
              return (
                <Badge 
                  key={programId} 
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setSelectedPrograms(selectedPrograms.filter(p => p !== programId))}
                >
                  {program?.name} ×
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {comparisonData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonData.programs.map((program: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {index === 0 && <Award className="h-5 w-5 text-accent" />}
                    {program.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">الاستبيانات:</span>
                    <Badge variant="outline">{program.totalSurveys}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">الاستجابات:</span>
                    <Badge variant="outline">{program.totalResponses}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">المتوسط:</span>
                    <Badge variant="secondary">{program.averageScore}/5</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">نسبة الرضا:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-primary">{program.satisfactionRate}%</span>
                      <TrendingUp className="h-4 w-4 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>مقارنة المتوسطات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData.programs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="averageScore" fill="hsl(var(--primary))" name="المتوسط" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الأداء الشامل</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={comparisonData.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 5]} />
                    <Radar name="الأداء" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ProgramComparison;
