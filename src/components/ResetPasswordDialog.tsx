import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onPasswordReset: () => void;
}

export default function ResetPasswordDialog({ open, onOpenChange, userId, userName, onPasswordReset }: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const defaultPassword = "123456789";

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "reset_password", userId, newPassword: defaultPassword },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: t('resetPassword.success'), description: `${userName}: ${defaultPassword}` });
      onOpenChange(false);
      onPasswordReset();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('resetPassword.title'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t('resetPassword.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{t('resetPassword.confirm')} "<strong>{userName}</strong>"?</p>
            <p className="bg-muted p-2 rounded-md text-center font-mono">
              {t('resetPassword.newPassword')} <strong>{defaultPassword}</strong>
            </p>
            <p className="text-amber-600">{t('resetPassword.note')}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={isLoading}>
            {isLoading ? t('resetPassword.resetting') : t('resetPassword.reset')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
