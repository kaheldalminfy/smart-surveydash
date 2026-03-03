import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, QrCode, Mail, Copy, Download, Share2, Calendar, Users, BarChart3, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useLanguage } from "@/contexts/LanguageContext";

interface SurveyDistributionProps {
  survey: { id: string; title: string; description: string; status: string; start_date?: string; end_date?: string; response_count?: number; };
}

const SurveyDistribution = ({ survey }: SurveyDistributionProps) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [surveyUrl, setSurveyUrl] = useState<string>("");
  const [emailTemplate, setEmailTemplate] = useState({
    subject: language === 'ar' ? `دعوة للمشاركة في استبيان: ${survey.title}` : `Invitation to participate in survey: ${survey.title}`,
    body: language === 'ar' 
      ? `السلام عليكم ورحمة الله وبركاته،\n\nنتشرف بدعوتكم للمشاركة في استبيان "${survey.title}".\n\n${survey.description}\n\nللمشاركة في الاستبيان، يرجى الضغط على الرابط التالي:\n{SURVEY_URL}\n\nشكراً لتعاونكم معنا.\n\nمع أطيب التحيات،\nفريق كلية العلوم الإنسانية والاجتماعية`
      : `Hello,\n\nWe invite you to participate in the survey "${survey.title}".\n\n${survey.description}\n\nTo participate, please click the following link:\n{SURVEY_URL}\n\nThank you for your cooperation.\n\nBest regards,\nCollege of Humanities and Social Sciences`
  });

  useEffect(() => { generateSurveyUrl(); }, [survey.id]);

  const generateSurveyUrl = async () => {
    const url = `${window.location.origin}/take/${survey.id}`;
    setSurveyUrl(url);
    try {
      const qrDataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
      setQrCodeUrl(qrDataUrl);
    } catch (error) { console.error('Error generating QR code:', error); }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t('common.copied'), description: language === 'ar' ? `تم نسخ ${label} إلى الحافظة` : `${label} copied to clipboard` });
    } catch (error) {
      toast({ title: t('common.error'), description: language === 'ar' ? "فشل في نسخ النص" : "Failed to copy text", variant: "destructive" });
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) { const link = document.createElement('a'); link.download = `qr-code-${survey.title}.png`; link.href = qrCodeUrl; link.click(); }
  };

  const openEmailClient = () => {
    const emailBody = emailTemplate.body.replace('{SURVEY_URL}', surveyUrl);
    window.open(`mailto:?subject=${encodeURIComponent(emailTemplate.subject)}&body=${encodeURIComponent(emailBody)}`);
  };

  const shareViaWhatsApp = () => {
    const message = `${language === 'ar' ? 'دعوة للمشاركة في استبيان:' : 'Survey invitation:'} ${survey.title}\n\n${surveyUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
      draft: { label: t('surveys.draft'), variant: "secondary" },
      active: { label: t('surveys.active'), variant: "default" },
      closed: { label: t('surveys.closed'), variant: "destructive" },
      archived: { label: language === 'ar' ? "مؤرشف" : "Archived", variant: "outline" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
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
                <p className="font-medium">{t('distribution.surveyPeriod')}</p>
                <p className="text-muted-foreground">
                  {survey.start_date ? new Date(survey.start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : t('distribution.notSpecified')} - 
                  {survey.end_date ? new Date(survey.end_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : t('distribution.notSpecified')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">{t('distribution.responseCount')}</p>
                <p className="text-muted-foreground">{survey.response_count || 0} {language === 'ar' ? 'استجابة' : 'responses'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">{t('distribution.completionRate')}</p>
                <p className="text-muted-foreground">85%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="link" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="link">{t('distribution.directLink')}</TabsTrigger>
          <TabsTrigger value="qr">{t('distribution.qrCode')}</TabsTrigger>
          <TabsTrigger value="email">{t('distribution.email')}</TabsTrigger>
          <TabsTrigger value="social">{t('distribution.social')}</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Link className="h-5 w-5" />{t('distribution.directLinkTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={surveyUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={() => copyToClipboard(surveyUrl, language === 'ar' ? "الرابط" : "Link")}><Copy className="h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => window.open(surveyUrl, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">{language === 'ar' ? "كيفية استخدام الرابط:" : "How to use the link:"}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• {language === 'ar' ? "انسخ الرابط وشاركه مع المشاركين" : "Copy the link and share with participants"}</li>
                  <li>• {language === 'ar' ? "يمكن إرساله عبر البريد الإلكتروني أو الرسائل النصية" : "Can be sent via email or text messages"}</li>
                  <li>• {language === 'ar' ? "الرابط صالح طوال فترة الاستبيان" : "Link is valid throughout the survey period"}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />{t('distribution.qrTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {qrCodeUrl && <div className="p-4 bg-white rounded-lg border"><img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" /></div>}
                <div className="flex gap-2">
                  <Button onClick={downloadQRCode} variant="outline"><Download className="h-4 w-4 ml-2" />{language === 'ar' ? "تحميل رمز QR" : "Download QR"}</Button>
                  <Button onClick={() => copyToClipboard(surveyUrl, language === 'ar' ? "الرابط" : "Link")} variant="outline"><Copy className="h-4 w-4 ml-2" />{t('qr.copyLink')}</Button>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">{language === 'ar' ? "استخدامات رمز QR:" : "QR Code uses:"}</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• {language === 'ar' ? "طباعة الرمز على المواد التعليمية" : "Print on educational materials"}</li>
                  <li>• {language === 'ar' ? "عرضه في العروض التقديمية" : "Display in presentations"}</li>
                  <li>• {language === 'ar' ? "إضافته إلى الملصقات والإعلانات" : "Add to posters and announcements"}</li>
                  <li>• {language === 'ar' ? "مشاركته في وسائل التواصل الاجتماعي" : "Share on social media"}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />{t('distribution.emailTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-subject">{language === 'ar' ? "موضوع الرسالة" : "Subject"}</Label>
                <Input id="email-subject" value={emailTemplate.subject} onChange={(e) => setEmailTemplate({...emailTemplate, subject: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="email-body">{language === 'ar' ? "نص الرسالة" : "Body"}</Label>
                <Textarea id="email-body" rows={12} value={emailTemplate.body} onChange={(e) => setEmailTemplate({...emailTemplate, body: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">{language === 'ar' ? `سيتم استبدال {SURVEY_URL} برابط الاستبيان تلقائياً` : `{SURVEY_URL} will be replaced with survey link automatically`}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={openEmailClient}><Mail className="h-4 w-4 ml-2" />{language === 'ar' ? "فتح برنامج البريد" : "Open Email Client"}</Button>
                <Button variant="outline" onClick={() => copyToClipboard(emailTemplate.body.replace('{SURVEY_URL}', surveyUrl), language === 'ar' ? "نص الرسالة" : "email text")}>
                  <Copy className="h-4 w-4 ml-2" />{language === 'ar' ? "نسخ النص" : "Copy Text"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" />{t('distribution.socialTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={shareViaWhatsApp}>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-sm font-bold">W</span></div>
                  <div className="text-center"><p className="font-medium">{language === 'ar' ? "واتساب" : "WhatsApp"}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? "مشاركة عبر واتساب" : "Share via WhatsApp"}</p></div>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${language === 'ar' ? 'دعوة للمشاركة في استبيان:' : 'Survey invitation:'} ${survey.title} ${surveyUrl}`)}`, '_blank')}>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-sm font-bold">T</span></div>
                  <div className="text-center"><p className="font-medium">{language === 'ar' ? "تويتر" : "Twitter"}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? "مشاركة عبر تويتر" : "Share via Twitter"}</p></div>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(surveyUrl)}`, '_blank')}>
                  <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center"><span className="text-white text-sm font-bold">L</span></div>
                  <div className="text-center"><p className="font-medium">{language === 'ar' ? "لينكد إن" : "LinkedIn"}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? "مشاركة عبر لينكد إن" : "Share via LinkedIn"}</p></div>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(surveyUrl)}&text=${encodeURIComponent(`${language === 'ar' ? 'دعوة للمشاركة في استبيان:' : 'Survey invitation:'} ${survey.title}`)}`, '_blank')}>
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center"><span className="text-white text-sm font-bold">T</span></div>
                  <div className="text-center"><p className="font-medium">{language === 'ar' ? "تيليجرام" : "Telegram"}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? "مشاركة عبر تيليجرام" : "Share via Telegram"}</p></div>
                </Button>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">{language === 'ar' ? "نصائح للمشاركة:" : "Sharing Tips:"}</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• {language === 'ar' ? "اختر الوقت المناسب للمشاركة" : "Choose the right time to share"}</li>
                  <li>• {language === 'ar' ? "أضف رسالة شخصية تشرح أهمية الاستبيان" : "Add a personal message explaining survey importance"}</li>
                  <li>• {language === 'ar' ? "استخدم هاشتاجات مناسبة" : "Use relevant hashtags"}</li>
                  <li>• {language === 'ar' ? "تابع التفاعل وأجب على الأسئلة" : "Follow up and answer questions"}</li>
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
