import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { academicYearOptions, FrameworkType } from "@/lib/accreditationScope";

interface Props {
  frameworkType: FrameworkType;
  programs: { id: string; name: string }[];
  programId: string | null;
  year: string;
  canEdit: boolean;
  onChange: (next: { program?: string | null; year?: string }) => void;
}

export const ScopeSelector = ({ frameworkType, programs, programId, year, canEdit, onChange }: Props) => {
  const { language } = useLanguage();
  const ar = language === "ar";
  const years = academicYearOptions();
  if (!years.includes(year)) years.unshift(year);
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <Label>{ar ? "السنة الأكاديمية" : "Academic year"}</Label>
        <Select value={year} onValueChange={(v) => onChange({ year: v })}>
          <SelectTrigger className="w-44" aria-label={ar ? "السنة الأكاديمية" : "Academic year"}><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {frameworkType === "programmatic" ? (
        <div className="space-y-1">
          <Label>{ar ? "البرنامج المُقيَّم" : "Assessed program"}</Label>
          {programs.length === 0 ? (
            <p className="text-sm text-destructive">{ar ? "لا توجد برامج مرتبطة بحسابك" : "No programs assigned to you"}</p>
          ) : (
            <Select value={programId ?? ""} onValueChange={(v) => onChange({ program: v })} disabled={programs.length === 1}>
              <SelectTrigger className="w-64" aria-label={ar ? "البرنامج المُقيَّم" : "Assessed program"}><SelectValue /></SelectTrigger>
              <SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      ) : (
        <Badge variant="secondary">{ar ? "تقييم مؤسسي على مستوى الكلية" : "College-level institutional assessment"}</Badge>
      )}
      <Badge variant={canEdit ? "default" : "outline"}>
        {canEdit ? (ar ? "صلاحية التعديل" : "Can edit") : (ar ? "عرض فقط" : "View only")}
      </Badge>
    </div>
  );
};
