import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportMetadataCardProps {
  semester: string;
  academicYear: string;
  reportStatus: string;
  onSemesterChange: (v: string) => void;
  onAcademicYearChange: (v: string) => void;
  onReportStatusChange: (v: string) => void;
  onSave: () => void;
}

export const ReportMetadataCard = ({
  semester, academicYear, reportStatus, onSemesterChange,
  onAcademicYearChange, onReportStatusChange, onSave,
}: ReportMetadataCardProps) => {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader><CardTitle>{t('reports.metadata')}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
        <Button onClick={onSave} className="mt-4">
          <Save className="h-4 w-4 ml-2" />
          {t('reports.saveData')}
        </Button>
      </CardContent>
    </Card>
  );
};
