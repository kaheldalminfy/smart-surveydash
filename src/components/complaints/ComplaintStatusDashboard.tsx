import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User } from "lucide-react";
import { Complaint } from "./complaintsHelpers";
import ComplaintCard from "./ComplaintCard";
import { getStatusInfo } from "./ComplaintClickableStats";

interface ComplaintStatusDashboardProps {
  complaintsData: Complaint[];
  status: string;
  canManage: boolean;
  onClose: () => void;
  onView: (complaint: Complaint) => void;
  onStatusChange: (complaintId: string, newStatus: string) => void;
  onDelete: (complaintId: string) => void;
}

const ComplaintStatusDashboard = ({ complaintsData, status, canManage, onClose, onView, onStatusChange, onDelete }: ComplaintStatusDashboardProps) => {
  const filteredByStatus = status === 'all' ? complaintsData : complaintsData.filter(c => c.status === status);
  const statusInfo = getStatusInfo(status);

  const studentComplaints = filteredByStatus.filter(c => c.complainant_type === 'طالب' || c.complainant_type === 'student');
  const facultyComplaints = filteredByStatus.filter(c => c.complainant_type === 'عضو هيئة تدريس' || c.complainant_type === 'faculty');
  const employeeComplaints = filteredByStatus.filter(c => c.complainant_type === 'موظف' || c.complainant_type === 'employee');
  const otherComplaints = filteredByStatus.filter(c => !c.complainant_type || !['طالب', 'student', 'عضو هيئة تدريس', 'faculty', 'موظف', 'employee'].includes(c.complainant_type));

  const renderList = (list: Complaint[], emptyMsg: string) =>
    list.length > 0 ? (
      <div className="grid gap-4">
        {list.map(c => (
          <ComplaintCard key={c.id} complaint={c} canManage={canManage} onView={onView} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))}
      </div>
    ) : (
      <div className="text-center py-8 text-muted-foreground">{emptyMsg}</div>
    );

  return (
    <Card className="mt-4">
      <CardHeader className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-b`}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className={statusInfo.color}>{statusInfo.icon}</div>
            <span>{statusInfo.label}</span>
            <Badge variant="secondary" className="text-lg px-3 py-1">{filteredByStatus.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            إغلاق ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="البحث في الشكاوى..." className="pl-10" />
          </div>
        </div>

        <Tabs defaultValue="all-types" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-muted p-2">
            <TabsTrigger value="all-types" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              الكل
              <Badge variant="secondary">{filteredByStatus.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              🎓 طلاب
              <Badge variant="secondary">{studentComplaints.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="faculty" className="flex items-center gap-2">
              👨‍🏫 أعضاء هيئة التدريس
              <Badge variant="secondary">{facultyComplaints.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              👔 موظفين
              <Badge variant="secondary">{employeeComplaints.length}</Badge>
            </TabsTrigger>
            {otherComplaints.length > 0 && (
              <TabsTrigger value="other" className="flex items-center gap-2">
                📋 أخرى
                <Badge variant="secondary">{otherComplaints.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all-types" className="space-y-4">
            {renderList(filteredByStatus, "لا توجد شكاوى")}
          </TabsContent>
          <TabsContent value="students" className="space-y-4">
            {renderList(studentComplaints, "لا توجد شكاوى من الطلاب")}
          </TabsContent>
          <TabsContent value="faculty" className="space-y-4">
            {renderList(facultyComplaints, "لا توجد شكاوى من أعضاء هيئة التدريس")}
          </TabsContent>
          <TabsContent value="employees" className="space-y-4">
            {renderList(employeeComplaints, "لا توجد شكاوى من الموظفين")}
          </TabsContent>
          {otherComplaints.length > 0 && (
            <TabsContent value="other" className="space-y-4">
              <div className="grid gap-4">
                {otherComplaints.map(c => (
                  <ComplaintCard key={c.id} complaint={c} canManage={canManage} onView={onView} onStatusChange={onStatusChange} onDelete={onDelete} />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ComplaintStatusDashboard;
