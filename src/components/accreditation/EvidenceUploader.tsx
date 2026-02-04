import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, FileText, Trash2, Download, 
  Image, File, FileSpreadsheet, Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Evidence {
  id: string;
  title: string;
  description: string | null;
  evidence_type: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

interface EvidenceUploaderProps {
  responseId?: string;
  indicatorId: string;
}

export const EvidenceUploader = ({ responseId, indicatorId }: EvidenceUploaderProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (responseId) {
      loadEvidence();
    } else {
      setLoading(false);
    }
  }, [responseId]);

  const loadEvidence = async () => {
    if (!responseId) return;
    
    const { data, error } = await supabase
      .from("indicator_evidence")
      .select("*")
      .eq("response_id", responseId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEvidence(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!responseId) {
      toast({
        title: language === 'ar' ? "تنبيه" : "Note",
        description: language === 'ar' 
          ? "يرجى حفظ الرد أولاً قبل رفع الأدلة"
          : "Please save the response first before uploading evidence",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${indicatorId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('accreditation-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('accreditation-files')
        .getPublicUrl(fileName);

      // Create evidence record
      const { error: insertError } = await supabase
        .from("indicator_evidence")
        .insert({
          response_id: responseId,
          title: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          evidence_type: getEvidenceType(file.type),
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;

      toast({
        title: language === 'ar' ? "تم الرفع" : "Uploaded",
        description: language === 'ar' ? "تم رفع الملف بنجاح" : "File uploaded successfully",
      });
      
      loadEvidence();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;

    try {
      const { error } = await supabase
        .from("indicator_evidence")
        .delete()
        .eq("id", evidenceId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? "تم الحذف" : "Deleted",
      });
      loadEvidence();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getEvidenceType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    return 'other';
  };

  const getFileIcon = (type: string | null) => {
    switch (type) {
      case 'image': return <Image className="h-5 w-5 text-purple-500" />;
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'spreadsheet': return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      default: return <File className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {language === 'ar' ? 'الأدلة والمرفقات' : 'Evidence & Attachments'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'ارفق المستندات والأدلة الداعمة للرد'
            : 'Attach supporting documents and evidence'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Upload Button */}
        <div className="mb-4">
          <Input
            type="file"
            id="evidence-upload"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading || !responseId}
          />
          <label htmlFor="evidence-upload">
            <Button 
              variant="outline" 
              className="w-full" 
              asChild
              disabled={uploading || !responseId}
            >
              <span className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ml-2" />
                    {language === 'ar' ? 'رفع ملف جديد' : 'Upload New File'}
                  </>
                )}
              </span>
            </Button>
          </label>
          {!responseId && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {language === 'ar' 
                ? 'احفظ الرد أولاً لتتمكن من رفع الأدلة'
                : 'Save the response first to upload evidence'
              }
            </p>
          )}
        </div>

        {/* Evidence List */}
        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : evidence.length > 0 ? (
          <div className="space-y-2">
            {evidence.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(item.evidence_type)}
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.file_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(item.file_url!, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{language === 'ar' ? 'لا توجد مرفقات' : 'No attachments yet'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
