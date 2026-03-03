import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Clock, MessageSquare, TrendingUp, Building2, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface Complaint {
  id: string; subject: string; description: string; type: string; status: string;
  program_id?: string; programs?: { name: string }; created_at: string; complainant_type?: string;
}

interface Program { id: string; name: string; }

interface ComplaintsDashboardProps {
  complaints: Complaint[]; programs: Program[];
  userRole: 'admin' | 'dean' | 'coordinator' | 'program_manager';
  userProgramIds: string[]; selectedDashboardProgram: string;
  onProgramChange: (programId: string) => void;
}

const ComplaintsDashboard = ({ complaints, programs, userRole, userProgramIds, selectedDashboardProgram, onProgramChange }: ComplaintsDashboardProps) => {
  const { t, language } = useLanguage();
  const isDeanOrAdmin = userRole === 'admin' || userRole === 'dean';
  
  const getFilteredComplaints = () => {
    let filtered = complaints;
    if (!isDeanOrAdmin) filtered = complaints.filter(c => c.program_id && userProgramIds.includes(c.program_id));
    if (isDeanOrAdmin && selectedDashboardProgram !== 'all') filtered = complaints.filter(c => c.program_id === selectedDashboardProgram);
    return filtered;
  };

  const filteredComplaints = getFilteredComplaints();
  const stats = {
    total: filteredComplaints.length,
    pending: filteredComplaints.filter(c => c.status === 'pending').length,
    inProgress: filteredComplaints.filter(c => c.status === 'in_progress').length,
    resolved: filteredComplaints.filter(c => c.status === 'resolved').length,
  };
  const resolutionRate = stats.total > 0 ? ((stats.resolved / stats.total) * 100) : 0;

  const statusData = [
    { name: t('complaintsDash.newComplaints'), value: stats.pending, fill: '#f59e0b' },
    { name: t('complaintsDash.inAction'), value: stats.inProgress, fill: '#3b82f6' },
    { name: t('complaintsDash.resolved'), value: stats.resolved, fill: '#22c55e' },
  ].filter(item => item.value > 0);

  const getComplaintsByProgram = () => {
    const programStats: { name: string; total: number; pending: number; resolved: number; resolutionRate: number }[] = [];
    programs.forEach(program => {
      const pc = complaints.filter(c => c.program_id === program.id);
      if (pc.length > 0) {
        const resolved = pc.filter(c => c.status === 'resolved').length;
        programStats.push({
          name: program.name.length > 20 ? program.name.substring(0, 20) + '...' : program.name,
          total: pc.length, pending: pc.filter(c => c.status === 'pending').length, resolved,
          resolutionRate: Math.round((resolved / pc.length) * 100),
        });
      }
    });
    return programStats.sort((a, b) => b.total - a.total);
  };
  const programStats = getComplaintsByProgram();

  const getComplainantTypeStats = () => {
    const typeLabels: Record<string, string> = language === 'ar' 
      ? { 'طالب': 'طلاب', 'student': 'طلاب', 'عضو هيئة تدريس': 'هيئة تدريس', 'faculty': 'هيئة تدريس', 'موظف': 'موظفين', 'employee': 'موظفين' }
      : { 'طالب': 'Students', 'student': 'Students', 'عضو هيئة تدريس': 'Faculty', 'faculty': 'Faculty', 'موظف': 'Staff', 'employee': 'Staff' };
    const typeCounts: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      const type = c.complainant_type || (language === 'ar' ? 'أخرى' : 'Other');
      const normalizedType = typeLabels[type] || type;
      typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
    });
    const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#6b7280'];
    return Object.entries(typeCounts).map(([name, value], index) => ({ name, value, fill: colors[index % colors.length] }));
  };
  const complainantTypeData = getComplainantTypeStats();

  const tooltipLabels: Record<string, string> = language === 'ar' 
    ? { total: 'إجمالي الشكاوى', pending: 'شكاوى معلقة', resolved: 'شكاوى محلولة' }
    : { total: 'Total Complaints', pending: 'Pending', resolved: 'Resolved' };
  const legendLabels: Record<string, string> = language === 'ar'
    ? { total: 'إجمالي', pending: 'معلقة', resolved: 'محلولة' }
    : { total: 'Total', pending: 'Pending', resolved: 'Resolved' };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />{t('complaintsDash.title')}</CardTitle>
              <CardDescription>{isDeanOrAdmin ? t('complaintsDash.allPrograms') : t('complaintsDash.myProgram')}</CardDescription>
            </div>
            {isDeanOrAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('complaintsDash.filterByProgram')}</span>
                <Select value={selectedDashboardProgram} onValueChange={onProgramChange}>
                  <SelectTrigger className="w-64 bg-background"><SelectValue placeholder={t('complaints.selectProgram')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('complaints.allPrograms')}</SelectItem>
                    {programs.map(program => (<SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('complaintsDash.totalComplaints')}</p><p className="text-3xl font-bold">{stats.total}</p></div><AlertCircle className="h-10 w-10 text-blue-500 opacity-50" /></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('complaintsDash.newComplaints')}</p><p className="text-3xl font-bold">{stats.pending}</p></div><Clock className="h-10 w-10 text-yellow-500 opacity-50" /></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('complaintsDash.inAction')}</p><p className="text-3xl font-bold">{stats.inProgress}</p></div><MessageSquare className="h-10 w-10 text-purple-500 opacity-50" /></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{t('complaintsDash.resolved')}</p><p className="text-3xl font-bold">{stats.resolved}</p></div><CheckCircle className="h-10 w-10 text-green-500 opacity-50" /></div></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><span className="font-medium">{t('complaintsDash.resolutionRate')}</span></div>
          <Badge variant="secondary" className={resolutionRate >= 70 ? 'bg-green-100 text-green-800' : resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{resolutionRate.toFixed(1)}%</Badge>
        </div>
        <Progress value={resolutionRate} className="h-3" />
        <p className="text-sm text-muted-foreground mt-2">{t('complaintsDash.resolvedOf').replace('{0}', String(stats.resolved)).replace('{1}', String(stats.total))}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-lg">{t('complaintsDash.byStatus')}</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={true}>{statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><Tooltip formatter={(value) => [`${value} ${t('complaintsDash.complaint')}`, t('complaintsDash.count')]} /><Legend /></PieChart></ResponsiveContainer>
            ) : (<div className="flex items-center justify-center h-[280px] text-muted-foreground">{t('complaintsDash.noDataToShow')}</div>)}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg">{t('complaintsDash.byComplainant')}</CardTitle></CardHeader>
          <CardContent>
            {complainantTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={complainantTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={true}>{complainantTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><Tooltip formatter={(value) => [`${value} ${t('complaintsDash.complaint')}`, t('complaintsDash.count')]} /><Legend /></PieChart></ResponsiveContainer>
            ) : (<div className="flex items-center justify-center h-[280px] text-muted-foreground">{t('complaintsDash.noDataToShow')}</div>)}
          </CardContent>
        </Card>
      </div>

      {isDeanOrAdmin && programStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{t('complaintsDash.programComparison')}</CardTitle>
            <CardDescription>{t('complaintsDash.programComparisonDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, programStats.length * 50)}>
              <BarChart data={programStats} layout="vertical" margin={{ top: 10, right: 30, left: 150, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" /><YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => [value, tooltipLabels[name as string] || name]} contentStyle={{ direction: language === 'ar' ? 'rtl' : 'ltr' }} />
                <Legend formatter={(value) => legendLabels[value] || value} />
                <Bar dataKey="total" fill="#3b82f6" name="total" /><Bar dataKey="pending" fill="#f59e0b" name="pending" /><Bar dataKey="resolved" fill="#22c55e" name="resolved" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">{t('complaintsDash.perProgram')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programStats.map((program, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1"><p className="text-sm font-medium truncate" title={program.name}>{program.name}</p><Progress value={program.resolutionRate} className="h-2 mt-1" /></div>
                    <Badge variant="secondary" className={program.resolutionRate >= 70 ? 'bg-green-100 text-green-800' : program.resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{program.resolutionRate}%</Badge>
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
