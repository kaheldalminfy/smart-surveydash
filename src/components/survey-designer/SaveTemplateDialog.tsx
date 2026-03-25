import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  templateDescription: string;
  setTemplateDescription: (desc: string) => void;
  templatePublic: boolean;
  setTemplatePublic: (pub: boolean) => void;
  onSave: () => void;
}

const SaveTemplateDialog = ({
  open, onOpenChange, templateName, setTemplateName,
  templateDescription, setTemplateDescription, templatePublic, setTemplatePublic, onSave,
}: SaveTemplateDialogProps) => {
  const { t, language } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('designer.saveTemplate')}</AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'ar' ? "احفظ هذا الاستبيان كنموذج لإعادة استخدامه لاحقاً" : "Save this survey as a template for reuse"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="template-name">{language === 'ar' ? "اسم النموذج" : "Template Name"}</Label>
            <Input id="template-name" placeholder={language === 'ar' ? "مثال: تقييم جودة المقرر" : "e.g. Course Quality Evaluation"}
              value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="template-description">{language === 'ar' ? "الوصف" : "Description"}</Label>
            <Textarea id="template-description" placeholder={language === 'ar' ? "وصف مختصر للنموذج" : "Brief template description"}
              value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="template-public" checked={templatePublic} onCheckedChange={setTemplatePublic} />
            <Label htmlFor="template-public">{language === 'ar' ? "جعل النموذج عاماً (متاح للجميع)" : "Make template public (available to all)"}</Label>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onSave}>
            {language === 'ar' ? "حفظ النموذج" : "Save Template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SaveTemplateDialog;
