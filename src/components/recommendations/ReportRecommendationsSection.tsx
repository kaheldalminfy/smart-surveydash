import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, ExternalLink, BookOpen } from "lucide-react";

interface ReportRecommendation {
  report_id: string;
  recommendations_text: string;
  academic_year: string | null;
  semester: string | null;
  survey_id: string | null;
  survey_title: string;
  program_id: string | null;
  program_name: string;
  courses: { name: string; code: string }[];
}

interface GroupedByProgram {
  program_name: string;
  program_id: string;
  items: ReportRecommendation[];
}

interface Props {
  reportRecommendations: ReportRecommendation[];
}

const ReportRecommendationsSection = ({ reportRecommendations }: Props) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Group by program
  const grouped: GroupedByProgram[] = [];
  const programMap = new Map<string, GroupedByProgram>();

  for (const rec of reportRecommendations) {
    const key = rec.program_id || "unknown";
    if (!programMap.has(key)) {
      const group: GroupedByProgram = {
        program_name: rec.program_name,
        program_id: key,
        items: [],
      };
      programMap.set(key, group);
      grouped.push(group);
    }
    programMap.get(key)!.items.push(rec);
  }

  const getSemesterLabel = (sem: string | null) => {
    if (!sem) return "";
    if (sem === "first") return t("recommendations.firstSem");
    if (sem === "second") return t("recommendations.secondSem");
    if (sem === "summer") return t("recommendations.summerSemester");
    return sem;
  };

  if (grouped.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          {t("recommendations.noReportRecommendations")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("recommendations.reportRecommendations")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {grouped.map((group) => (
            <AccordionItem key={group.program_id} value={group.program_id}>
              <AccordionTrigger className="text-base">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{group.program_name}</span>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {group.items.map((rec) => (
                    <div
                      key={rec.report_id}
                      className="border rounded-lg p-4 space-y-3 bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {rec.survey_title}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {rec.academic_year && (
                              <Badge variant="outline">{rec.academic_year}</Badge>
                            )}
                            {rec.semester && (
                              <Badge variant="outline">{getSemesterLabel(rec.semester)}</Badge>
                            )}
                            {rec.courses.map((c, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {c.code} - {c.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {rec.survey_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/reports/${rec.survey_id}`)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className={language === "ar" ? "mr-1" : "ml-1"}>
                              {t("recommendations.viewReport")}
                            </span>
                          </Button>
                        )}
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed bg-background rounded p-3 border">
                        {rec.recommendations_text}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ReportRecommendationsSection;
export type { ReportRecommendation };
