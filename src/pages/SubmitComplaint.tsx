import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Upload, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    complainantAcademicId: "",
    complainantType: "",
    programId: "",
    semester: "",
    academicYear: "",
    complaintCategory: "",
    subject: "",
    description: "",
  });

  // Load programs on mount
  useState(() => {
    const loadPrograms = async () => {
      const { data } = await supabase.from("programs").select("*").order("name");
      if (data) setPrograms(data);
    };
    loadPrograms();
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const uploadAttachments = async (complaintId: string) => {
    const uploadedFiles = [];
    
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${complaintId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('complaint-attachments')
        .upload(fileName, file);

      if (!uploadError) {
        uploadedFiles.push({
          name: file.name,
          path: fileName,
          type: file.type,
          size: file.size
        });
      }
    }
    
    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentName || !formData.studentEmail || !formData.subject || !formData.description) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const complaintId = crypto.randomUUID();
      
      let attachmentData = null;
      if (attachments.length > 0) {
        const uploadedFiles = await uploadAttachments(complaintId);
        attachmentData = uploadedFiles;
      }

      const { error: complaintError } = await supabase
        .from("complaints")
        .insert({
          id: complaintId,
          student_name: formData.studentName,
          student_email: formData.studentEmail,
          complainant_academic_id: formData.complainantAcademicId,
          complainant_type: formData.complainantType,
          program_id: formData.programId || null,
          semester: formData.semester,
          academic_year: formData.academicYear,
          complaint_category: formData.complaintCategory,
          subject: formData.subject,
          description: formData.description,
          type: formData.complaintCategory as any || 'other',
          status: 'pending',
          attachments: attachmentData,
        });

      if (complaintError) throw complaintError;

      toast({
        title: language === 'ar' ? "تم إرسال الشكوى بنجاح" : "Complaint submitted successfully",
        description: language === 'ar' ? "شكراً لك، سيتم مراجعة شكواك في أقرب وقت ممكن" : "Thank you, your complaint will be reviewed as soon as possible",
      });

      navigate("/complaint-submitted");
    } catch (error: any) {
      console.error("Error submitting complaint:", error);
      toast({
        title: t('common.error'),
        description: language === 'ar' ? "حدث خطأ أثناء إرسال الشكوى" : "An error occurred while submitting the complaint",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold">{t('complaints.submitTitle')}</h1>
              <p className="text-muted-foreground mt-2">{t('complaints.submitSubtitle')}</p>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('complaints.confidentialNote')}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                {t('complaints.formTitle')}
              </CardTitle>
              <CardDescription>{t('complaints.formSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('complaints.personalInfo')}</h3>
                  
                  <div>
                    <Label htmlFor="studentName">{t('complaints.fullName')} *</Label>
                    <Input
                      id="studentName"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder={language === 'ar' ? "أدخل الاسم الكامل" : "Enter full name"}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="studentEmail">{t('complaints.email')} *</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={formData.studentEmail}
                      onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                      placeholder="example@limu.edu.ly"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="academicId">{t('complaints.academicId')}</Label>
                    <Input
                      id="academicId"
                      value={formData.complainantAcademicId}
                      onChange={(e) => setFormData({ ...formData, complainantAcademicId: e.target.value })}
                      placeholder={language === 'ar' ? "أدخل الرقم الأكاديمي أو الوظيفي" : "Enter academic or employee ID"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="complainantType">{t('complaints.complainantType')} *</Label>
                    <Select
                      value={formData.complainantType}
                      onValueChange={(value) => setFormData({ ...formData, complainantType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? "اختر نوع المشتكي" : "Select complainant type"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">{t('complaints.student')}</SelectItem>
                        <SelectItem value="faculty">{t('complaints.faculty')}</SelectItem>
                        <SelectItem value="staff">{t('complaints.staff')}</SelectItem>
                        <SelectItem value="other">{t('complaints.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="program">{t('complaints.program')}</Label>
                    <Select
                      value={formData.programId}
                      onValueChange={(value) => setFormData({ ...formData, programId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('complaints.selectProgram')} />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {language === 'en' && program.name_en ? program.name_en : program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="semester">{t('complaints.semester')}</Label>
                      <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('complaints.selectSemester')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="خريف">{t('complaints.fall')}</SelectItem>
                          <SelectItem value="ربيع">{t('complaints.spring')}</SelectItem>
                          <SelectItem value="صيف">{t('complaints.summer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="academicYear">{t('complaints.academicYear')}</Label>
                      <Input
                        id="academicYear"
                        value={formData.academicYear}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                        placeholder={language === 'ar' ? "مثال: 2025-2026" : "e.g., 2025-2026"}
                      />
                    </div>
                  </div>
                </div>

                {/* Complaint Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('complaints.details')}</h3>

                  <div>
                    <Label htmlFor="category">{t('complaints.category')} *</Label>
                    <Select
                      value={formData.complaintCategory}
                      onValueChange={(value) => setFormData({ ...formData, complaintCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? "اختر نوع الشكوى" : "Select complaint type"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">{t('complaints.academic')}</SelectItem>
                        <SelectItem value="administrative">{t('complaints.administrative')}</SelectItem>
                        <SelectItem value="technical">{t('complaints.technical')}</SelectItem>
                        <SelectItem value="other">{t('complaints.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">{t('complaints.complaintSubject')} *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder={language === 'ar' ? "اكتب موضوع الشكوى بإيجاز" : "Write the complaint subject briefly"}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">{t('complaints.complaintDetails')} *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={language === 'ar' ? "اشرح شكواك بالتفصيل..." : "Explain your complaint in detail..."}
                      rows={6}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="attachments">{t('complaints.attachments')}</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="attachments"
                        className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      >
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {attachments.length > 0
                              ? `${attachments.length} ${t('complaints.filesSelected')}`
                              : t('complaints.uploadFiles')}
                          </p>
                        </div>
                        <Input
                          id="attachments"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                      </label>
                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {attachments.map((file, index) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              • {file.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? t('complaints.submitting') : t('complaints.submitBtn')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    disabled={loading}
                  >
                    {t('complaints.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SubmitComplaint;
