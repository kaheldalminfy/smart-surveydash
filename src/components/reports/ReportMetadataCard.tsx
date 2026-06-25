import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getReportCopy, SurveyReportType } from "@/utils/reportType";

interface ReportMetadataCardProps {
  semester: string;
  academicYear: string;
  reportStatus: string;
  targetEnrollment: string;
  reportType: SurveyReportType;
  onSemesterChange: (v: string) => void;
  onAcademicYearChange: (v: string) => void;
  onReportStatusChange: (v: string) => void;
  onTargetEnrollmentChange: (v: string) => void;
  onSave: () => void;
}

export const ReportMetadataCard = ({
  semester, academicYear, reportStatus, targetEnrollment, reportType, onSemesterChange,
  onAcademicYearChange, onReportStatusChange, onTargetEnrollmentChange, onSave,
}: ReportMetadataCardProps) => {
  const { t, language } = useLanguage();
  const copy = getReportCopy(reportType, language);

  return (
    <Card>
      <CardHeader><CardTitle>{t('reports.metadata')}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{t('reports.semester')}</Label>
            <Input placeholder={t('reports.semesterPlaceholder')} value={semester} onChange={(e) => onSemesterChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('reports.academicYear')}</Label>
            <Input placeholder="2024-2025" value={academicYear} onChange={(e) => onAcademicYearChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('reports.status')}</Label>
            <Select value={reportStatus} onValueChange={onReportStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="responding">{t('reports.responding')}</SelectItem>
                <SelectItem value="completed">{t('reports.completed')}</SelectItem>
                <SelectItem value="no_response">{t('reports.noResponse')}</SelectItem>
                <SelectItem value="cancelled">{t('reports.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-target-enrollment" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {copy.targetCount}
            </Label>
            <Input
              id="report-target-enrollment"
              type="number"
              min="0"
              placeholder={copy.targetHint}
              value={targetEnrollment}
              onChange={(e) => onTargetEnrollmentChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{copy.targetHint}</p>
          </div>
        </div>
        <Button onClick={onSave} className="mt-4">
          <Save className="h-4 w-4 ml-2" />
          {t('reports.saveData')}
        </Button>
      </CardContent>
    </Card>
  );
};
