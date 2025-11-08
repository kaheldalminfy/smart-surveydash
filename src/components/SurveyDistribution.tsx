import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link, 
  QrCode, 
  Mail, 
  Copy, 
  Download, 
  Share2, 
  Calendar,
  Users,
  BarChart3,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface SurveyDistributionProps {
  survey: {
    id: string;
    title: string;
    description: string;
    status: string;
    start_date?: string;
    end_date?: string;
    response_count?: number;
  };
}

const SurveyDistribution = ({ survey }: SurveyDistributionProps) => {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [surveyUrl, setSurveyUrl] = useState<string>("");
  const [emailTemplate, setEmailTemplate] = useState({
    subject: `دعوة للمشاركة في استبيان: ${survey.title}`,
    body: `السلام عليكم ورحمة الله وبركاته،

نتشرف بدعوتكم للمشاركة في استبيان "${survey.title}".

${survey.description}

للمشاركة في الاستبيان، يرجى الضغط على الرابط التالي:
{SURVEY_URL}

شكراً لتعاونكم معنا.

مع أطيب التحيات،
فريق كلية العلوم الإنسانية والاجتماعية`
  });

  useEffect(() => {
    generateSurveyUrl();
  }, [survey.id]);

  const generateSurveyUrl = async () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/take/${survey.id}`;
    setSurveyUrl(url);
    
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "تم النسخ",
        description: `تم نسخ ${label} إلى الحافظة`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في نسخ النص",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `qr-code-${survey.title}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const openEmailClient = () => {
    const emailBody = emailTemplate.body.replace('{SURVEY_URL}', surveyUrl);
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailTemplate.subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl);
  };

  const shareViaWhatsApp = () => {
    const message = `دعوة للمشاركة في استبيان: ${survey.title}\n\n${surveyUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "مسودة", variant: "secondary" as const },
      active: { label: "نشط", variant: "default" as const },
      closed: { label: "مغلق", variant: "destructive" as const },
      archived: { label: "مؤرشف", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* معلومات الاستبيان */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{survey.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{survey.description}</p>
            </div>
            {getStatusBadge(survey.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">فترة الاستبيان</p>
                <p className="text-muted-foreground">
                  {survey.start_date ? new Date(survey.start_date).toLocaleDateString('ar-SA') : 'غير محدد'} - 
                  {survey.end_date ? new Date(survey.end_date).toLocaleDateString('ar-SA') : 'غير محدد'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">عدد الاستجابات</p>
                <p className="text-muted-foreground">{survey.response_count || 0} استجابة</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">معدل الإكمال</p>
                <p className="text-muted-foreground">85%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="link" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="link">الرابط المباشر</TabsTrigger>
          <TabsTrigger value="qr">رمز QR</TabsTrigger>
          <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
          <TabsTrigger value="social">وسائل التواصل</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                الرابط المباشر للاستبيان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={surveyUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(surveyUrl, "الرابط")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open(surveyUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">كيفية استخدام الرابط:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• انسخ الرابط وشاركه مع المشاركين</li>
                  <li>• يمكن إرساله عبر البريد الإلكتروني أو الرسائل النصية</li>
                  <li>• الرابط صالح طوال فترة الاستبيان</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                رمز QR للاستبيان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {qrCodeUrl && (
                  <div className="p-4 bg-white rounded-lg border">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code للاستبيان" 
                      className="w-64 h-64"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={downloadQRCode} variant="outline">
                    <Download className="h-4 w-4 ml-2" />
                    تحميل رمز QR
                  </Button>
                  <Button 
                    onClick={() => copyToClipboard(surveyUrl, "رابط الاستبيان")}
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ الرابط
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">استخدامات رمز QR:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• طباعة الرمز على المواد التعليمية</li>
                  <li>• عرضه في العروض التقديمية</li>
                  <li>• إضافته إلى الملصقات والإعلانات</li>
                  <li>• مشاركته في وسائل التواصل الاجتماعي</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                قالب البريد الإلكتروني
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-subject">موضوع الرسالة</Label>
                <Input 
                  id="email-subject"
                  value={emailTemplate.subject}
                  onChange={(e) => setEmailTemplate({
                    ...emailTemplate,
                    subject: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="email-body">نص الرسالة</Label>
                <Textarea 
                  id="email-body"
                  rows={12}
                  value={emailTemplate.body}
                  onChange={(e) => setEmailTemplate({
                    ...emailTemplate,
                    body: e.target.value
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  سيتم استبدال {"{SURVEY_URL}"} برابط الاستبيان تلقائياً
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={openEmailClient}>
                  <Mail className="h-4 w-4 ml-2" />
                  فتح برنامج البريد
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => copyToClipboard(
                    emailTemplate.body.replace('{SURVEY_URL}', surveyUrl),
                    "نص الرسالة"
                  )}
                >
                  <Copy className="h-4 w-4 ml-2" />
                  نسخ النص
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                وسائل التواصل الاجتماعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={shareViaWhatsApp}
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">W</span>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">واتساب</p>
                    <p className="text-xs text-muted-foreground">مشاركة عبر واتساب</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`دعوة للمشاركة في استبيان: ${survey.title} ${surveyUrl}`)}`;
                    window.open(twitterUrl, '_blank');
                  }}
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">تويتر</p>
                    <p className="text-xs text-muted-foreground">مشاركة عبر تويتر</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(surveyUrl)}`;
                    window.open(linkedinUrl, '_blank');
                  }}
                >
                  <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">L</span>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">لينكد إن</p>
                    <p className="text-xs text-muted-foreground">مشاركة عبر لينكد إن</p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(surveyUrl)}&text=${encodeURIComponent(`دعوة للمشاركة في استبيان: ${survey.title}`)}`;
                    window.open(telegramUrl, '_blank');
                  }}
                >
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">تيليجرام</p>
                    <p className="text-xs text-muted-foreground">مشاركة عبر تيليجرام</p>
                  </div>
                </Button>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">نصائح للمشاركة:</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• اختر الوقت المناسب للمشاركة (أوقات الذروة)</li>
                  <li>• أضف رسالة شخصية تشرح أهمية الاستبيان</li>
                  <li>• استخدم هاشتاجات مناسبة لزيادة الوصول</li>
                  <li>• تابع التفاعل وأجب على الأسئلة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurveyDistribution;
