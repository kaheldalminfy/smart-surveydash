import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, ListTree } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getMeanLevel, MCQ_COLORS } from "./reportConstants";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuestionAnalysisSectionProps {
  detailedAnswers: any[];
  totalResponses: number;
}

export const QuestionAnalysisSection = ({ detailedAnswers, totalResponses }: QuestionAnalysisSectionProps) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        {t('reports.questionAnalysis')}
      </h2>

      {detailedAnswers.map((question, index) => {
        const previousQuestion = detailedAnswers[index - 1];
        const startsSection = Boolean(
          question.sectionId && question.sectionId !== previousQuestion?.sectionId,
        );
        const questionNumber = question.questionNumber ?? index + 1;

        return (
        <Fragment key={question.id}>
          {startsSection && (
            <div className="flex items-start gap-3 border-s-4 border-primary bg-primary/5 px-4 py-3">
              <ListTree className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <h3 className="text-base font-semibold leading-6 break-words">
                {question.sectionTitle}
              </h3>
            </div>
          )}

        <Card>
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="default">{t('reports.question')} {questionNumber}</Badge>
                  <Badge variant="outline">
                    {question.type === 'likert' ? t('reports.likertScale') :
                     question.type === 'rating' ? t('reports.ratingLabel') :
                     question.type === 'mcq' ? t('reports.mcqLabel') : t('reports.freeText')}
                  </Badge>
                  <Badge variant="secondary">{question.responseCount} {t('reports.response')}</Badge>
                </div>
                <CardTitle className="text-base leading-7 whitespace-normal break-words sm:text-lg">
                  {question.text}
                </CardTitle>
              </div>

              {(question.type === 'likert' || question.type === 'rating') && parseFloat(question.mean) > 0 && (
                <div className="self-start text-center sm:shrink-0">
                  <div className={`px-4 py-2 rounded-lg ${getMeanLevel(parseFloat(question.mean)).color} text-white`}>
                    <p className="text-2xl font-bold">{question.mean}</p>
                    <p className="text-xs">{getMeanLevel(parseFloat(question.mean)).label}</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {(question.type === 'likert' || question.type === 'rating') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div id={`chart-likert-${question.id}`} className="bg-white p-4 rounded-lg">
                    <h4 className="font-medium mb-3 text-sm text-muted-foreground">{t('reports.responseDistribution')}</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={question.distribution}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const total = question.distribution.reduce((sum: number, d: any) => sum + d.value, 0);
                                const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                                return (
                                  <div className="bg-card p-3 rounded-lg border shadow-lg">
                                    <p className="font-medium">{data.name}</p>
                                    <p className="text-primary">{t('reports.countLabel')}: {data.value}</p>
                                    <p className="text-muted-foreground">{t('reports.percentLabel')}: {percentage}%</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {question.distribution.map((entry: any, i: number) => (
                              <Cell key={`cell-${i}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 text-sm text-muted-foreground">{t('reports.distributionTable')}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">{t('reports.responseLabel')}</TableHead>
                          <TableHead className="text-right w-20">{t('reports.countLabel')}</TableHead>
                          <TableHead className="text-right w-24">{t('reports.percentLabel')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {question.distribution.map((item: any, i: number) => {
                          const total = question.distribution.reduce((sum: number, d: any) => sum + d.value, 0);
                          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                          return (
                            <TableRow key={i}>
                              <TableCell className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                                {item.name}
                              </TableCell>
                              <TableCell>{item.value}</TableCell>
                              <TableCell>{percentage}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3 sm:gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('reports.mean')}</p>
                    <p className="text-xl font-bold text-primary">{question.mean}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('reports.stdDev')}</p>
                    <p className="text-xl font-bold">{question.stdDev}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('reports.responseRateLabel')}</p>
                    <p className="text-xl font-bold">{totalResponses > 0 ? ((question.responseCount / totalResponses) * 100).toFixed(0) : 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {question.type === 'mcq' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id={`chart-mcq-${question.id}`} className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">{t('reports.choiceDistribution')}</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={question.mcqDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {question.mcqDistribution.map((entry: any, i: number) => (
                            <Cell key={`cell-${i}`} fill={MCQ_COLORS[i % MCQ_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">{t('reports.percentages')}</h4>
                  <div className="space-y-3">
                    {question.mcqDistribution.map((item: any, i: number) => {
                      const total = question.mcqDistribution.reduce((sum: number, d: any) => sum + d.value, 0);
                      const percentage = total > 0 ? (item.value / total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="min-w-0 break-words">{item.name}</span>
                            <span className="shrink-0 font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {question.type === 'text' && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">{t('reports.textResponses')} ({question.textResponses.length})</h4>
                {question.textResponses.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {question.textResponses.map((response: string, i: number) => (
                      <div key={i} className="p-4 bg-muted/30 rounded-lg border-r-4 border-primary">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                          <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed">{response}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{t('reports.noTextResponses')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </Fragment>
        );
      })}
    </div>
  );
};
