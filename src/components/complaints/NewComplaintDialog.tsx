import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { Program } from "./complaintsHelpers";

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

const NewComplaintDialog = ({ isOpen, onOpenChange, newComplaint, onChange, onSubmit, programs }: NewComplaintDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button>
        <Plus className="h-4 w-4 ml-2" />
        شكوى جديدة
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>تقديم شكوى جديدة</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">عنوان الشكوى</Label>
          <Input
            id="title"
            placeholder="اكتب عنواناً واضحاً للشكوى"
            value={newComplaint.title}
            onChange={(e) => onChange({ ...newComplaint, title: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">الفئة</Label>
            <select
              id="category"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={newComplaint.category}
              onChange={(e) => onChange({ ...newComplaint, category: e.target.value })}
            >
              <option value="academic">أكاديمي</option>
              <option value="administrative">إداري</option>
              <option value="technical">تقني</option>
              <option value="facility">مرافق</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="program">البرنامج</Label>
            <select
              id="program"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={newComplaint.program_id}
              onChange={(e) => onChange({ ...newComplaint, program_id: e.target.value })}
            >
              <option value="">اختر البرنامج</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">وصف الشكوى</Label>
          <Textarea
            id="description"
            placeholder="اشرح تفاصيل الشكوى بوضوح..."
            rows={6}
            value={newComplaint.description}
            onChange={(e) => onChange({ ...newComplaint, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={onSubmit}>إرسال الشكوى</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default NewComplaintDialog;
