import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Calendar, Building2, Eye, Trash2, Clock, MessageSquare, CheckCircle } from "lucide-react";
import { Complaint, getStatusOptions, getCategoryLabel } from "./complaintsHelpers";
import { useLanguage } from "@/contexts/LanguageContext";

export const useStatusBadge = () => {
  const { t } = useLanguage();
  return (status: string) => {
    const statusConfig: Record<string, { icon: any; className: string; key: string }> = {
      pending: { icon: Clock, className: "bg-blue-100 text-blue-800 border-blue-200", key: 'complaintsUI.status.pending' },
      in_progress: { icon: MessageSquare, className: "bg-orange-100 text-orange-800 border-orange-200", key: 'complaintsUI.status.in_progress' },
      resolved: { icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200", key: 'complaintsUI.status.resolved' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant="default" className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {t(config.key)}
      </Badge>
    );
  };
};

// Backward-compat for non-hook callers (returns Arabic raw)
export const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: "جديدة", icon: Clock, className: "bg-blue-100 text-blue-800 border-blue-200" },
    in_progress: { label: "قيد الإجراء", icon: MessageSquare, className: "bg-orange-100 text-orange-800 border-orange-200" },
    resolved: { label: "تم الحل", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  } as const;
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge variant="default" className={`flex items-center gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

interface ComplaintCardProps {
  complaint: Complaint;
  canManage: boolean;
  onView: (complaint: Complaint) => void;
  onStatusChange: (complaintId: string, newStatus: string) => void;
  onDelete: (complaintId: string) => void;
}

const ComplaintCard = ({ complaint, canManage, onView, onStatusChange, onDelete }: ComplaintCardProps) => {
  const { t, language } = useLanguage();
  const statusBadge = useStatusBadge();
  const statusOptions = getStatusOptions(t);
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';

  return (
  <Card key={complaint.id} className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold">{complaint.subject}</h3>
            {statusBadge(complaint.status)}
            <Badge variant="outline">{getCategoryLabel(complaint.type, t)}</Badge>
          </div>
          
          <p className="text-muted-foreground mb-3 line-clamp-2">
            {complaint.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{complaint.student_name || complaint.student_email || t('complaintsUI.notSpecified')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(complaint.created_at).toLocaleDateString(locale)} - {new Date(complaint.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {complaint.programs && (
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{complaint.programs.name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(complaint)}>
            <Eye className="h-4 w-4" />
          </Button>
          
          {canManage && (
            <>
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={complaint.status}
                onChange={(e) => onStatusChange(complaint.id, e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('complaintsUI.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('complaintsUI.deleteConfirmDesc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('complaintsUI.cancel')}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(complaint.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('complaintsUI.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
  );
};

export default ComplaintCard;
