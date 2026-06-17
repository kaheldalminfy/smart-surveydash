import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Send, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportContentEditorCardProps {
  reportTypeLabel: string;
  reportTitle: string;
  summaryText: string;
  recommendationsText: string;
  isSaving: boolean;
  onReportTitleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onRecommendationsChange: (value: string) => void;
  onSave: () => void;
  onSaveAndTransfer: () => void;
}

export const ReportContentEditorCard = ({
  reportTypeLabel,
  reportTitle,
  summaryText,
  recommendationsText,
  isSaving,
  onReportTitleChange,
  onSummaryChange,
  onRecommendationsChange,
  onSave,
  onSaveAndTransfer,
}: ReportContentEditorCardProps) => {
  const { language, t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {language === "ar" ? "تحرير محتوى التقرير" : "Edit Report Content"}
          </CardTitle>
          <Badge variant="secondary">{reportTypeLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="report-title">{language === "ar" ? "عنوان التقرير في PDF" : "PDF Report Title"}</Label>
          <Input
            id="report-title"
            value={reportTitle}
            onChange={(event) => onReportTitleChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-summary">{t("reports.executiveSummary")}</Label>
          <Textarea
            id="report-summary"
            value={summaryText}
            onChange={(event) => onSummaryChange(event.target.value)}
            rows={7}
            className="resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-recommendations">{t("reports.recommendationsLabel")}</Label>
          <Textarea
            id="report-recommendations"
            value={recommendationsText}
            onChange={(event) => onRecommendationsChange(event.target.value)}
            rows={7}
            className="resize-y"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onSave} disabled={isSaving}>
            <Save className="h-4 w-4 ml-2" />
            {isSaving ? (language === "ar" ? "جار الحفظ..." : "Saving...") : t("reports.saveData")}
          </Button>
          <Button variant="secondary" onClick={onSaveAndTransfer} disabled={isSaving}>
            <Send className="h-4 w-4 ml-2" />
            {t("reports.saveAndTransfer")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
