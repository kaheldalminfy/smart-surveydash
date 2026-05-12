import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComplaintResolutionDialogProps {
  isOpen: boolean;
  resolutionNotes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ComplaintResolutionDialog = ({ isOpen, resolutionNotes, onNotesChange, onClose, onConfirm }: ComplaintResolutionDialogProps) => {
  const { t } = useLanguage();
  return (
  <Dialog open={isOpen} onOpenChange={() => onClose()}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t('complaintsUI.resolveTitle')}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="resolution-notes">{t('complaintsUI.resolveLabel')}</Label>
          <Textarea
            id="resolution-notes"
            placeholder={t('complaintsUI.resolvePh')}
            rows={6}
            value={resolutionNotes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('complaintsUI.cancel')}</Button>
          <Button onClick={onConfirm} disabled={!resolutionNotes.trim()}>
            {t('complaintsUI.saveAndUpdate')}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
  );
};

export default ComplaintResolutionDialog;
