import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Complaint } from "./complaintsHelpers";

interface ComplaintEditDialogProps {
  isOpen: boolean;
  editData: Partial<Complaint>;
  onClose: () => void;
  onChange: (data: Partial<Complaint>) => void;
  onSave: () => void;
}

const ComplaintEditDialog = ({ isOpen, editData, onClose, onChange, onSave }: ComplaintEditDialogProps) => {
  if (!isOpen || !editData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل الشكوى</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-subject">عنوان الشكوى</Label>
            <Input
              id="edit-subject"
              value={editData.subject || ""}
              onChange={(e) => onChange({ ...editData, subject: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-type">نوع الشكوى</Label>
            <select
              id="edit-type"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={editData.type || ""}
              onChange={(e) => onChange({ ...editData, type: e.target.value })}
            >
              <option value="academic">أكاديمي</option>
              <option value="administrative">إداري</option>
              <option value="technical">تقني</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="edit-description">وصف الشكوى</Label>
            <Textarea
              id="edit-description"
              rows={6}
              value={editData.description || ""}
              onChange={(e) => onChange({ ...editData, description: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button onClick={onSave}>حفظ التعديلات</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplaintEditDialog;
