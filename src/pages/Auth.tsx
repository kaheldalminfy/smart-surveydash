import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { z } from "zod";
import ForcePasswordChange from "@/components/ForcePasswordChange";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = loginSchema.safeParse({
      email: formData.email,
      password: formData.password
    });
    
    if (!validation.success) {
      const errors = validation.error.errors;
      const errorMessages = errors.map(err => {
        if (err.path[0] === 'email') {
          return language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address';
        }
        if (err.path[0] === 'password') {
          return language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
        }
        return err.message;
      });
      
      toast({
        title: language === 'ar' ? "خطأ في البيانات" : "Validation error",
        description: errorMessages.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) throw error;

      // Check if user needs to change password
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("force_password_change")
          .eq("id", authData.user.id)
          .single();

        if (profile?.force_password_change) {
          setForcePasswordChange(true);
          return;
        }
      }

      toast({
        title: language === 'ar' ? "تم تسجيل الدخول بنجاح" : "Login successful",
        description: language === 'ar' ? "مرحباً بك في منظومة الاستبيانات الذكية" : "Welcome to the Smart Survey System",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: language === 'ar' ? "خطأ في تسجيل الدخول" : "Login error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show force password change screen
  if (forcePasswordChange) {
    return (
      <ForcePasswordChange
        onPasswordChanged={() => {
          setForcePasswordChange(false);
          navigate("/dashboard");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-primary rounded-full">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">{t('auth.systemTitle')}</CardTitle>
            <CardDescription>{t('auth.systemSubtitle')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@university.edu" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input 
                id="password" 
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.loggingIn') : t('auth.enter')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
