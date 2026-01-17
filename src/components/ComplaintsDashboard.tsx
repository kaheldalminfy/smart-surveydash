import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Clock, MessageSquare, TrendingUp, Building2, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface Complaint {
  id: string;
  subject: string;
  description: string;
  type: string;
  status: string;
  program_id?: string;
  programs?: { name: string };
  created_at: string;
  complainant_type?: string;
}

interface Program {
  id: string;
  name: string;
}

interface ComplaintsDashboardProps {
  complaints: Complaint[];
  programs: Program[];
  userRole: 'admin' | 'dean' | 'coordinator' | 'program_manager';
  userProgramIds: string[];
  selectedDashboardProgram: string;
  onProgramChange: (programId: string) => void;
}

const ComplaintsDashboard = ({
  complaints,
  programs,
  userRole,
  userProgramIds,
  selectedDashboardProgram,
  onProgramChange,
}: ComplaintsDashboardProps) => {
  const isDeanOrAdmin = userRole === 'admin' || userRole === 'dean';
  
  // Filter complaints based on role and selected program
  const getFilteredComplaints = () => {
    let filtered = complaints;
    
    // For program manager/coordinator, only show their programs' complaints
    if (!isDeanOrAdmin) {
      filtered = complaints.filter(c => c.program_id && userProgramIds.includes(c.program_id));
    }
    
    // Apply program filter if selected (for dean/admin)
    if (isDeanOrAdmin && selectedDashboardProgram !== 'all') {
      filtered = complaints.filter(c => c.program_id === selectedDashboardProgram);
    }
    
    return filtered;
  };

  const filteredComplaints = getFilteredComplaints();

  // Calculate statistics
  const stats = {
    total: filteredComplaints.length,
    pending: filteredComplaints.filter(c => c.status === 'pending').length,
    inProgress: filteredComplaints.filter(c => c.status === 'in_progress').length,
    resolved: filteredComplaints.filter(c => c.status === 'resolved').length,
  };

  const resolutionRate = stats.total > 0 ? ((stats.resolved / stats.total) * 100) : 0;

  // Status distribution for pie chart
  const statusData = [
    { name: 'جديدة', value: stats.pending, fill: '#f59e0b' },
    { name: 'قيد الإجراء', value: stats.inProgress, fill: '#3b82f6' },
    { name: 'تم الحل', value: stats.resolved, fill: '#22c55e' },
  ].filter(item => item.value > 0);

  // Complaints by program (for dean only)
  const getComplaintsByProgram = () => {
    const programStats: { name: string; total: number; pending: number; resolved: number; resolutionRate: number }[] = [];
    
    programs.forEach(program => {
      const programComplaints = complaints.filter(c => c.program_id === program.id);
      if (programComplaints.length > 0) {
        const resolved = programComplaints.filter(c => c.status === 'resolved').length;
        programStats.push({
          name: program.name.length > 20 ? program.name.substring(0, 20) + '...' : program.name,
          total: programComplaints.length,
          pending: programComplaints.filter(c => c.status === 'pending').length,
          resolved,
          resolutionRate: Math.round((resolved / programComplaints.length) * 100),
        });
      }
    });
    
    return programStats.sort((a, b) => b.total - a.total);
  };

  const programStats = getComplaintsByProgram();

  // Complainant type distribution
  const getComplainantTypeStats = () => {
    const typeLabels: Record<string, string> = {
      'طالب': 'طلاب',
      'student': 'طلاب',
      'عضو هيئة تدريس': 'هيئة تدريس',
      'faculty': 'هيئة تدريس',
      'موظف': 'موظفين',
      'employee': 'موظفين',
    };

    const typeCounts: Record<string, number> = {};
    
    filteredComplaints.forEach(c => {
      const type = c.complainant_type || 'أخرى';
      const normalizedType = typeLabels[type] || type;
      typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
    });

    const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#6b7280'];
    return Object.entries(typeCounts).map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length],
    }));
  };

  const complainantTypeData = getComplainantTypeStats();

  return (
    <div className="space-y-6">
      {/* Header with Program Filter (Dean/Admin only) */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                لوحة تحكم الشكاوى
              </CardTitle>
              <CardDescription>
                {isDeanOrAdmin 
                  ? 'نظرة شاملة على جميع شكاوى الكلية' 
                  : 'شكاوى برنامجك الأكاديمي'}
              </CardDescription>
            </div>
            
            {/* Program Filter - Dean/Admin only */}
            {isDeanOrAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">فلترة حسب البرنامج:</span>
                <Select value={selectedDashboardProgram} onValueChange={onProgramChange}>
                  <SelectTrigger className="w-64 bg-background">
                    <SelectValue placeholder="اختر البرنامج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البرامج</SelectItem>
                    {programs.map(program => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الشكاوى</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">شكاوى جديدة</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد الإجراء</p>
                <p className="text-3xl font-bold">{stats.inProgress}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تم الحل</p>
                <p className="text-3xl font-bold">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Rate Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-medium">نسبة الحل</span>
            </div>
            <Badge 
              variant="secondary" 
              className={resolutionRate >= 70 ? 'bg-green-100 text-green-800' : resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
            >
              {resolutionRate.toFixed(1)}%
            </Badge>
          </div>
          <Progress 
            value={resolutionRate} 
            className="h-3"
          />
          <p className="text-sm text-muted-foreground mt-2">
            تم حل {stats.resolved} من أصل {stats.total} شكوى
          </p>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع الشكاوى حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} شكوى`, 'العدد']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>

        {/* Complainant Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع الشكاوى حسب مقدم الشكوى</CardTitle>
          </CardHeader>
          <CardContent>
            {complainantTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={complainantTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {complainantTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} شكوى`, 'العدد']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Program Comparison Bar Chart - Dean/Admin only */}
      {isDeanOrAdmin && programStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              مقارنة أداء البرامج في معالجة الشكاوى
            </CardTitle>
            <CardDescription>
              عدد الشكاوى ونسبة الحل لكل برنامج أكاديمي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, programStats.length * 50)}>
              <BarChart
                data={programStats}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 150, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={140}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      total: 'إجمالي الشكاوى',
                      pending: 'شكاوى معلقة',
                      resolved: 'شكاوى محلولة',
                    };
                    return [value, labels[name as string] || name];
                  }}
                  contentStyle={{ direction: 'rtl' }}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      total: 'إجمالي',
                      pending: 'معلقة',
                      resolved: 'محلولة',
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar dataKey="total" fill="#3b82f6" name="total" />
                <Bar dataKey="pending" fill="#f59e0b" name="pending" />
                <Bar dataKey="resolved" fill="#22c55e" name="resolved" />
              </BarChart>
            </ResponsiveContainer>

            {/* Resolution Rate per Program */}
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">نسبة الحل لكل برنامج:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programStats.map((program, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate" title={program.name}>{program.name}</p>
                      <Progress 
                        value={program.resolutionRate} 
                        className="h-2 mt-1"
                      />
                    </div>
                    <Badge 
                      variant="secondary"
                      className={program.resolutionRate >= 70 ? 'bg-green-100 text-green-800' : program.resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                    >
                      {program.resolutionRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplaintsDashboard;
