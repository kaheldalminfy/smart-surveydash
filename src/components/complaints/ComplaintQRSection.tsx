import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Copy } from "lucide-react";

interface ComplaintQRSectionProps {
  qrCodeData: string;
  onCopyLink: () => void;
}

const ComplaintQRSection = ({ qrCodeData, onCopyLink }: ComplaintQRSectionProps) => (
  <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <QrCode className="h-6 w-6 text-primary" />
        رمز QR لتقديم الشكاوى
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          {qrCodeData && (
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.download = 'complaint-qr-code.png';
              link.href = qrCodeData;
              link.click();
            }}
            className="w-full"
          >
            تحميل رمز QR
          </Button>
        </div>
        <div className="flex flex-col justify-center space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">رابط تقديم الشكوى</h3>
            <p className="text-muted-foreground text-sm mb-4">
              يمكن للطلاب وأعضاء هيئة التدريس تقديم شكاواهم مباشرة عبر مسح رمز QR أو استخدام الرابط أدناه
            </p>
          </div>
          <div className="bg-background p-4 rounded-lg border">
            <p className="text-sm break-all">{`${window.location.origin}/submit-complaint`}</p>
          </div>
          <Button variant="outline" onClick={onCopyLink} className="w-full">
            <Copy className="h-4 w-4 ml-2" />
            نسخ الرابط
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ComplaintQRSection;
