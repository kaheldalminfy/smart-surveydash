import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Trash2, Plus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Program { id: string; name: string; }
interface UserRole { id?: string; role: AppRole; program_id: string | null; }

interface UserRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRoles: UserRole[];
  programs: Program[];
  onRolesUpdated: () => void;
}

export default function UserRolesDialog({ open, onOpenChange, userId, userName, currentRoles, programs, onRolesUpdated }: UserRolesDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRoles(currentRoles.length > 0 ? [...currentRoles] : []);
  }, [open, currentRoles]);

  const addRole = () => setRoles([...roles, { role: "coordinator", program_id: null }]);
  const removeRole = (index: number) => setRoles(roles.filter((_, i) => i !== index));

  const updateRole = (index: number, field: keyof UserRole, value: string | null) => {
    const newRoles = [...roles];
    if (field === "role") {
      newRoles[index].role = value as AppRole;
      if (value === "admin" || value === "dean") newRoles[index].program_id = null;
    } else if (field === "program_id") {
      newRoles[index].program_id = value;
    }
    setRoles(newRoles);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;
      if (roles.length > 0) {
        const uniqueRoles = roles.reduce((acc: UserRole[], role) => {
          if (!acc.some(r => r.role === role.role && r.program_id === role.program_id)) acc.push(role);
          return acc;
        }, []);
        const { error: insertError } = await supabase.from("user_roles").insert(
          uniqueRoles.map(role => ({ user_id: userId, role: role.role, program_id: role.program_id }))
        );
        if (insertError) throw insertError;
      }
      toast({ title: t('common.saved'), description: t('roles.saved') });
      onRolesUpdated();
      onOpenChange(false);
    } catch (error) {
      toast({ title: t('common.error'), description: t('roles.saveRoles'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const needsProgram = (role: AppRole) => role === "coordinator" || role === "program_manager";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('roles.title')}: {userName}
          </DialogTitle>
          <DialogDescription>{t('roles.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('roles.noRoles')}</div>
          ) : (
            <div className="space-y-3">
              {roles.map((role, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select value={role.role} onValueChange={(value) => updateRole(index, "role", value)}>
                      <SelectTrigger><SelectValue placeholder={t('roles.selectRole')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('users.admin')}</SelectItem>
                        <SelectItem value="coordinator">{t('users.coordinator')}</SelectItem>
                        <SelectItem value="program_manager">{t('users.programManager')}</SelectItem>
                        <SelectItem value="dean">{t('users.dean')}</SelectItem>
                        <SelectItem value="faculty">{t('roles.faculty')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {needsProgram(role.role) ? (
                      <Select value={role.program_id || ""} onValueChange={(value) => updateRole(index, "program_id", value || null)}>
                        <SelectTrigger><SelectValue placeholder={t('users.selectProgram')} /></SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center text-sm text-muted-foreground">
                        {role.role === "admin" ? t('roles.allPrograms') : t('roles.viewAll')}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRole(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={addRole} className="w-full">
            <Plus className="h-4 w-4 ml-2" />
            {t('roles.addNew')}
          </Button>
        </div>
        {roles.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">{t('roles.summary')}</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((role, index) => {
                const programName = role.program_id ? programs.find(p => p.id === role.program_id)?.name : null;
                const roleLabels: Record<AppRole, string> = {
                  admin: t('users.admin'), coordinator: t('users.coordinator'),
                  program_manager: t('users.programManager'), dean: t('users.dean'), faculty: t('roles.faculty'),
                };
                return (
                  <Badge key={index} variant={role.role === "admin" ? "destructive" : "default"}>
                    {roleLabels[role.role]}{programName && ` - ${programName}`}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('recommendations.saving') : t('roles.saveRoles')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
