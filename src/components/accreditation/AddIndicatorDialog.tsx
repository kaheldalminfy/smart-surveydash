import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface AddIndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standardId: string;
  onSuccess: () => void;
  nextOrderIndex: number;
}

export const AddIndicatorDialog = ({ 
  open, 
  onOpenChange, 
  standardId,
  onSuccess,
  nextOrderIndex 
}: AddIndicatorDialogProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    objective: "",
    responsible_party: "",
    importance_level: "medium" as 'critical' | 'high' | 'medium' | 'low',
    response_guidelines: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "يرجى إدخال رمز واسم المؤشر" : "Please enter code and name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("accreditation_indicators")
        .insert({
          standard_id: standardId,
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          objective: formData.objective.trim() || null,
          responsible_party: formData.responsible_party.trim() || null,
          importance_level: formData.importance_level,
          response_guidelines: formData.response_guidelines.trim() || null,
          order_index: nextOrderIndex,
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? "تم الإنشاء" : "Created",
        description: language === 'ar' ? "تم إنشاء المؤشر بنجاح" : "Indicator created successfully",
      });
      
      onOpenChange(false);
      onSuccess();
      
      setFormData({
        code: "",
        name: "",
        description: "",
        objective: "",
        responsible_party: "",
        importance_level: "medium",
        response_guidelines: "",
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إضافة مؤشر جديد' : 'Add New Indicator'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'أدخل بيانات المؤشر الجديد'
              : 'Enter the details for the new indicator'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رمز المؤشر *' : 'Indicator Code *'}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: S1.1' : 'e.g., S1.1'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'درجة الأهمية' : 'Importance Level'}</Label>
              <Select 
                value={formData.importance_level} 
                onValueChange={(value: 'critical' | 'high' | 'medium' | 'low') => 
                  setFormData({ ...formData, importance_level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">{language === 'ar' ? 'حرج' : 'Critical'}</SelectItem>
                  <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High'}</SelectItem>
                  <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                  <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم المؤشر *' : 'Indicator Name *'}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={language === 'ar' ? 'مثال: وجود هيكل تنظيمي معتمد' : 'e.g., Approved organizational structure'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'وصف المؤشر' : 'Description'}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={language === 'ar' ? 'وصف تفصيلي للمؤشر...' : 'Detailed description...'}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الهدف' : 'Objective'}</Label>
            <Textarea
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              placeholder={language === 'ar' ? 'ما الهدف من هذا المؤشر...' : 'What is the objective...'}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الجهة المسؤولة' : 'Responsible Party'}</Label>
            <Input
              value={formData.responsible_party}
              onChange={(e) => setFormData({ ...formData, responsible_party: e.target.value })}
              placeholder={language === 'ar' ? 'مثال: عمادة التطوير' : 'e.g., Development Dean'}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'إرشادات الرد' : 'Response Guidelines'}</Label>
            <Textarea
              value={formData.response_guidelines}
              onChange={(e) => setFormData({ ...formData, response_guidelines: e.target.value })}
              placeholder={language === 'ar' ? 'إرشادات لصياغة الرد...' : 'Guidelines for response...'}
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
