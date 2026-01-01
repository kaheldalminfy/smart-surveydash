import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Mail, Settings } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import UserRolesDialog from "@/components/UserRolesDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  id?: string;
  role: AppRole;
  program_id: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  program_id: string | null;
  programs?: {
    name: string;
  };
  user_roles: UserRole[];
}

interface Program {
  id: string;
  name: string;
}

export default function Users() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error loading programs:", error);
      return;
    }

    setPrograms(data || []);
  };

  const loadUsers = async () => {
    setLoading(true);
    
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

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role, program_id");

    if (rolesError) {
      console.error("Error loading roles:", rolesError);
    }

    const usersWithRoles = profilesData?.map(profile => ({
      ...profile,
      user_roles: (rolesData?.filter(role => role.user_id === profile.id) || []) as UserRole[]
    })) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const openRolesDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const getRoleBadge = (role: AppRole) => {
    const roleMap: Record<AppRole, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      admin: { label: "مدير النظام", variant: "destructive" },
      coordinator: { label: "منسق", variant: "default" },
      program_manager: { label: "مدير برنامج", variant: "secondary" },
      dean: { label: "العميد", variant: "secondary" },
      faculty: { label: "عضو هيئة تدريس", variant: "secondary" },
    };

    const roleInfo = roleMap[role];
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    return programs.find(p => p.id === programId)?.name;
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
                  <TableHead>الصلاحيات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "غير محدد"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.user_roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">لا توجد صلاحيات</span>
                        ) : (
                          user.user_roles.map((role, index) => {
                            const programName = getProgramName(role.program_id);
                            return (
                              <div key={index} className="flex items-center gap-1">
                                {getRoleBadge(role.role)}
                                {programName && (
                                  <span className="text-xs text-muted-foreground">
                                    ({programName})
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRolesDialog(user)}
                      >
                        <Settings className="h-4 w-4 ml-2" />
                        إدارة الصلاحيات
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Roles Dialog */}
      {selectedUser && (
        <UserRolesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={selectedUser.id}
          userName={selectedUser.full_name || selectedUser.email}
          currentRoles={selectedUser.user_roles}
          programs={programs}
          onRolesUpdated={loadUsers}
        />
      )}
    </div>
  );
}