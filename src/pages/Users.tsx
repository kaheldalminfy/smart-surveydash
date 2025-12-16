import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCog, Mail } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  program_id: string | null;
  programs?: {
    name: string;
  };
  user_roles: Array<{
    role: string;
    program_id: string | null;
  }>;
}

export default function Users() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminRole();
    loadPrograms();
    loadUsers();
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

  const loadPrograms = async () => {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error loading programs:", error);
      return;
    }

    setPrograms(data || []);
  };

  const loadUsers = async () => {
    setLoading(true);
    
    // Load profiles with programs
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        *,
        programs(name)
      `)
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error loading users:", profilesError);
      toast({
        title: "خطأ",
        description: "فشل تحميل المستخدمين",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Load all user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role, program_id");

    if (rolesError) {
      console.error("Error loading roles:", rolesError);
    }

    // Merge profiles with their roles
    const usersWithRoles = profilesData?.map(profile => ({
      ...profile,
      user_roles: rolesData?.filter(role => role.user_id === profile.id) || []
    })) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string, programId: string | null) => {
    try {
      // Delete existing roles for this user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("Error deleting roles:", deleteError);
        toast({
          title: "خطأ",
          description: "فشل حذف الأدوار السابقة",
          variant: "destructive",
        });
        return;
      }

      // Insert new role
      const { error: insertError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        program_id: programId,
      });

      if (insertError) {
        console.error("Error inserting role:", insertError);
        toast({
          title: "خطأ",
          description: "فشل تحديث الدور",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث دور المستخدم بنجاح",
      });

      loadUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      admin: { label: "مدير النظام", variant: "destructive" },
      coordinator: { label: "منسق البرنامج", variant: "default" },
      program_manager: { label: "مدير البرنامج", variant: "secondary" },
      dean: { label: "العميد", variant: "secondary" },
      user: { label: "مستخدم", variant: "secondary" },
    };

    const roleInfo = roleMap[role] || { label: role, variant: "secondary" };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <DashboardButton />
            <div>
              <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
              <p className="text-muted-foreground mt-1">إدارة المستخدمين والصلاحيات</p>
            </div>
          </div>
        </div>

        {/* Roles Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive">مدير النظام</Badge>
              </div>
              <p className="text-sm text-muted-foreground">صلاحيات كاملة على كل شيء في النظام</p>
            </CardContent>
          </Card>
          
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">منسق البرنامج</Badge>
              </div>
              <p className="text-sm text-muted-foreground">إنشاء استبيانات + إدارة كاملة لبرنامجه</p>
            </CardContent>
          </Card>
          
          <Card className="border-secondary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">مدير البرنامج</Badge>
              </div>
              <p className="text-sm text-muted-foreground">الاطلاع على النتائج فقط لبرنامجه</p>
            </CardContent>
          </Card>
          
          <Card className="border-secondary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">العميد</Badge>
              </div>
              <p className="text-sm text-muted-foreground">الاطلاع على نتائج جميع البرامج</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              قائمة المستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>البرنامج</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>تغيير الدور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const currentRole = user.user_roles?.[0]?.role || "user";
                  const currentProgramId = user.user_roles?.[0]?.program_id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "غير محدد"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>{user.programs?.name || "لا يوجد"}</TableCell>
                      <TableCell>{getRoleBadge(currentRole)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          <Select
                            value={currentRole}
                            onValueChange={(newRole) => updateUserRole(user.id, newRole, currentProgramId)}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">مدير النظام</SelectItem>
                              <SelectItem value="coordinator">منسق البرنامج</SelectItem>
                              <SelectItem value="program_manager">مدير البرنامج</SelectItem>
                              <SelectItem value="dean">العميد</SelectItem>
                            </SelectContent>
                          </Select>
                          {(currentRole === "coordinator" || currentRole === "program_manager") && (
                            <Select
                              value={currentProgramId || "no-program"}
                              onValueChange={(programId) => updateUserRole(user.id, currentRole, programId === "no-program" ? null : programId)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="اختر البرنامج" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-program">اختر البرنامج</SelectItem>
                                {programs.map((program) => (
                                  <SelectItem key={program.id} value={program.id}>
                                    {program.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
