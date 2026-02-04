import { useState, useEffect } from "react";
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

interface Program {
  id: string;
  name: string;
}

interface AddFrameworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddFrameworkDialog = ({ open, onOpenChange, onSuccess }: AddFrameworkDialogProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    type: "programmatic" as 'institutional' | 'programmatic',
    scope: "national" as 'national' | 'international',
    version: "",
    description: "",
    program_id: "",
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("id, name");
    if (data) setPrograms(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: language === 'ar' ? "يرجى إدخال اسم الإطار" : "Please enter framework name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("accreditation_frameworks")
        .insert({
          name: formData.name.trim(),
          name_en: formData.name_en.trim() || null,
          type: formData.type,
          scope: formData.scope,
          version: formData.version.trim() || null,
          description: formData.description.trim() || null,
          program_id: formData.program_id || null,
          created_by: user?.id,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? "تم الإنشاء" : "Created",
        description: language === 'ar' ? "تم إنشاء الإطار بنجاح" : "Framework created successfully",
      });
      
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setFormData({
        name: "",
        name_en: "",
        type: "programmatic",
        scope: "national",
        version: "",
        description: "",
        program_id: "",
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
            {language === 'ar' ? 'إضافة إطار اعتماد جديد' : 'Add New Accreditation Framework'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'أدخل بيانات إطار الاعتماد الجديد'
              : 'Enter the details for the new accreditation framework'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم بالعربية *' : 'Name (Arabic) *'}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: معايير NCAAA' : 'e.g., NCAAA Standards'}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="e.g., NCAAA Standards"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الاعتماد' : 'Accreditation Type'}</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'institutional' | 'programmatic') => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="institutional">
                    {language === 'ar' ? 'مؤسسي' : 'Institutional'}
                  </SelectItem>
                  <SelectItem value="programmatic">
                    {language === 'ar' ? 'برامجي' : 'Programmatic'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'النطاق' : 'Scope'}</Label>
              <Select 
                value={formData.scope} 
                onValueChange={(value: 'national' | 'international') => setFormData({ ...formData, scope: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">
                    {language === 'ar' ? 'وطني' : 'National'}
                  </SelectItem>
                  <SelectItem value="international">
                    {language === 'ar' ? 'دولي' : 'International'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم الإصدار' : 'Version'}</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: 2.0' : 'e.g., 2.0'}
              />
            </div>

            {formData.type === 'programmatic' && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'البرنامج' : 'Program'}</Label>
                <Select 
                  value={formData.program_id} 
                  onValueChange={(value) => setFormData({ ...formData, program_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر البرنامج' : 'Select program'} />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={language === 'ar' ? 'وصف مختصر للإطار...' : 'Brief description of the framework...'}
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
