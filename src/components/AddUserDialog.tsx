import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export default function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.fullName) {
      toast({
        title: t('common.error'),
        description: t('addUser.fillRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "create_user",
          email: formData.email,
          fullName: formData.fullName,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: t('addUser.success'),
        description: `${t('addUser.success')} ${formData.fullName}. ${t('addUser.password')}: ${data.tempPassword}`,
      });

      setFormData({ email: "", fullName: "" });
      onOpenChange(false);
      onUserAdded();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('addUser.fillRequired'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('addUser.title')}
          </DialogTitle>
          <DialogDescription>
            {t('addUser.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('addUser.fullName')} *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder={t('addUser.fullName')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('addUser.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@university.edu"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('addUser.defaultPassword')}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('addUser.adding') : t('addUser.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
