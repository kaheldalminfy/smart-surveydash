import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ComplaintResolutionDialogProps {
  isOpen: boolean;
  resolutionNotes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ComplaintResolutionDialog = ({ isOpen, resolutionNotes, onNotesChange, onClose, onConfirm }: ComplaintResolutionDialogProps) => (
  <Dialog open={isOpen} onOpenChange={() => onClose()}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>إضافة ملاحظات المعالجة</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="resolution-notes">ملاحظات المعالجة</Label>
          <Textarea
            id="resolution-notes"
            placeholder="اكتب هنا تفاصيل كيفية معالجة الشكوى والإجراءات المتخذة..."
            rows={6}
            value={resolutionNotes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={onConfirm} disabled={!resolutionNotes.trim()}>
            حفظ وتحديث الحالة
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default ComplaintResolutionDialog;
