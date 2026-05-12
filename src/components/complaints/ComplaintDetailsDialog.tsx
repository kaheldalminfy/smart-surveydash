import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageSquare, Trash2, Printer } from "lucide-react";
import { Complaint, getStatusOptions, getCategoryLabel } from "./complaintsHelpers";
import { useStatusBadge } from "./ComplaintCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComplaintDetailsDialogProps {
  complaint: Complaint | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (complaint: Complaint) => void;
  onDelete: (complaintId: string) => void;
  onStatusChange: (complaintId: string, newStatus: string) => void;
}

const ComplaintDetailsDialog = ({ complaint, canManage, onClose, onEdit, onDelete, onStatusChange }: ComplaintDetailsDialogProps) => {
  const { t, language } = useLanguage();
  const statusBadge = useStatusBadge();
  const statusOptions = getStatusOptions(t);
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';

  if (!complaint) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    const esc = (s: string | null | undefined) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const statusLabel = esc(t(`complaintsUI.status.${complaint.status}`));
    const printContent = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>${t('complaintsUI.detailsTitle')} - ${complaint.subject}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 40px; direction: ${dir}; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .header p { color: #666; }
          .section { margin-bottom: 25px; }
          .section-title { font-weight: bold; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .info-item { margin-bottom: 10px; }
          .info-label { font-weight: bold; color: #555; }
          .info-value { margin-top: 4px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
          .status-pending { background: #e3f2fd; color: #1565c0; }
          .status-in_progress { background: #fff3e0; color: #e65100; }
          .status-resolved { background: #e8f5e9; color: #2e7d32; }
          .description-box { background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
          .resolution-box { background: #e8f5e9; border: 1px solid #a5d6a7; padding: 15px; border-radius: 8px; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t('complaintsUI.detailsTitle')}</h1>
          <p>${complaint.id.substring(0, 8).toUpperCase()}</p>
        </div>
        <div class="section">
          <div class="info-grid">
            <div class="info-item"><div class="info-label">${t('complaintsUI.titleLabel')}:</div><div class="info-value">${complaint.subject}</div></div>
            <div class="info-item"><div class="info-label">${t('complaintsUI.statusLabel')}</div><div class="info-value"><span class="status-badge status-${complaint.status}">${statusLabel}</span></div></div>
            <div class="info-item"><div class="info-label">${t('complaintsUI.category')}:</div><div class="info-value">${getCategoryLabel(complaint.type, t)}</div></div>
            <div class="info-item"><div class="info-label">${t('complaintsUI.programLabel')}</div><div class="info-value">${complaint.programs?.name || t('complaintsUI.notSpecified')}</div></div>
            <div class="info-item"><div class="info-label">${t('complaintsUI.complainantLabel')}</div><div class="info-value">${complaint.student_name || t('complaintsUI.notSpecified')}</div></div>
            <div class="info-item"><div class="info-label">${t('complaintsUI.email')}</div><div class="info-value">${complaint.student_email || t('complaintsUI.notSpecified')}</div></div>
            <div class="info-item"><div class="info-label">${t('complaintsUI.submittedAt')}</div><div class="info-value">${new Date(complaint.created_at).toLocaleString(locale)}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">${t('complaintsUI.descLabel')}</div>
          <div class="description-box">${complaint.description}</div>
        </div>
        ${complaint.resolution_notes ? `<div class="section"><div class="section-title">${t('complaintsUI.resolutionNotes')}</div><div class="resolution-box">${complaint.resolution_notes}</div></div>` : ''}
        <div class="footer"><p>${new Date().toLocaleString(locale)}</p></div>
      </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  return (
    <Dialog open={!!complaint} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('complaintsUI.detailsTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            {statusBadge(complaint.status)}
            <Badge variant="outline">{getCategoryLabel(complaint.type, t)}</Badge>
            {complaint.complainant_type && (
              <Badge variant="secondary">{complaint.complainant_type}</Badge>
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">{complaint.subject}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{complaint.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">{t('complaintsUI.complainantLabel')}</span><p>{complaint.student_name || t('complaintsUI.notSpecified')}</p></div>
            <div><span className="font-medium">{t('complaintsUI.email')}</span><p>{complaint.student_email || t('complaintsUI.notSpecified')}</p></div>
            <div><span className="font-medium">{t('complaintsUI.programLabel')}</span><p>{complaint.programs?.name || t('complaintsUI.notSpecified')}</p></div>
            <div>
              <span className="font-medium">{t('complaintsUI.submittedAt')}</span>
              <p className="font-mono text-sm">
                {new Date(complaint.created_at).toLocaleDateString(locale)} - {new Date(complaint.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>

          {complaint.resolution_notes && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">{t('complaintsUI.resolutionNotes')}</h4>
              <p className="text-green-800 whitespace-pre-wrap">{complaint.resolution_notes}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 ml-2" />
              {t('complaintsUI.print')}
            </Button>
            
            {canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4 ml-2" />
                    {t('complaintsUI.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('complaintsUI.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('complaintsUI.deleteConfirmDesc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('complaintsUI.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { onDelete(complaint.id); onClose(); }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('complaintsUI.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Button variant="outline" onClick={onClose}>{t('complaintsUI.close')}</Button>
            {canManage && (
              <>
                <Button variant="outline" onClick={() => onEdit(complaint)}>{t('complaintsUI.edit')}</Button>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{t('complaintsUI.statusLabel')}</Label>
                  <select
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    value={complaint.status}
                    onChange={(e) => { onStatusChange(complaint.id, e.target.value); onClose(); }}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplaintDetailsDialog;
