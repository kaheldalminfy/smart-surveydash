import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

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
  semester,
  academicYear,
  reportStatus,
  onSemesterChange,
  onAcademicYearChange,
  onReportStatusChange,
  onSave,
}: ReportMetadataCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>بيانات التقرير</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>الفصل الدراسي</Label>
            <Input placeholder="الفصل الأول" value={semester} onChange={(e) => onSemesterChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>العام الأكاديمي</Label>
            <Input placeholder="2024-2025" value={academicYear} onChange={(e) => onAcademicYearChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>حالة التقرير</Label>
            <Select value={reportStatus} onValueChange={onReportStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="responding">تحت الاستجابة</SelectItem>
                <SelectItem value="completed">منتهي</SelectItem>
                <SelectItem value="no_response">لم يتم الاستجابة</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={onSave} className="mt-4">
          <Save className="h-4 w-4 ml-2" />
          حفظ البيانات
        </Button>
      </CardContent>
    </Card>
  );
};
