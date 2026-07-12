import { useEffect, useRef, useState } from "react";
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
import { z } from "zod";

// Validation schema for complaint form
const complaintSchema = z.object({
  studentName: z.string().trim().min(3).max(200),
  studentEmail: z.string().trim().email(),
  subject: z.string().trim().min(5).max(500),
  description: z.string().trim().min(10).max(5000)
});

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

interface AttachmentMetadata {
  name: string;
  path: string;
  type: string;
  size: number;
}

interface ComplaintSubmissionContext {
  complaintId: string;
  submissionToken: string;
  attachmentMetadata: AttachmentMetadata[];
}

const isMissingComplaintRpc = (error: { code?: string; message?: string; details?: string }) => {
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return error.code === "PGRST202"
    || (message.includes("submit_public_complaint") && message.includes("function"));
};

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; name_en: string | null }>>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const submissionContextRef = useRef<ComplaintSubmissionContext | null>(null);

  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    complainantAcademicId: "",
    complainantType: "",
    programId: "",
    complaintCategory: "",
    subject: "",
    description: "",
  });

  useEffect(() => {
    const loadPrograms = async () => {
      const { data } = await supabase.from("programs").select("id, name, name_en").order("name");
      if (data) setPrograms(data);
    };
    void loadPrograms();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    if (submissionContextRef.current) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? "لا يمكن تغيير الملفات بعد بدء محاولة الإرسال." : "Files cannot be changed after submission has started.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const selectedFiles = Array.from(e.target.files);
    const invalidFile = selectedFiles.find(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const expectedType = ATTACHMENT_TYPES[extension];
      return !expectedType || file.size < 1 || file.size > MAX_ATTACHMENT_SIZE
        || (file.type !== '' && file.type !== expectedType);
    });
    if (selectedFiles.length > MAX_ATTACHMENTS || invalidFile) {
      toast({
        title: t('common.error'),
        description: language === 'ar'
          ? "يسمح بحد أقصى 5 ملفات، وحجم 5MB لكل ملف، بصيغ PDF أو JPG أو PNG أو DOC أو DOCX."
          : "Use at most 5 files, up to 5MB each, in PDF, JPG, PNG, DOC, or DOCX format.",
        variant: "destructive",
      });
      e.target.value = "";
      setAttachments([]);
      return;
    }
    setAttachments(selectedFiles);
  };

  const uploadAttachments = async (metadata: AttachmentMetadata[]) => {
    const successfulPaths: string[] = [];
    for (let index = 0; index < attachments.length; index++) {
      const file = attachments[index];
      const attachment = metadata[index];
      const { error: uploadError } = await supabase.storage
        .from('complaint-attachments')
        .upload(attachment.path, file, { contentType: attachment.type, upsert: false });

      const alreadyExists = uploadError
        && /already exists|duplicate/i.test(uploadError.message || "");
      if (!uploadError || alreadyExists) {
        successfulPaths.push(attachment.path);
      } else {
        console.error("Complaint attachment upload failed", attachment.path, uploadError.message);
      }
    }
    return successfulPaths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input using zod
    const validation = complaintSchema.safeParse({
      studentName: formData.studentName,
      studentEmail: formData.studentEmail,
      subject: formData.subject,
      description: formData.description
    });
    
    if (!validation.success) {
      const errors = validation.error.errors;
      const errorMessages = errors.map(err => {
        if (err.path[0] === 'studentName') {
          return language === 'ar' ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters';
        }
        if (err.path[0] === 'studentEmail') {
          return language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address';
        }
        if (err.path[0] === 'subject') {
          return language === 'ar' ? 'الموضوع يجب أن يكون 5 أحرف على الأقل' : 'Subject must be at least 5 characters';
        }
        if (err.path[0] === 'description') {
          return language === 'ar' ? 'الوصف يجب أن يكون 10 أحرف على الأقل' : 'Description must be at least 10 characters';
        }
        return err.message;
      });
      
      toast({
        title: t('common.error'),
        description: errorMessages.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (!formData.complainantType || !formData.complaintCategory) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? "يرجى اختيار نوع مقدم الشكوى ونوع الشكوى." : "Select the complainant type and complaint category.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (!submissionContextRef.current) {
        const complaintId = crypto.randomUUID();
        submissionContextRef.current = {
          complaintId,
          submissionToken: crypto.randomUUID(),
          attachmentMetadata: attachments.map(file => {
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            return {
              name: file.name,
              path: `${complaintId}/${crypto.randomUUID()}.${extension}`,
              type: ATTACHMENT_TYPES[extension],
              size: file.size,
            };
          }),
        };
      }
      const context = submissionContextRef.current;

      const { data: submittedComplaintId, error: complaintRpcError } = await supabase.rpc("submit_public_complaint", {
        p_complaint_id: context.complaintId,
        p_submission_token: context.submissionToken,
        p_student_name: formData.studentName,
        p_student_email: formData.studentEmail,
        p_complainant_academic_id: formData.complainantAcademicId,
        p_complainant_type: formData.complainantType,
        p_program_id: formData.programId || null,
        p_complaint_category: formData.complaintCategory,
        p_subject: formData.subject,
        p_description: formData.description,
        p_attachments: context.attachmentMetadata,
      });

      let complaintId = submittedComplaintId || context.complaintId;
      let usedAtomicSubmission = !complaintRpcError;
      if (complaintRpcError) {
        if (!isMissingComplaintRpc(complaintRpcError)) throw complaintRpcError;

        const { error: legacyError } = await supabase.from("complaints").insert({
          id: context.complaintId,
          student_name: formData.studentName,
          student_email: formData.studentEmail,
          complainant_academic_id: formData.complainantAcademicId,
          complainant_type: formData.complainantType,
          program_id: formData.programId || null,
          complaint_category: formData.complaintCategory,
          subject: formData.subject,
          description: formData.description,
          type: formData.complaintCategory as "academic" | "administrative" | "technical" | "other",
          status: 'pending',
          attachments: null,
        });
        if (legacyError) throw legacyError;
        complaintId = context.complaintId;
        usedAtomicSubmission = false;
      }

      let failedAttachmentCount = 0;
      if (usedAtomicSubmission && context.attachmentMetadata.length > 0) {
        const successfulPaths = await uploadAttachments(context.attachmentMetadata);
        failedAttachmentCount = context.attachmentMetadata.length - successfulPaths.length;
        const { error: finalizeError } = await supabase.rpc("finalize_public_complaint_attachments", {
          p_complaint_id: complaintId,
          p_submission_token: context.submissionToken,
          p_successful_paths: successfulPaths,
        });
        if (finalizeError) {
          console.error("Complaint attachment finalization failed", finalizeError);
          failedAttachmentCount = context.attachmentMetadata.length;
        }
      } else if (!usedAtomicSubmission) {
        failedAttachmentCount = context.attachmentMetadata.length;
      }

      // Notify program coordinator(s) — fire-and-forget; don't block UX
      supabase.functions
        .invoke("notify-complaint-coordinators", {
          body: { complaintId, submissionToken: context.submissionToken },
        })
        .catch((err) => console.error("Coordinator notify failed:", err));

      toast({
        title: language === 'ar' ? "تم إرسال الشكوى بنجاح" : "Complaint submitted successfully",
        description: failedAttachmentCount > 0
          ? (language === 'ar'
            ? `تم حفظ الشكوى، لكن تعذر رفع ${failedAttachmentCount} من المرفقات.`
            : `The complaint was saved, but ${failedAttachmentCount} attachment(s) could not be uploaded.`)
          : (language === 'ar' ? "شكراً لك، سيتم مراجعة شكواك في أقرب وقت ممكن" : "Thank you, your complaint will be reviewed as soon as possible"),
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
                          disabled={loading || Boolean(submissionContextRef.current)}
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
