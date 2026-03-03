import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, ExternalLink, Eye } from "lucide-react";

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
  report_status: string | null;
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
  const [selectedText, setSelectedText] = useState<string | null>(null);

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
    if (!sem) return "-";
    if (sem === "first") return t("recommendations.firstSem");
    if (sem === "second") return t("recommendations.secondSem");
    if (sem === "summer") return t("recommendations.summerSemester");
    return sem;
  };

  const getStatusBadge = (status: string | null) => {
    const map: Record<string, { label: string; className: string }> = {
      responding: { label: t("recommendations.responding"), className: "bg-blue-100 text-blue-800 border-blue-200" },
      completed: { label: t("recommendations.completedReport"), className: "bg-green-100 text-green-800 border-green-200" },
      no_response: { label: t("recommendations.noResponse"), className: "bg-orange-100 text-orange-800 border-orange-200" },
      cancelled: { label: t("recommendations.cancelled"), className: "bg-red-100 text-red-800 border-red-200" },
    };
    const s = map[status || "responding"] || map.responding;
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  const truncate = (text: string, max = 80) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("recommendations.reportRecommendations")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {grouped.map((group) => (
            <div key={group.program_id}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-base">{group.program_name}</h3>
                <Badge variant="secondary">{group.items.length}</Badge>
              </div>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("recommendations.surveyTitle")}</TableHead>
                      <TableHead>{t("recommendations.courseName")}</TableHead>
                      <TableHead>{t("recommendations.recommendationText")}</TableHead>
                      <TableHead>{t("recommendations.reportStatus")}</TableHead>
                      <TableHead>{t("common.academicYear")}</TableHead>
                      <TableHead>{t("common.semester")}</TableHead>
                      <TableHead className="text-center">{t("recommendations.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((rec) => (
                      <TableRow key={rec.report_id}>
                        <TableCell className="font-medium whitespace-nowrap">{rec.survey_title || "-"}</TableCell>
                        <TableCell>
                          {rec.courses.length > 0
                            ? rec.courses.map((c, i) => (
                                <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
                                  {c.code} - {c.name}
                                </Badge>
                              ))
                            : <span className="text-muted-foreground text-xs">{t("recommendations.noCourses")}</span>}
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <div className="flex items-start gap-1">
                            <span className="text-sm leading-relaxed">{truncate(rec.recommendations_text)}</span>
                            {rec.recommendations_text.length > 80 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => setSelectedText(rec.recommendations_text)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(rec.report_status)}</TableCell>
                        <TableCell className="whitespace-nowrap">{rec.academic_year || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{getSemesterLabel(rec.semester)}</TableCell>
                        <TableCell className="text-center">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Full text dialog */}
      <Dialog open={!!selectedText} onOpenChange={(open) => !open && setSelectedText(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("recommendations.recommendationText")}</DialogTitle>
            <DialogDescription>{t("recommendations.viewFull")}</DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted rounded-md">
            {selectedText}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportRecommendationsSection;
export type { ReportRecommendation };
