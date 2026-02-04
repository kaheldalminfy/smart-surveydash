import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

interface AddStandardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  onSuccess: () => void;
  nextOrderIndex: number;
}

export const AddStandardDialog = ({ 
  open, 
  onOpenChange, 
  frameworkId,
  onSuccess,
  nextOrderIndex 
}: AddStandardDialogProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    weight: "1.0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "يرجى إدخال رمز واسم المعيار" : "Please enter code and name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("accreditation_standards")
        .insert({
          framework_id: frameworkId,
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          weight: parseFloat(formData.weight) || 1.0,
          order_index: nextOrderIndex,
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? "تم الإنشاء" : "Created",
        description: language === 'ar' ? "تم إنشاء المعيار بنجاح" : "Standard created successfully",
      });
      
      onOpenChange(false);
      onSuccess();
      
      setFormData({
        code: "",
        name: "",
        description: "",
        weight: "1.0",
      });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إضافة معيار جديد' : 'Add New Standard'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'أدخل بيانات المعيار الجديد'
              : 'Enter the details for the new standard'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رمز المعيار *' : 'Standard Code *'}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: S1' : 'e.g., S1'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوزن النسبي' : 'Weight'}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم المعيار *' : 'Standard Name *'}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={language === 'ar' ? 'مثال: الحوكمة والإدارة' : 'e.g., Governance and Administration'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={language === 'ar' ? 'وصف المعيار...' : 'Standard description...'}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {language === 'ar' ? 'إنشاء' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
