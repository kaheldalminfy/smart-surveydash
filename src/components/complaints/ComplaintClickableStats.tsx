import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, MessageSquare, CheckCircle } from "lucide-react";
import { Complaint } from "./complaintsHelpers";

interface StatusInfo {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const getStatusInfo = (status: string): StatusInfo => {
  const statusMap: Record<string, StatusInfo> = {
    all: { label: "إجمالي الشكاوى", icon: <FileText className="h-8 w-8" />, color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100", borderColor: "border-blue-200" },
    pending: { label: "جديدة", icon: <Clock className="h-8 w-8" />, color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100", borderColor: "border-blue-200" },
    in_progress: { label: "قيد الإجراء", icon: <MessageSquare className="h-8 w-8" />, color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100", borderColor: "border-orange-200" },
    resolved: { label: "تم الحل", icon: <CheckCircle className="h-8 w-8" />, color: "text-green-600", bgColor: "bg-green-50 hover:bg-green-100", borderColor: "border-green-200" },
  };
  return statusMap[status] || statusMap.all;
};

export { getStatusInfo };

interface ComplaintClickableStatsProps {
  complaintsData: Complaint[];
  context: { type: 'all' | 'program'; programId?: string };
  activeStatusView: string | null;
  activeStatusContext: { type: 'all' | 'program'; programId?: string } | null;
  onStatClick: (status: string, context: { type: 'all' | 'program'; programId?: string }) => void;
}

const ComplaintClickableStats = ({ complaintsData, context, activeStatusView, activeStatusContext, onStatClick }: ComplaintClickableStatsProps) => {
  const statsData = {
    total: complaintsData.length,
    pending: complaintsData.filter(c => c.status === "pending").length,
    inProgress: complaintsData.filter(c => c.status === "in_progress").length,
    resolved: complaintsData.filter(c => c.status === "resolved").length,
  };

  const isActive = (status: string) =>
    activeStatusView === status && activeStatusContext?.type === context.type && activeStatusContext?.programId === context.programId;

  const renderCard = (status: string, count: number, label: string) => {
    const info = getStatusInfo(status);
    return (
      <Card
        className={`cursor-pointer transition-all ${info.bgColor} ${info.borderColor} border-2 ${isActive(status) ? 'ring-2 ring-primary' : ''}`}
        onClick={() => onStatClick(status, context)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
            <div className={info.color}>{info.icon}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {renderCard('all', statsData.total, "إجمالي الشكاوى")}
      {renderCard('pending', statsData.pending, "جديدة")}
      {renderCard('in_progress', statsData.inProgress, "قيد الإجراء")}
      {renderCard('resolved', statsData.resolved, "تم الحل")}
    </div>
  );
};

export default ComplaintClickableStats;
