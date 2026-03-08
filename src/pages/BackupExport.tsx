import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Database, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { useLanguage } from "@/contexts/LanguageContext";

const DATASETS = [
  { name: "surveys", label: "الاستبيانات", labelEn: "Surveys" },
  { name: "questions", label: "الأسئلة", labelEn: "Questions" },
  { name: "responses", label: "الاستجابات", labelEn: "Responses" },
  { name: "answers", label: "الإجابات", labelEn: "Answers" },
  { name: "reports", label: "التقارير", labelEn: "Reports" },
  { name: "recommendations", label: "التوصيات", labelEn: "Recommendations" },
  { name: "programs", label: "البرامج", labelEn: "Programs" },
  { name: "courses", label: "المقررات", labelEn: "Courses" },
  { name: "survey_courses", label: "ربط الاستبيانات بالمقررات", labelEn: "Survey-Course Links" },
  { name: "survey_templates", label: "قوالب الاستبيانات", labelEn: "Survey Templates" },
];

export default function BackupExport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ time: string; totalRecords: number } | null>(null);
  const isAr = language === "ar";

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: isAr ? "خطأ" : "Error", description: isAr ? "يرجى تسجيل الدخول" : "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-backup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `backup-${new Date().toISOString().slice(0, 10)}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Try to read manifest from zip for summary
      setLastBackup({ time: new Date().toLocaleString(isAr ? "ar-SA" : "en-US"), totalRecords: 0 });

      toast({
        title: isAr ? "تم التصدير بنجاح" : "Export Successful",
        description: isAr ? "تم تنزيل ملف النسخ الاحتياطي" : "Backup file downloaded",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: isAr ? "خطأ في التصدير" : "Export Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <DashboardButton />
          <div>
            <h1 className="text-3xl font-bold">{isAr ? "النسخ الاحتياطي" : "Data Backup"}</h1>
            <p className="text-muted-foreground mt-1">
              {isAr ? "تصدير نسخة احتياطية من بيانات الاستبيانات" : "Export a backup of survey system data"}
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {isAr ? "تصدير النسخ الاحتياطي" : "Backup Export"}
            </CardTitle>
            <CardDescription>
              {isAr
                ? "يتم تصدير البيانات كملف ZIP يحتوي على ملفات JSON منظمة حسب المجال"
                : "Data is exported as a ZIP file containing organized JSON files by domain"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {DATASETS.map((ds) => (
                <div key={ds.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  {isAr ? ds.label : ds.labelEn}
                </div>
              ))}
            </div>

            <Button
              onClick={handleExport}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isAr ? "جاري التصدير..." : "Exporting..."}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {isAr ? "تصدير النسخة الاحتياطية" : "Export Backup"}
                </>
              )}
            </Button>

            {lastBackup && (
              <p className="text-sm text-muted-foreground text-center">
                {isAr ? `آخر تصدير: ${lastBackup.time}` : `Last export: ${lastBackup.time}`}
              </p>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => navigate("/system-settings")} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          {isAr ? "العودة لإعدادات النظام" : "Back to System Settings"}
        </Button>
      </div>
    </div>
  );
}
