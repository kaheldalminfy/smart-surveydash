import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Sparkles, Trash2, Eye, Loader2 } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";

interface ReportHeaderProps {
  surveyTitle?: string;
  programName?: string;
  isGenerating: boolean;
  isExporting: boolean;
  isGeneratingPreview: boolean;
  onRegenerate: () => void;
  onPreviewPDF: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onDelete: () => void;
}

export const ReportHeader = ({
  surveyTitle,
  programName,
  isGenerating,
  isExporting,
  isGeneratingPreview,
  onRegenerate,
  onPreviewPDF,
  onExportPDF,
  onExportExcel,
  onDelete,
}: ReportHeaderProps) => {
  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">تقرير الاستبيان</h1>
            <p className="text-sm text-muted-foreground">
              {surveyTitle} - {programName}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <DashboardButton />
            <Button variant="outline" onClick={onRegenerate} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 ml-2" />
              {isGenerating ? "جاري التحليل..." : "إعادة التحليل"}
            </Button>
            <Button variant="outline" onClick={onPreviewPDF} disabled={isGeneratingPreview}>
              <Eye className="h-4 w-4 ml-2" />
              معاينة
            </Button>
            <Button variant="accent" onClick={onExportPDF} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 ml-2" />
              )}
              {isExporting ? "جاري التصدير..." : "PDF"}
            </Button>
            <Button variant="secondary" onClick={onExportExcel}>
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              Excel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 ml-2" />
              حذف
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
