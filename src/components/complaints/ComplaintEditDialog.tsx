import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Complaint } from "./complaintsHelpers";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComplaintEditDialogProps {
  isOpen: boolean;
  editData: Partial<Complaint>;
  onClose: () => void;
  onChange: (data: Partial<Complaint>) => void;
  onSave: () => void;
}

const ComplaintEditDialog = ({ isOpen, editData, onClose, onChange, onSave }: ComplaintEditDialogProps) => {
  const { t } = useLanguage();
  if (!isOpen || !editData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('complaintsUI.editTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-subject">{t('complaintsUI.titleLabel')}</Label>
            <Input
              id="edit-subject"
              value={editData.subject || ""}
              onChange={(e) => onChange({ ...editData, subject: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-type">{t('complaintsUI.editType')}</Label>
            <select
              id="edit-type"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={editData.type || ""}
              onChange={(e) => onChange({ ...editData, type: e.target.value })}
            >
              <option value="academic">{t('complaintsUI.cat.academic')}</option>
              <option value="administrative">{t('complaintsUI.cat.administrative')}</option>
              <option value="technical">{t('complaintsUI.cat.technical')}</option>
              <option value="other">{t('complaintsUI.cat.other')}</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="edit-description">{t('complaintsUI.descLabel')}</Label>
            <Textarea
              id="edit-description"
              rows={6}
              value={editData.description || ""}
              onChange={(e) => onChange({ ...editData, description: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t('complaintsUI.cancel')}</Button>
            <Button onClick={onSave}>{t('complaintsUI.saveEdit')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplaintEditDialog;
