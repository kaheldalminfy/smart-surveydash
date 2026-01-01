import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Trash2, Plus } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Program {
  id: string;
  name: string;
}

interface UserRole {
  id?: string;
  role: AppRole;
  program_id: string | null;
}

interface UserRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRoles: UserRole[];
  programs: Program[];
  onRolesUpdated: () => void;
}

export default function UserRolesDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRoles,
  programs,
  onRolesUpdated,
}: UserRolesDialogProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Initialize with current roles or empty array
      setRoles(currentRoles.length > 0 ? [...currentRoles] : []);
    }
  }, [open, currentRoles]);

  const roleLabels: Record<AppRole, string> = {
    admin: "مدير النظام",
    coordinator: "منسق البرنامج",
    program_manager: "مدير البرنامج",
    dean: "العميد",
    faculty: "عضو هيئة تدريس",
  };

  const addRole = () => {
    setRoles([...roles, { role: "coordinator", program_id: null }]);
  };

  const removeRole = (index: number) => {
    const newRoles = roles.filter((_, i) => i !== index);
    setRoles(newRoles);
  };

  const updateRole = (index: number, field: keyof UserRole, value: string | null) => {
    const newRoles = [...roles];
    if (field === "role") {
      newRoles[index].role = value as AppRole;
      // Clear program_id for admin and dean roles
      if (value === "admin" || value === "dean") {
        newRoles[index].program_id = null;
      }
    } else if (field === "program_id") {
      newRoles[index].program_id = value;
    }
    setRoles(newRoles);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        throw deleteError;
      }

      // Insert new roles if any
      if (roles.length > 0) {
        // Filter out duplicate roles
        const uniqueRoles = roles.reduce((acc: UserRole[], role) => {
          const exists = acc.some(
            (r) => r.role === role.role && r.program_id === role.program_id
          );
          if (!exists) {
            acc.push(role);
          }
          return acc;
        }, []);

        const rolesToInsert = uniqueRoles.map((role) => ({
          user_id: userId,
          role: role.role,
          program_id: role.program_id,
        }));

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);

        if (insertError) {
          throw insertError;
        }
      }

      toast({
        title: "تم الحفظ",
        description: "تم تحديث صلاحيات المستخدم بنجاح",
      });

      onRolesUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving roles:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ الصلاحيات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const needsProgram = (role: AppRole) => {
    return role === "coordinator" || role === "program_manager";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إدارة صلاحيات: {userName}
          </DialogTitle>
          <DialogDescription>
            يمكنك إضافة صلاحيات متعددة للمستخدم على برامج مختلفة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد صلاحيات محددة لهذا المستخدم
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={role.role}
                      onValueChange={(value) => updateRole(index, "role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">مدير النظام</SelectItem>
                        <SelectItem value="coordinator">منسق البرنامج</SelectItem>
                        <SelectItem value="program_manager">مدير البرنامج</SelectItem>
                        <SelectItem value="dean">العميد</SelectItem>
                        <SelectItem value="faculty">عضو هيئة تدريس</SelectItem>
                      </SelectContent>
                    </Select>

                    {needsProgram(role.role) && (
                      <Select
                        value={role.program_id || ""}
                        onValueChange={(value) =>
                          updateRole(index, "program_id", value || null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر البرنامج" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {!needsProgram(role.role) && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        {role.role === "admin"
                          ? "صلاحية كاملة على جميع البرامج"
                          : "الاطلاع على جميع البرامج"}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRole(index)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={addRole}
            className="w-full"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة صلاحية جديدة
          </Button>
        </div>

        {/* Summary */}
        {roles.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">ملخص الصلاحيات:</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((role, index) => {
                const programName = role.program_id
                  ? programs.find((p) => p.id === role.program_id)?.name
                  : null;
                return (
                  <Badge key={index} variant={role.role === "admin" ? "destructive" : "default"}>
                    {roleLabels[role.role]}
                    {programName && ` - ${programName}`}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
