import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, AlertTriangle, Snowflake } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

interface Program { id: string; name: string }

export default function ArchiveCreateWizard({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const ar = language === "ar";

  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState<string>("__college__");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [freeze, setFreeze] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

  const semesters = ar ? ["خريف", "ربيع", "صيف"] : ["Fall", "Spring", "Summer"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => `${currentYear - i}-${currentYear - i + 1}`);

  useEffect(() => {
    if (!open) return;
    setStep(1); setPreview(null); setClosingNotes("");
    supabase.from("programs").select("id,name").order("name").then(({ data }) => setPrograms(data ?? []));
  }, [open]);

  const fetchPreview = async () => {
    const pid = programId === "__college__" ? null : programId;
    const [s, c, r] = await Promise.all([
      supabase.from("surveys").select("id", { count: "exact", head: true })
        .eq("academic_year", academicYear).eq("semester", semester).eq("program_id", pid as any),
      supabase.from("complaints").select("id", { count: "exact", head: true })
        .eq("academic_year", academicYear).eq("semester", semester).eq("program_id", pid as any),
      supabase.from("recommendations").select("id", { count: "exact", head: true })
        .eq("academic_year", academicYear).eq("semester", semester).eq("program_id", pid as any),
    ]);
    setPreview({ surveys: s.count ?? 0, complaints: c.count ?? 0, recommendations: r.count ?? 0 });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-period-archive", {
        body: {
          program_id: programId === "__college__" ? null : programId,
          academic_year: academicYear,
          semester,
          closing_notes: closingNotes || null,
          freeze,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: ar ? "تم إنشاء الأرشيف" : "Archive created" });
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: ar ? "خطأ" : "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ar ? `معالج الأرشفة — الخطوة ${step}/4` : `Archive Wizard — Step ${step}/4`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>{ar ? "البرنامج" : "Program"}</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__college__">{ar ? "مستوى الكلية" : "College Level"}</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{ar ? "السنة الأكاديمية" : "Academic Year"}</Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ar ? "الفصل" : "Semester"}</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {ar ? "مراجعة محتوى الفترة قبل الأرشفة." : "Review the period content before archiving."}
            </p>
            {!preview ? (
              <Button onClick={fetchPreview} variant="outline">{ar ? "حساب المحتوى" : "Calculate"}</Button>
            ) : (
              <Card><CardContent className="p-4 space-y-2">
                <div className="flex justify-between"><span>{ar ? "الاستبيانات" : "Surveys"}</span><b>{preview.surveys}</b></div>
                <div className="flex justify-between"><span>{ar ? "الشكاوى" : "Complaints"}</span><b>{preview.complaints}</b></div>
                <div className="flex justify-between"><span>{ar ? "التوصيات" : "Recommendations"}</span><b>{preview.recommendations}</b></div>
              </CardContent></Card>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Label>{ar ? "ملاحظات ختامية للفترة" : "Closing notes"}</Label>
            <Textarea rows={6} value={closingNotes} onChange={e => setClosingNotes(e.target.value)}
              placeholder={ar ? "ملخص، إنجازات، تحديات…" : "Summary, achievements, challenges…"} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{ar ? "تأكيد التجميد" : "Freeze confirmation"}</p>
                <p className="text-muted-foreground">
                  {ar
                    ? "بعد التجميد لا يمكن تعديل أو حذف الأرشيف. يمكن فك التجميد فقط بواسطة المسؤول."
                    : "Once frozen, the archive cannot be modified or deleted. Only an admin can unfreeze it."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="freeze" type="checkbox" checked={freeze} onChange={e => setFreeze(e.target.checked)} />
              <Label htmlFor="freeze" className="cursor-pointer flex items-center gap-2">
                <Snowflake className="h-4 w-4" />
                {ar ? "تجميد الأرشيف الآن" : "Freeze archive now"}
              </Label>
            </div>
            <div className="text-sm text-muted-foreground">
              {ar ? "إذا لم تختر التجميد، سيُحفظ كمسودة قابلة للحذف." : "If unchecked, saved as deletable draft."}
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={submitting}>{ar ? "السابق" : "Back"}</Button>}
          {step < 4 && (
            <Button onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!academicYear || !semester)}>
              {ar ? "التالي" : "Next"}
            </Button>
          )}
          {step === 4 && (
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {ar ? "إنشاء الأرشيف" : "Create archive"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
