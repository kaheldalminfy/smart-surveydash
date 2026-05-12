import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { Program } from "./complaintsHelpers";
import { useLanguage } from "@/contexts/LanguageContext";

interface NewComplaintState {
  title: string;
  description: string;
  category: string;
  priority: string;
  program_id: string;
}

interface NewComplaintDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newComplaint: NewComplaintState;
  onChange: (data: NewComplaintState) => void;
  onSubmit: () => void;
  programs: Program[];
}

const NewComplaintDialog = ({ isOpen, onOpenChange, newComplaint, onChange, onSubmit, programs }: NewComplaintDialogProps) => {
  const { t } = useLanguage();
  return (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button>
        <Plus className="h-4 w-4 ml-2" />
        {t('complaintsUI.new')}
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t('complaintsUI.newTitle')}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('complaintsUI.titleLabel')}</Label>
          <Input
            id="title"
            placeholder={t('complaintsUI.titlePh')}
            value={newComplaint.title}
            onChange={(e) => onChange({ ...newComplaint, title: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">{t('complaintsUI.category')}</Label>
            <select
              id="category"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={newComplaint.category}
              onChange={(e) => onChange({ ...newComplaint, category: e.target.value })}
            >
              <option value="academic">{t('complaintsUI.cat.academic')}</option>
              <option value="administrative">{t('complaintsUI.cat.administrative')}</option>
              <option value="technical">{t('complaintsUI.cat.technical')}</option>
              <option value="facility">{t('complaintsUI.cat.facility')}</option>
              <option value="other">{t('complaintsUI.cat.other')}</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="program">{t('complaintsUI.program')}</Label>
            <select
              id="program"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={newComplaint.program_id}
              onChange={(e) => onChange({ ...newComplaint, program_id: e.target.value })}
            >
              <option value="">{t('complaintsUI.selectProgram')}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">{t('complaintsUI.descLabel')}</Label>
          <Textarea
            id="description"
            placeholder={t('complaintsUI.descPh')}
            rows={6}
            value={newComplaint.description}
            onChange={(e) => onChange({ ...newComplaint, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('complaintsUI.cancel')}</Button>
          <Button onClick={onSubmit}>{t('complaintsUI.send')}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
  );
};

export default NewComplaintDialog;
