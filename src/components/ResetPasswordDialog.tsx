import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound } from "lucide-react";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onPasswordReset: () => void;
}

export default function ResetPasswordDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onPasswordReset 
}: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const defaultPassword = "123456789";

  const handleReset = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "reset_password",
          userId,
          newPassword: defaultPassword,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "تم إعادة تعيين كلمة المرور",
        description: `تم تعيين كلمة المرور الجديدة لـ ${userName} إلى: ${defaultPassword}`,
      });

      onOpenChange(false);
      onPasswordReset();
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل إعادة تعيين كلمة المرور",
        variant: "destructive",
      });
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
            إعادة تعيين كلمة المرور
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              هل أنت متأكد من إعادة تعيين كلمة المرور للمستخدم "<strong>{userName}</strong>"؟
            </p>
            <p className="bg-muted p-2 rounded-md text-center font-mono">
              كلمة المرور الجديدة: <strong>{defaultPassword}</strong>
            </p>
            <p className="text-amber-600">
              سيُطلب من المستخدم تغيير كلمة المرور عند تسجيل الدخول التالي.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={isLoading}>
            {isLoading ? "جارٍ إعادة التعيين..." : "إعادة تعيين كلمة المرور"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
