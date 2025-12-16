import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, BarChart3, Link2, QrCode, Edit, Trash2, FileText } from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCodeDialog from "@/components/QRCodeDialog";

const Surveys = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("surveys");
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, id: string, type: 'survey' | 'template'}>({open: false, id: '', type: 'survey'});
  const [selectedQRCode, setSelectedQRCode] = useState<{
    qrCode: string;
    title: string;
    link: string;
  } | null>(null);

  useEffect(() => {
    loadSurveys();
    loadTemplates();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Check user role
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role, program_id")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    const isDean = userRoles?.some(r => r.role === 'dean');
    const userProgramIds = userRoles?.map(r => r.program_id).filter(Boolean);

    // Build query based on role
    let query = supabase
      .from("surveys")
      .select(`
        *,
        programs(name),
        responses(count)
      `);

    // Filter by program if not admin or dean
    if (!isAdmin && !isDean && userProgramIds && userProgramIds.length > 0) {
      query = query.in("program_id", userProgramIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الاستبيانات",
        variant: "destructive",
      });
    } else if (data) {
      setSurveys(data);
    }
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("survey_templates")
      .select("*")
      .or(`created_by.eq.${user.id},is_public.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading templates:", error);
    } else if (data) {
      setTemplates(data);
    }
  };

  const getSurveyStatus = (survey: any) => {
    if (survey.status === "active") return { label: "نشط", variant: "default" as const };
    if (survey.status === "closed") return { label: "مغلق", variant: "secondary" as const };
    return { label: "مسودة", variant: "outline" as const };
  };

  const copyLink = (surveyId: string) => {
    const link = `${window.location.origin}/take/${surveyId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رابط الاستبيان",
    });
  };

  const showQRCode = async (survey: any) => {
    // تحذير إذا لم يكن الاستبيان نشطاً
    if (survey.status !== "active") {
      toast({
        title: "تحذير",
        description: "هذا الاستبيان غير نشط. يجب تفعيل الاستبيان أولاً حتى يتمكن المستخدمون من الوصول إليه عبر رمز QR",
        variant: "destructive",
      });
      return;
    }

    const surveyLink = `${window.location.origin}/take/${survey.id}`;
    
    // Always regenerate QR code to ensure it uses the current URL
    let qrCodeData = null;
    
    // Always regenerate QR code with current URL
    try {
      const QRCode = (await import('qrcode')).default;
      qrCodeData = await QRCode.toDataURL(surveyLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Save the generated QR code to the database
      await supabase
        .from('surveys')
        .update({ qr_code: qrCodeData, survey_link: surveyLink })
        .eq('id', survey.id);
        
      console.log('QR Code generated for:', surveyLink);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء رمز الاستجابة السريع",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedQRCode({
      qrCode: qrCodeData,
      title: survey.title,
      link: surveyLink
    });
  };

  const toggleSurveyStatus = async (surveyId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "draft" : "active";
    const { error } = await supabase
      .from("surveys")
      .update({ status: newStatus })
      .eq("id", surveyId);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في تغيير حالة الاستبيان",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم التحديث",
        description: `تم ${newStatus === "active" ? "تفعيل" : "إيقاف"} الاستبيان بنجاح`,
      });
      loadSurveys();
    }
  };

  const regenerateAllQRCodes = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      const updatedSurveys = [];

      for (const survey of surveys) {
        const surveyLink = `${window.location.origin}/take/${survey.id}`;
        const qrCodeData = await QRCode.toDataURL(surveyLink, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        updatedSurveys.push({
          id: survey.id,
          qr_code: qrCodeData,
          survey_link: surveyLink
        });
      }

      // Update all surveys at once
      for (const survey of updatedSurveys) {
        await supabase
          .from('surveys')
          .update({ qr_code: survey.qr_code, survey_link: survey.survey_link })
          .eq('id', survey.id);
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث جميع رموز QR بنجاح",
      });
      loadSurveys();
    } catch (error) {
      console.error('Error regenerating QR codes:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث رموز QR",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSurvey = async () => {
    const { error } = await supabase
      .from("surveys")
      .delete()
      .eq("id", deleteDialog.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الاستبيان",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم الحذف",
        description: "تم حذف الاستبيان بنجاح",
      });
      loadSurveys();
    }
    setDeleteDialog({open: false, id: '', type: 'survey'});
  };

  const handleDeleteTemplate = async () => {
    const { error } = await supabase
      .from("survey_templates")
      .delete()
      .eq("id", deleteDialog.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف النموذج",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم الحذف",
        description: "تم حذف النموذج بنجاح",
      });
      loadTemplates();
    }
    setDeleteDialog({open: false, id: '', type: 'template'});
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DashboardButton />
              <div>
                <h1 className="text-2xl font-bold">إدارة الاستبيانات</h1>
                <p className="text-sm text-muted-foreground">عرض وإدارة الاستبيانات والنماذج</p>
              </div>
            </div>
            <div className="flex gap-3">
              {currentTab === "surveys" && (
                <>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={regenerateAllQRCodes}
                  >
                    <QrCode className="h-5 w-5 ml-2" />
                    تحديث رموز QR
                  </Button>
                  <Link to="/surveys/new">
                    <Button variant="hero" size="lg">
                      <Plus className="h-5 w-5 ml-2" />
                      استبيان جديد
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="surveys">الاستبيانات</TabsTrigger>
            <TabsTrigger value="templates">النماذج</TabsTrigger>
          </TabsList>

          <TabsContent value="surveys" className="space-y-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="البحث في الاستبيانات..."
                  className="pr-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : surveys.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-4">لا توجد استبيانات حالياً</p>
                  <Link to="/surveys/new">
                    <Button variant="hero">
                      <Plus className="h-4 w-4 ml-2" />
                      إنشاء أول استبيان
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {surveys.map((survey) => {
                  const status = getSurveyStatus(survey);
                  const responsesCount = survey.responses?.[0]?.count || 0;
                  
                  return (
                    <Card key={survey.id} className="hover-scale">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-xl">{survey.title}</CardTitle>
                              <Badge variant={status.variant}>
                                {status.label}
                              </Badge>
                            </div>
                            <CardDescription>
                              برنامج {survey.programs?.name} • 
                              {survey.start_date && ` ${new Date(survey.start_date).toLocaleDateString('ar-SA')}`}
                              {survey.end_date && ` إلى ${new Date(survey.end_date).toLocaleDateString('ar-SA')}`}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6 text-sm">
                            <div>
                              <span className="font-semibold">{responsesCount}</span>
                              <span className="text-muted-foreground"> استجابة</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button 
                              variant={survey.status === "active" ? "destructive" : "default"}
                              size="sm"
                              onClick={() => toggleSurveyStatus(survey.id, survey.status)}
                            >
                              {survey.status === "active" ? "إيقاف" : "تفعيل"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/surveys/edit/${survey.id}`)}
                            >
                              <Edit className="h-4 w-4 ml-2" />
                              تعديل
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => showQRCode(survey)}
                            >
                              <QrCode className="h-4 w-4 ml-2" />
                              QR
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyLink(survey.id)}
                            >
                              <Link2 className="h-4 w-4 ml-2" />
                              رابط
                            </Button>
                            <Link to={`/reports/${survey.id}`}>
                              <Button variant="accent" size="sm">
                                <BarChart3 className="h-4 w-4 ml-2" />
                                التقرير
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDeleteDialog({open: true, id: survey.id, type: 'survey'})}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">لا توجد نماذج محفوظة</p>
                  <Link to="/surveys/new">
                    <Button variant="hero">
                      <Plus className="h-4 w-4 ml-2" />
                      إنشاء استبيان وحفظه كنموذج
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id} className="hover-scale">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.is_public && (
                          <Badge variant="secondary">عام</Badge>
                        )}
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {template.template_data?.questions?.length || 0} سؤال
                        </span>
                        <div className="flex gap-2">
                          <Link to={`/surveys/new?template=${template.id}`}>
                            <Button size="sm" variant="default">
                              استخدام
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setDeleteDialog({open: true, id: template.id, type: 'template'})}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {selectedQRCode && (
        <QRCodeDialog
          open={!!selectedQRCode}
          onOpenChange={(open) => !open && setSelectedQRCode(null)}
          qrCode={selectedQRCode.qrCode}
          surveyTitle={selectedQRCode.title}
          surveyLink={selectedQRCode.link}
        />
      )}

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({open: false, id: '', type: 'survey'})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {deleteDialog.type === 'survey' ? 'هذا الاستبيان' : 'هذا النموذج'}؟ 
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDialog.type === 'survey' ? handleDeleteSurvey : handleDeleteTemplate}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Surveys;
