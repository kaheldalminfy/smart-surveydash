import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getMeanLevel } from "./reportConstants";

interface QuestionsSummaryChartProps {
  likertRatingQuestions: any[];
}

export const QuestionsSummaryChart = ({ likertRatingQuestions }: QuestionsSummaryChartProps) => {
  if (likertRatingQuestions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          ملخص متوسطات الأسئلة
        </CardTitle>
        <CardDescription>مقارنة متوسطات جميع الأسئلة (ليكرت والتقييم)</CardDescription>
      </CardHeader>
      <CardContent>
        <div id="summary-chart" className="min-h-[400px] bg-white p-4 rounded-lg" style={{ height: Math.max(400, likertRatingQuestions.length * 50) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={likertRatingQuestions.map((q, i) => ({
                name: q.text.length > 40 ? q.text.substring(0, 40) + '...' : q.text,
                fullName: q.text,
                shortName: `س${i + 1}`,
                mean: parseFloat(q.mean) || 0,
                responses: q.responseCount,
              }))}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="category"
                dataKey="shortName"
                tick={{ fontSize: 12, fontWeight: 'bold' }}
                interval={0}
              />
              <YAxis type="number" domain={[0, 5]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const level = getMeanLevel(data.mean);
                    return (
                      <div className="bg-card p-3 rounded-lg border shadow-lg max-w-sm" style={{ direction: 'rtl' }}>
                        <p className="font-medium text-sm mb-2 leading-relaxed">{data.fullName}</p>
                        <p className="text-primary font-bold">المتوسط: {data.mean.toFixed(2)}</p>
                        <p className="text-muted-foreground text-xs">التقييم: {level.label}</p>
                        <p className="text-muted-foreground text-xs">عدد الاستجابات: {data.responses}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="mean" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {likertRatingQuestions.map((q, i) => {
                  const mean = parseFloat(q.mean) || 0;
                  const color = mean >= 4 ? '#22c55e' : mean >= 3 ? '#eab308' : '#ef4444';
                  return <Cell key={`cell-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-3 text-sm">دليل الأسئلة:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {likertRatingQuestions.map((q, i) => (
              <div key={q.id} className="flex gap-2">
                <Badge variant="outline" className="shrink-0">س{i + 1}</Badge>
                <span className="text-muted-foreground truncate" title={q.text}>{q.text}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
