import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string;
  surveyTitle: string;
  surveyLink: string;
}

const QRCodeDialog = ({ open, onOpenChange, qrCode, surveyTitle, surveyLink }: QRCodeDialogProps) => {
  const { toast } = useToast();

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `qr-code-${surveyTitle}.png`;
    link.href = qrCode;
    link.click();
    
    toast({
      title: "تم التنزيل",
      description: "تم تنزيل رمز الاستجابة السريع بنجاح",
    });
  };

  const shareLink = () => {
    navigator.clipboard.writeText(surveyLink);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رابط الاستبيان",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>رمز الاستجابة السريع</DialogTitle>
          <DialogDescription>
            يمكن مسح هذا الرمز للوصول المباشر إلى الاستبيان
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
            <img 
              src={qrCode} 
              alt={`QR Code for ${surveyTitle}`}
              className="w-64 h-64"
            />
          </div>
          
          <div className="text-center">
            <p className="font-semibold text-lg mb-2">{surveyTitle}</p>
            <p className="text-sm text-muted-foreground break-all">{surveyLink}</p>
          </div>
          
          <div className="flex gap-2 w-full">
            <Button 
              onClick={downloadQRCode}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 ml-2" />
              تنزيل الرمز
            </Button>
            <Button 
              onClick={shareLink}
              className="flex-1"
              variant="outline"
            >
              <Share2 className="h-4 w-4 ml-2" />
              نسخ الرابط
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDialog;
