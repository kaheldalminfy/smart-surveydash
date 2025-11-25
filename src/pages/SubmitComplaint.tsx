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

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    
    // Validation
    if (!formData.studentName || !formData.studentEmail || !formData.subject || !formData.description) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Insert complaint
      const { data: complaint, error: complaintError } = await supabase
        .from("complaints")
        .insert({
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
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      // Upload attachments if any
      let attachmentData = null;
      if (attachments.length > 0 && complaint) {
        const uploadedFiles = await uploadAttachments(complaint.id);
        attachmentData = uploadedFiles;
        
        // Update complaint with attachment data
        await supabase
          .from("complaints")
          .update({ attachments: attachmentData })
          .eq("id", complaint.id);
      }

      toast({
        title: "تم إرسال الشكوى بنجاح",
        description: "شكراً لك، سيتم مراجعة شكواك في أقرب وقت ممكن",
      });

      navigate("/complaint-submitted");
    } catch (error: any) {
      console.error("Error submitting complaint:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إرسال الشكوى",
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
          <div className="text-center">
            <h1 className="text-3xl font-bold">تقديم شكوى</h1>
            <p className="text-muted-foreground mt-2">نحن هنا للاستماع إلى ملاحظاتك وشكاواك</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              جميع الشكاوى يتم معالجتها بسرية تامة. يرجى تقديم معلومات دقيقة لمساعدتنا في حل المشكلة بأسرع وقت ممكن.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                نموذج الشكوى
              </CardTitle>
              <CardDescription>يرجى ملء جميع الحقول المطلوبة (*)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">المعلومات الشخصية</h3>
                  
                  <div>
                    <Label htmlFor="studentName">الاسم الكامل *</Label>
                    <Input
                      id="studentName"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="أدخل الاسم الكامل"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="studentEmail">البريد الإلكتروني *</Label>
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
                    <Label htmlFor="academicId">الرقم الأكاديمي / الوظيفي</Label>
                    <Input
                      id="academicId"
                      value={formData.complainantAcademicId}
                      onChange={(e) => setFormData({ ...formData, complainantAcademicId: e.target.value })}
                      placeholder="أدخل الرقم الأكاديمي أو الوظيفي"
                    />
                  </div>

                  <div>
                    <Label htmlFor="complainantType">نوع المشتكي *</Label>
                    <Select
                      value={formData.complainantType}
                      onValueChange={(value) => setFormData({ ...formData, complainantType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المشتكي" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">طالب</SelectItem>
                        <SelectItem value="faculty">عضو هيئة تدريس</SelectItem>
                        <SelectItem value="staff">موظف</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="program">البرنامج الأكاديمي</Label>
                    <Select
                      value={formData.programId}
                      onValueChange={(value) => setFormData({ ...formData, programId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر البرنامج (اختياري)" />
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="semester">الفصل الدراسي</Label>
                      <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفصل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="خريف">خريف</SelectItem>
                          <SelectItem value="ربيع">ربيع</SelectItem>
                          <SelectItem value="صيف">صيف</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="academicYear">السنة الأكاديمية</Label>
                      <Input
                        id="academicYear"
                        value={formData.academicYear}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                        placeholder="مثال: 2025-2026"
                      />
                    </div>
                  </div>
                </div>

                {/* Complaint Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">تفاصيل الشكوى</h3>

                  <div>
                    <Label htmlFor="category">نوع الشكوى *</Label>
                    <Select
                      value={formData.complaintCategory}
                      onValueChange={(value) => setFormData({ ...formData, complaintCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الشكوى" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">أكاديمية</SelectItem>
                        <SelectItem value="administrative">إدارية</SelectItem>
                        <SelectItem value="technical">تقنية</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">موضوع الشكوى *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="اكتب موضوع الشكوى بإيجاز"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">تفاصيل الشكوى *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="اشرح شكواك بالتفصيل..."
                      rows={6}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="attachments">المرفقات (اختياري)</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="attachments"
                        className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      >
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {attachments.length > 0
                              ? `تم اختيار ${attachments.length} ملف`
                              : "انقر لرفع الملفات (PDF، صور، مستندات)"}
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
                    {loading ? "جاري الإرسال..." : "إرسال الشكوى"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    disabled={loading}
                  >
                    إلغاء
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