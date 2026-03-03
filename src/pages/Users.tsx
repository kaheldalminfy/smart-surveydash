import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Mail, Settings, Trash2, UserPlus, KeyRound } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import UserRolesDialog from "@/components/UserRolesDialog";
import AddUserDialog from "@/components/AddUserDialog";
import ResetPasswordDialog from "@/components/ResetPasswordDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

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
  programs?: { name: string };
  user_roles: UserRole[];
}

interface Program {
  id: string;
  name: string;
}

export default function Users() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAdminRole();
    loadPrograms();
    loadUsers();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setCurrentUserId(user.id);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roles) {
      toast({ title: t('common.unauthorized'), description: t('common.adminOnly'), variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    setIsAdmin(true);
  };

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("id, name").order("name");
    if (data) setPrograms(data);
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data: profilesData, error: profilesError } = await supabase.from("profiles").select(`*, programs(name)`).order("created_at", { ascending: false });
    if (profilesError) {
      toast({ title: t('common.error'), description: language === 'ar' ? "فشل تحميل المستخدمين" : "Failed to load users", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role, program_id");
    const usersWithRoles = profilesData?.map(profile => ({
      ...profile,
      user_roles: (rolesData?.filter(role => role.user_id === profile.id) || []) as UserRole[]
    })) || [];
    setUsers(usersWithRoles);
    setLoading(false);
  };

  const openRolesDialog = (user: UserProfile) => { setSelectedUser(user); setDialogOpen(true); };

  const getRoleBadge = (role: AppRole) => {
    const roleMap: Record<AppRole, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      admin: { label: t('users.admin'), variant: "destructive" },
      coordinator: { label: t('users.coordinator'), variant: "default" },
      program_manager: { label: t('users.programManager'), variant: "secondary" },
      dean: { label: t('users.dean'), variant: "secondary" },
      faculty: { label: t('roles.faculty'), variant: "secondary" },
    };
    const roleInfo = roleMap[role];
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    return programs.find(p => p.id === programId)?.name;
  };

  const openDeleteDialog = (user: UserProfile) => { setUserToDelete(user); setDeleteDialogOpen(true); };
  const openResetPasswordDialog = (user: UserProfile) => { setUserToResetPassword(user); setResetPasswordDialogOpen(true); };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { userId: userToDelete.id } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: t('common.deleted'), description: language === 'ar' ? "تم حذف المستخدم بنجاح" : "User deleted successfully" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || (language === 'ar' ? "فشل حذف المستخدم" : "Failed to delete user"), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <DashboardButton />
            <div>
              <h1 className="text-3xl font-bold">{t('users.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('users.subtitle')}</p>
            </div>
          </div>
          <Button onClick={() => setAddUserDialogOpen(true)}>
            <UserPlus className="h-4 w-4 ml-2" />
            {t('users.add')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive">{t('users.admin')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('users.adminDesc')}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">{t('users.coordinator')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('users.coordinatorDesc')}</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{t('users.programManager')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('users.programManagerDesc')}</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{t('users.dean')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('users.deanDesc')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {t('users.usersList')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.name')}</TableHead>
                  <TableHead>{t('users.email')}</TableHead>
                  <TableHead>{t('roles.managePermissions')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || t('users.notSet')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.user_roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">{t('roles.noRoles')}</span>
                        ) : (
                          user.user_roles.map((role, index) => {
                            const programName = getProgramName(role.program_id);
                            return (
                              <div key={index} className="flex items-center gap-1">
                                {getRoleBadge(role.role)}
                                {programName && <span className="text-xs text-muted-foreground">({programName})</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openRolesDialog(user)}>
                          <Settings className="h-4 w-4 ml-2" />
                          {t('roles.managePermissions')}
                        </Button>
                        {user.id !== currentUserId && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openResetPasswordDialog(user)} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <UserRolesDialog open={dialogOpen} onOpenChange={setDialogOpen} userId={selectedUser.id} userName={selectedUser.full_name || selectedUser.email} currentRoles={selectedUser.user_roles} programs={programs} onRolesUpdated={loadUsers} />
      )}

      <AddUserDialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen} onUserAdded={loadUsers} />

      {userToResetPassword && (
        <ResetPasswordDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen} userId={userToResetPassword.id} userName={userToResetPassword.full_name || userToResetPassword.email} onPasswordReset={loadUsers} />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUser.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteUser.confirm')} "{userToDelete?.full_name || userToDelete?.email}"?
              <br />
              <span className="text-destructive font-medium">{t('deleteUser.warning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? t('deleteUser.deleting') : t('deleteUser.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
