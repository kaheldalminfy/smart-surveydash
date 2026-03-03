import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { useLanguage } from "@/contexts/LanguageContext";

const Recommendations = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    completionRate: 0,
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    program_id: "",
    priority: "medium",
    status: "pending",
    source_type: "survey",
    academic_year: new Date().getFullYear().toString(),
    semester: "",
  });

  useEffect(() => {
    loadRecommendations();
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*");
    if (data) setPrograms(data);
  };

  const loadRecommendations = async () => {
    const { data } = await supabase
      .from("recommendations")
      .select("*, programs(name)")
      .order("created_at", { ascending: false });

    if (data) {
      setRecommendations(data);
      const total = data.length;
      const completed = data.filter((r) => r.status === "completed").length;
      const inProgress = data.filter((r) => r.status === "in_progress").length;
      const pending = data.filter((r) => r.status === "pending").length;
      
      setStats({
        total,
        completed,
        inProgress,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("recommendations")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: t('common.updated') });
      } else {
        const { error } = await supabase.from("recommendations").insert(formData);
        if (error) throw error;
        toast({ title: t('common.saved') });
      }

      setIsDialogOpen(false);
      resetForm();
      loadRecommendations();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? "حدث خطأ أثناء حفظ التوصية" : "Error saving recommendation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rec: any) => {
    setFormData({
      title: rec.title,
      description: rec.description,
      program_id: rec.program_id,
      priority: rec.priority,
      status: rec.status,
      source_type: rec.source_type,
      academic_year: rec.academic_year,
      semester: rec.semester,
    });
    setEditingId(rec.id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      program_id: "",
      priority: "medium",
      status: "pending",
      source_type: "survey",
      academic_year: new Date().getFullYear().toString(),
      semester: "",
    });
    setEditingId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: t('recommendations.pending'), variant: "secondary" as const },
      in_progress: { label: t('recommendations.inProgress'), variant: "default" as const },
      completed: { label: t('recommendations.completed'), variant: "default" as const },
    };
    const s = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: t('recommendations.low'), variant: "outline" as const },
      medium: { label: t('recommendations.medium'), variant: "secondary" as const },
      high: { label: t('recommendations.high'), variant: "destructive" as const },
    };
    const p = priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium;
    return <Badge variant={p.variant}>{p.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DashboardButton />
              <div>
                <h1 className="text-2xl font-bold">{t('recommendations.title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('recommendations.subtitle')}
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  {t('recommendations.add')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? t('recommendations.editTitle') : t('recommendations.addNew')}</DialogTitle>
                  <DialogDescription>
                    {editingId ? t('recommendations.editDescription') : t('recommendations.addDescription')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('recommendations.recommendationTitle')} *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('recommendations.details')} *</Label>
                    <Textarea
                      id="description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="program_id">{t('recommendations.programLabel')} *</Label>
                      <Select
                        value={formData.program_id}
                        onValueChange={(value) => setFormData({ ...formData, program_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('recommendations.selectProgram')} />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">{t('recommendations.priority')} *</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('recommendations.low')}</SelectItem>
                          <SelectItem value="medium">{t('recommendations.medium')}</SelectItem>
                          <SelectItem value="high">{t('recommendations.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">{t('recommendations.status')} *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('recommendations.pending')}</SelectItem>
                          <SelectItem value="in_progress">{t('recommendations.inProgress')}</SelectItem>
                          <SelectItem value="completed">{t('recommendations.completed')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source_type">{t('recommendations.source')} *</Label>
                      <Select
                        value={formData.source_type}
                        onValueChange={(value) => setFormData({ ...formData, source_type: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="survey">{t('recommendations.survey')}</SelectItem>
                          <SelectItem value="complaint">{t('recommendations.complaint')}</SelectItem>
                          <SelectItem value="manual">{t('recommendations.manual')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academic_year">{t('common.academicYear')} *</Label>
                      <Input
                        id="academic_year"
                        required
                        value={formData.academic_year}
                        onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester">{t('common.semester')} *</Label>
                      <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('recommendations.selectSemester')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">{t('recommendations.first')}</SelectItem>
                          <SelectItem value="second">{t('recommendations.second')}</SelectItem>
                          <SelectItem value="summer">{t('recommendations.summerSem')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? t('recommendations.saving') : editingId ? t('recommendations.update') : t('common.add')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('recommendations.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('recommendations.completed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('recommendations.inProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('recommendations.pending')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('recommendations.completionRate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('recommendations.list')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('recommendations.date')}</TableHead>
                  <TableHead>{t('recommendations.titleLabel')}</TableHead>
                  <TableHead>{t('recommendations.programLabel')}</TableHead>
                  <TableHead>{t('recommendations.source')}</TableHead>
                  <TableHead>{t('recommendations.priority')}</TableHead>
                  <TableHead>{t('recommendations.status')}</TableHead>
                  <TableHead>{t('recommendations.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      {new Date(rec.created_at).toLocaleDateString(language === 'ar' ? "ar-SA" : "en-US")}
                    </TableCell>
                    <TableCell className="font-medium">{rec.title}</TableCell>
                    <TableCell>{rec.programs?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rec.source_type === "survey" ? t('recommendations.survey') : rec.source_type === "complaint" ? t('recommendations.complaint') : t('recommendations.manual')}
                      </Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(rec)}>
                        <Edit className="h-4 w-4 ml-2" />
                        {t('recommendations.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Recommendations;
