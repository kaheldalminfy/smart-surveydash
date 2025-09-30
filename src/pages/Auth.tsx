import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate registration
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-primary rounded-full">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">منظومة الاستبيانات الذكية</CardTitle>
            <CardDescription>كلية العلوم الإنسانية والاجتماعية</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" type="email" placeholder="name@university.edu" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input id="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري الدخول..." : "دخول"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <Input id="name" type="text" placeholder="الاسم الكامل" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                  <Input id="reg-email" type="email" placeholder="name@university.edu" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program">البرنامج</Label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2" required>
                    <option value="">اختر البرنامج</option>
                    <option value="law">القانون</option>
                    <option value="marketing">التسويق</option>
                    <option value="business">إدارة الأعمال</option>
                    <option value="finance">التمويل والمصارف</option>
                    <option value="project">إدارة المشاريع</option>
                    <option value="healthcare">إدارة الرعاية الصحية</option>
                    <option value="english">اللغة الإنجليزية</option>
                    <option value="masters">ماجستير إدارة الرعاية الصحية</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">كلمة المرور</Label>
                  <Input id="reg-password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري الإنشاء..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
