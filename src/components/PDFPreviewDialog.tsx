import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  onDownload: () => void;
  title?: string;
  isGenerating?: boolean;
}

export const PDFPreviewDialog = ({
  open,
  onOpenChange,
  pdfBlob,
  onDownload,
  title = "معاينة التقرير",
  isGenerating = false
}: PDFPreviewDialogProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [pdfBlob]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              معاينة ملف PDF قبل التحميل
            </DialogDescription>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[60px] text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/20">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium">جاري إنشاء التقرير...</p>
                <p className="text-sm text-muted-foreground">يرجى الانتظار</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <ScrollArea className="h-full">
              <div 
                className="flex justify-center p-4"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full border rounded-lg shadow-lg bg-white"
                  style={{ 
                    height: `${Math.max(800, 800 * (zoom / 100))}px`,
                    minWidth: '600px',
                    maxWidth: '900px'
                  }}
                  title="PDF Preview"
                />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">لا يوجد ملف للمعاينة</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-2" />
            إغلاق
          </Button>
          <Button onClick={onDownload} disabled={!pdfBlob || isGenerating}>
            <Download className="h-4 w-4 ml-2" />
            تحميل PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
