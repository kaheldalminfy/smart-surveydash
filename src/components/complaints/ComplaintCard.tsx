import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Calendar, Building2, Eye, Trash2, Clock, MessageSquare, CheckCircle } from "lucide-react";
import { Complaint, statusOptions, getCategoryLabel } from "./complaintsHelpers";

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: "جديدة", variant: "secondary" as const, icon: Clock, className: "bg-blue-100 text-blue-800 border-blue-200" },
    in_progress: { label: "قيد الإجراء", variant: "default" as const, icon: MessageSquare, className: "bg-orange-100 text-orange-800 border-orange-200" },
    resolved: { label: "تم الحل", variant: "default" as const, icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export { getStatusBadge };

interface ComplaintCardProps {
  complaint: Complaint;
  canManage: boolean;
  onView: (complaint: Complaint) => void;
  onStatusChange: (complaintId: string, newStatus: string) => void;
  onDelete: (complaintId: string) => void;
}

const ComplaintCard = ({ complaint, canManage, onView, onStatusChange, onDelete }: ComplaintCardProps) => (
  <Card key={complaint.id} className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold">{complaint.subject}</h3>
            {getStatusBadge(complaint.status)}
            <Badge variant="outline">{getCategoryLabel(complaint.type)}</Badge>
          </div>
          
          <p className="text-muted-foreground mb-3 line-clamp-2">
            {complaint.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{complaint.student_name || complaint.student_email || "غير محدد"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(complaint.created_at).toLocaleDateString('ar-SA')} - {new Date(complaint.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
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
                    <AlertDialogTitle>هل أنت متأكد من حذف هذه الشكوى؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف الشكوى نهائياً ولا يمكن استرجاعها.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(complaint.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      حذف
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

export default ComplaintCard;
