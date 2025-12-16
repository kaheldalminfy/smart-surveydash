import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Upload, Image } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";

export default function SystemSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collegeLogo, setCollegeLogo] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminRole();
    loadSettings();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "غير مصرح",
        description: "هذه الصفحة متاحة للمديرين فقط",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
  };

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .eq("key", "college_logo")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading settings:", error);
    } else if (data) {
      setCollegeLogo(data.value || "");
      setLogoPreview(data.value || "");
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "college_logo",
        value: collegeLogo,
        description: "شعار الكلية",
      }, {
        onConflict: "key"
      });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل حفظ الإعدادات",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الإعدادات بنجاح",
      });
      setLogoPreview(collegeLogo);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <DashboardButton />
          <div>
            <h1 className="text-3xl font-bold">إعدادات النظام</h1>
            <p className="text-muted-foreground mt-1">إدارة إعدادات النظام العامة</p>
          </div>
        </div>

        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              شعار الكلية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo">رابط الشعار (URL)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="logo"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={collegeLogo}
                  onChange={(e) => setCollegeLogo(e.target.value)}
                />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                أدخل رابط شعار الكلية. سيظهر في جميع التقارير المُصدرة.
              </p>
            </div>

            {/* Logo Preview */}
            {logoPreview && (
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  معاينة الشعار
                </h3>
                <div className="flex justify-center p-4 bg-muted rounded">
                  <img
                    src={logoPreview}
                    alt="College Logo"
                    className="max-h-32 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                      toast({
                        title: "خطأ",
                        description: "فشل تحميل الصورة. تأكد من صحة الرابط.",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">نصائح:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>استخدم صورة بخلفية شفافة (PNG) للحصول على أفضل نتيجة</li>
                <li>الحجم الموصى به: 200x200 بكسل أو أكبر</li>
                <li>تأكد من أن الرابط يعمل ويمكن الوصول إليه</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
