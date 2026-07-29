import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface PurgeExcessResponsesButtonProps {
  surveyId?: string;
  questionId: string;
  filterValues: string[];
  courseName: string;
  currentCount: number;
  actualStudents: number;
  onPurged?: () => void;
}

export const PurgeExcessResponsesButton = ({
  surveyId, questionId, filterValues, courseName, currentCount, actualStudents, onPurged,
}: PurgeExcessResponsesButtonProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ar = language === "ar";

  const excess = currentCount - actualStudents;
  const canPurge = !!surveyId && !!questionId && filterValues.length > 0 && actualStudents > 0 && excess > 0;
  if (!canPurge) return null;

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("purge_excess_responses", {
        p_survey_id: surveyId,
        p_question_id: questionId,
        p_filter_values: filterValues,
        p_actual_students: actualStudents,
        p_course_name: courseName,
      });
      if (error) throw error;
      const deleted = (data as any)?.deleted_count ?? 0;
      toast({
        title: ar ? "تم التنفيذ" : "Done",
        description: ar
          ? `تم حذف ${deleted} استجابة زائدة من مقرر "${courseName}".`
          : `Deleted ${deleted} excess responses from "${courseName}".`,
      });
      setOpen(false);
      onPurged?.();
    } catch (e: any) {
      const msg = String(e?.message || "");
      const friendly = msg.includes("not_authorized")
        ? (ar ? "لا تملك صلاحية تنفيذ هذه العملية." : "You are not authorized to perform this action.")
        : msg;
      toast({
        title: ar ? "خطأ" : "Error",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const Row = ({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) => (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${danger ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Trash2 className="h-4 w-4" />
        {ar ? "إلغاء الاستجابات الزائدة" : "Remove excess responses"}
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {ar ? "تأكيد إلغاء الاستجابات الزائدة" : "Confirm removal of excess responses"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="text-sm">
                  <Row label={ar ? "اسم المقرر" : "Course"} value={courseName} />
                  <Row label={ar ? "العدد الحالي للاستجابات" : "Current responses"} value={currentCount} />
                  <Row label={ar ? "العدد الفعلي للطلاب" : "Actual students"} value={actualStudents} />
                  <Row label={ar ? "عدد الاستجابات التي ستُحذف" : "Responses to delete"} value={excess} danger />
                </div>
                <p className="text-xs text-muted-foreground">
                  {ar
                    ? "سيتم حذف أحدث الاستجابات الزائدة الخاصة بهذا المقرر فقط، ولن تتأثر أي مقررات أو استبانات أخرى. العملية لا يمكن التراجع عنها وسيتم تسجيلها في سجل التدقيق."
                    : "Only the most recent excess responses of this course will be deleted. Other courses and surveys are unaffected. This action is irreversible and will be recorded in the audit log."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); run(); }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (ar ? "تأكيد الحذف" : "Confirm delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
