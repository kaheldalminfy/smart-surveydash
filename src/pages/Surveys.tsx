import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, BarChart3, Link2, QrCode, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCodeDialog from "@/components/QRCodeDialog";

const Surveys = () => {
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQRCode, setSelectedQRCode] = useState<{
    qrCode: string;
    title: string;
    link: string;
  } | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("surveys")
      .select(`
        *,
        programs(name),
        responses(count)
      `)
      .order("created_at", { ascending: false });

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
    const surveyLink = `${window.location.origin}/take/${survey.id}`;
    
    // If QR code doesn't exist, generate it
    let qrCodeData = survey.qr_code;
    
    if (!qrCodeData) {
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
          
        toast({
          title: "تم إنشاء الرمز",
          description: "تم إنشاء رمز الاستجابة السريع بنجاح",
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast({
          title: "خطأ",
          description: "فشل في إنشاء رمز الاستجابة السريع",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSelectedQRCode({
      qrCode: qrCodeData,
      title: survey.title,
      link: surveyLink
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">إدارة الاستبيانات</h1>
              <p className="text-sm text-muted-foreground">عرض وإدارة جميع الاستبيانات</p>
            </div>
            <Link to="/surveys/new">
              <Button variant="hero" size="lg">
                <Plus className="h-5 w-5 ml-2" />
                استبيان جديد
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
    </div>
  );
};

export default Surveys;
