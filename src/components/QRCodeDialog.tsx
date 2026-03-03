import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string;
  surveyTitle: string;
  surveyLink: string;
}

const QRCodeDialog = ({ open, onOpenChange, qrCode, surveyTitle, surveyLink }: QRCodeDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `qr-code-${surveyTitle}.png`;
    link.href = qrCode;
    link.click();
    toast({ title: t('qr.downloaded'), description: t('qr.downloadSuccess') });
  };

  const shareLink = () => {
    navigator.clipboard.writeText(surveyLink);
    toast({ title: t('common.copied'), description: t('qr.copyLink') });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('qr.title')}</DialogTitle>
          <DialogDescription>{t('qr.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
            <img src={qrCode} alt={`QR Code for ${surveyTitle}`} className="w-64 h-64" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg mb-2">{surveyTitle}</p>
            <p className="text-sm text-muted-foreground break-all">{surveyLink}</p>
          </div>
          <div className="flex gap-2 w-full">
            <Button onClick={downloadQRCode} className="flex-1" variant="outline">
              <Download className="h-4 w-4 ml-2" />
              {t('qr.download')}
            </Button>
            <Button onClick={shareLink} className="flex-1" variant="outline">
              <Share2 className="h-4 w-4 ml-2" />
              {t('qr.copyLink')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDialog;
