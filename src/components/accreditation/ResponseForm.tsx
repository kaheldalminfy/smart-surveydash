import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Send, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Indicator {
  id: string;
  code: string;
  name: string;
  response_template: string | null;
}

interface Response {
  id: string;
  response_text: string | null;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
  compliance_level: 'compliant' | 'partial' | 'non_compliant' | null;
  compliance_percentage: number;
  academic_year: string | null;
  semester: string | null;
}

interface ResponseFormProps {
  indicator: Indicator;
  response: Response | null;
  onResponseUpdate: () => void;
}

export const ResponseForm = ({ indicator, response, onResponseUpdate }: ResponseFormProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    response_text: response?.response_text || "",
    academic_year: response?.academic_year || "",
    semester: response?.semester || "",
  });

  useEffect(() => {
    if (response) {
      setFormData({
        response_text: response.response_text || "",
        academic_year: response.academic_year || "",
        semester: response.semester || "",
      });
    }
  }, [response]);

  const handleSave = async (status: 'draft' | 'submitted' = 'draft') => {
    if (status === 'draft') {
      setSaving(true);
    } else {
      setSubmitting(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        indicator_id: indicator.id,
        response_text: formData.response_text || null,
        academic_year: formData.academic_year || null,
        semester: formData.semester || null,
        status,
        submitted_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (response?.id) {
        // Update existing response
        const { error } = await supabase
          .from("indicator_responses")
          .update(payload)
          .eq("id", response.id);

        if (error) throw error;
      } else {
        // Create new response
        const { error } = await supabase
          .from("indicator_responses")
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: status === 'draft' 
          ? (language === 'ar' ? "تم الحفظ" : "Saved")
          : (language === 'ar' ? "تم الإرسال" : "Submitted"),
        description: status === 'draft'
          ? (language === 'ar' ? "تم حفظ الرد كمسودة" : "Response saved as draft")
          : (language === 'ar' ? "تم إرسال الرد للمراجعة" : "Response submitted for review"),
      });
      
      onResponseUpdate();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const useTemplate = () => {
    if (indicator.response_template) {
      setFormData({ ...formData, response_text: indicator.response_template });
    }
  };

  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear - 1}/${currentYear}`,
    `${currentYear}/${currentYear + 1}`,
    `${currentYear + 1}/${currentYear + 2}`,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {language === 'ar' ? 'الرد على المؤشر' : 'Indicator Response'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'اكتب ردك على هذا المؤشر مع توضيح مدى الاستيفاء'
            : 'Write your response to this indicator explaining compliance level'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'السنة الأكاديمية' : 'Academic Year'}</Label>
            <Select 
              value={formData.academic_year} 
              onValueChange={(value) => setFormData({ ...formData, academic_year: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر السنة' : 'Select year'} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الفصل الدراسي' : 'Semester'}</Label>
            <Select 
              value={formData.semester} 
              onValueChange={(value) => setFormData({ ...formData, semester: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الفصل' : 'Select semester'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">{language === 'ar' ? 'الأول' : 'First'}</SelectItem>
                <SelectItem value="second">{language === 'ar' ? 'الثاني' : 'Second'}</SelectItem>
                <SelectItem value="summer">{language === 'ar' ? 'الصيفي' : 'Summer'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>{language === 'ar' ? 'نص الرد' : 'Response Text'}</Label>
            {indicator.response_template && (
              <Button variant="ghost" size="sm" onClick={useTemplate}>
                {language === 'ar' ? 'استخدام النموذج' : 'Use Template'}
              </Button>
            )}
          </div>
          <Textarea
            value={formData.response_text}
            onChange={(e) => setFormData({ ...formData, response_text: e.target.value })}
            placeholder={language === 'ar' 
              ? 'اكتب ردك هنا... يمكنك توضيح الإجراءات المتخذة والأدلة المتوفرة'
              : 'Write your response here... explain actions taken and available evidence'
            }
            rows={8}
            className="resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving || submitting}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            {language === 'ar' ? 'حفظ كمسودة' : 'Save Draft'}
          </Button>
          <Button 
            onClick={() => handleSave('submitted')}
            disabled={saving || submitting || !formData.response_text}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            {language === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
