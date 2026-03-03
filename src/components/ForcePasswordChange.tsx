import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
}

export default function ForcePasswordChange({ onPasswordChanged }: ForcePasswordChangeProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword.length < 8) {
      toast({ title: t('common.error'), description: t('forcePassword.minLengthError'), variant: "destructive" });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast({ title: t('common.error'), description: t('forcePassword.mismatch'), variant: "destructive" });
      return;
    }
    if (formData.newPassword === "123456789") {
      toast({ title: t('common.error'), description: t('forcePassword.defaultError'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (updateError) throw updateError;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id);
      }
      toast({ title: t('forcePassword.success'), description: t('forcePassword.successDesc') });
      onPasswordChanged();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('forcePassword.failed'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-primary rounded-full">
              <KeyRound className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">{t('forcePassword.title')}</CardTitle>
            <CardDescription>{t('forcePassword.description')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('forcePassword.newPassword')}</Label>
              <div className="relative">
                <Input id="newPassword" type={showPassword ? "text" : "password"} value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder={t('forcePassword.placeholder')} required minLength={8} />
                <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('forcePassword.minLength')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('forcePassword.confirmPassword')}</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder={t('forcePassword.confirmPlaceholder')} required />
                <Button type="button" variant="ghost" size="sm" className="absolute left-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('forcePassword.updating') : t('forcePassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
