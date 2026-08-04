import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen, Edit, ExternalLink, Eye } from "lucide-react";

export interface UnifiedRecommendation {
  key: string;
  kind: "manual" | "report";
  id: string | null;
  report_id?: string | null;
  title: string;
  description: string;
  course_name: string | null;
  program_id: string | null;
  program_name: string;
  academic_year: string | null;
  semester: string | null;
  status: string | null;
  priority: string | null;
  updated_at: string | null;
  survey_id: string | null;
}

interface Props {
  items: UnifiedRecommendation[];
  onStatusChange: (item: UnifiedRecommendation, status: string) => void;
  onEdit: (id: string) => void;
}

const SEMESTER_ORDER: Record<string, number> = { summer: 3, second: 2, first: 1 };

const RecommendationYearGroup = ({ items, onStatusChange, onEdit }: Props) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [fullText, setFullText] = useState<string | null>(null);

  const semesterLabel = (sem: string | null) => {
    if (sem === "first") return t("recommendations.firstSem");
    if (sem === "second") return t("recommendations.secondSem");
    if (sem === "summer") return t("recommendations.summerSemester");
    return sem || "-";
  };

  const statusLabel = (status: string | null) => {
    const map: Record<string, string> = {
      pending: t("recommendations.statusNotDone"),
      in_progress: t("recommendations.statusInProgress"),
      completed: t("recommendations.statusDone"),
      postponed: t("recommendations.postponed"),
    };
    return map[status || "pending"] || t("recommendations.statusNotDone");
  };

  const priorityBadge = (priority: string | null) => {
    if (!priority) return <span className="text-xs text-muted-foreground">-</span>;
    const map: Record<string, { label: string; variant: "outline" | "secondary" | "destructive" }> = {
      low: { label: t("recommendations.low"), variant: "outline" },
      medium: { label: t("recommendations.medium"), variant: "secondary" },
      high: { label: t("recommendations.high"), variant: "destructive" },
    };
    const p = map[priority] || map.medium;
    return <Badge variant={p.variant}>{p.label}</Badge>;
  };

  const truncate = (text: string, max = 90) => (text.length <= max ? text : text.slice(0, max) + "...");

  // Group: semester -> program
  const semesterKeys = Array.from(new Set(items.map((i) => i.semester || ""))).sort(
    (a, b) => (SEMESTER_ORDER[b] || 0) - (SEMESTER_ORDER[a] || 0)
  );

  return (
    <>
      <div className="space-y-6">
        {semesterKeys.map((sem) => {
          const semItems = items.filter((i) => (i.semester || "") === sem);
          const programKeys = Array.from(new Set(semItems.map((i) => i.program_id || "unknown"))).sort((a, b) => {
            const na = semItems.find((i) => (i.program_id || "unknown") === a)?.program_name || "";
            const nb = semItems.find((i) => (i.program_id || "unknown") === b)?.program_name || "";
            return na.localeCompare(nb);
          });

          const done = semItems.filter((i) => i.status === "completed").length;
          const rate = semItems.length > 0 ? Math.round((done / semItems.length) * 100) : 0;

          return (
            <div key={sem || "none"} className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold">{semesterLabel(sem || null)}</h3>
                <Badge variant="secondary">
                  {semItems.length} {t("recommendations.itemsCount")}
                </Badge>
                <div className="flex items-center gap-2 min-w-[160px]">
                  <Progress value={rate} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("recommendations.progress")} {rate}%
                  </span>
                </div>
              </div>

              {programKeys.map((pid) => {
                const progItems = semItems.filter((i) => (i.program_id || "unknown") === pid);
                return (
                  <div key={pid} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      {progItems[0]?.program_name || t("recommendations.programLabel")}
                    </div>
                    <div className="rounded-md border overflow-auto bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("recommendations.courseName")}</TableHead>
                            <TableHead>{t("recommendations.titleLabel")}</TableHead>
                            <TableHead>{t("recommendations.recommendationText")}</TableHead>
                            <TableHead>{t("recommendations.source")}</TableHead>
                            <TableHead>{t("recommendations.priority")}</TableHead>
                            <TableHead>{t("recommendations.status")}</TableHead>
                            <TableHead className="text-center">{t("recommendations.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {progItems.map((item) => (
                            <TableRow key={item.key}>
                              <TableCell>
                                {item.course_name ? (
                                  <Badge className="whitespace-nowrap">{item.course_name}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{t("recommendations.noCourses")}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium max-w-[200px]">
                                <div className="truncate">{item.title}</div>
                                {item.updated_at && (
                                  <div className="text-xs text-muted-foreground">
                                    {t("recommendations.lastUpdated")}:{" "}
                                    {new Date(item.updated_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[260px]">
                                <div className="flex items-start gap-1">
                                  <span className="text-sm leading-relaxed">{truncate(item.description)}</span>
                                  {item.description.length > 90 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() => setFullText(item.description)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="whitespace-nowrap">
                                  {item.kind === "report"
                                    ? t("recommendations.sourceReport")
                                    : t("recommendations.sourceManual")}
                                </Badge>
                              </TableCell>
                              <TableCell>{priorityBadge(item.priority)}</TableCell>
                              <TableCell>
                                <Select
                                  value={item.status || "pending"}
                                  onValueChange={(v) => onStatusChange(item, v)}
                                >
                                  <SelectTrigger className="h-8 w-[150px]">
                                    <SelectValue>{statusLabel(item.status)}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="completed">{t("recommendations.statusDone")}</SelectItem>
                                    <SelectItem value="in_progress">{t("recommendations.statusInProgress")}</SelectItem>
                                    <SelectItem value="pending">{t("recommendations.statusNotDone")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                {item.id && (
                                  <Button variant="outline" size="sm" onClick={() => onEdit(item.id as string)}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {item.survey_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={language === "ar" ? "mr-1" : "ml-1"}
                                    onClick={() => navigate(`/reports/${item.survey_id}`)}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Dialog open={!!fullText} onOpenChange={(open) => !open && setFullText(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("recommendations.recommendationText")}</DialogTitle>
            <DialogDescription>{t("recommendations.viewFull")}</DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted rounded-md">{fullText}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecommendationYearGroup;
