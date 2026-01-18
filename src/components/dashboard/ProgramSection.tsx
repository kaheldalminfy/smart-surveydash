import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface Course {
  id: string;
  name: string;
  averageSatisfaction: number;
}

interface ComplaintStats {
  pending: number;
  inProgress: number;
  resolved: number;
}

interface ProgramStats {
  programId: string;
  programName: string;
  programNameEn?: string;
  colorIndex: number;
  totalResponses: number;
  averageSatisfaction: number;
  totalSurveys: number;
  textCommentsCount: number;
  complaintStats: ComplaintStats;
  courseSatisfaction: Course[];
}

interface ProgramSectionProps {
  stats: ProgramStats;
  isExpanded?: boolean;
}

const PROGRAM_COLORS = [
  'hsl(221, 83%, 53%)',  // Blue
  'hsl(162, 72%, 42%)',  // Teal
  'hsl(28, 90%, 50%)',   // Orange
  'hsl(280, 65%, 55%)',  // Purple
  'hsl(350, 75%, 55%)',  // Red
  'hsl(180, 60%, 45%)',  // Cyan
  'hsl(45, 90%, 50%)',   // Yellow
  'hsl(200, 80%, 50%)',  // Light Blue
];

const ProgramSection = ({ stats, isExpanded = true }: ProgramSectionProps) => {
  const { language } = useLanguage();
  const programColor = PROGRAM_COLORS[stats.colorIndex % PROGRAM_COLORS.length];
  
  const totalComplaints = stats.complaintStats.pending + stats.complaintStats.inProgress + stats.complaintStats.resolved;
  const resolutionRate = totalComplaints > 0 
    ? Math.round((stats.complaintStats.resolved / totalComplaints) * 100) 
    : 0;

  // Sort courses by satisfaction (high to low)
  const sortedCourses = [...stats.courseSatisfaction].sort((a, b) => b.averageSatisfaction - a.averageSatisfaction);

  // Complaint status data for pie chart
  const complaintStatusData = [
    { name: language === 'ar' ? 'جديدة' : 'New', value: stats.complaintStats.pending, fill: '#f59e0b' },
    { name: language === 'ar' ? 'قيد الإجراء' : 'In Progress', value: stats.complaintStats.inProgress, fill: '#3b82f6' },
    { name: language === 'ar' ? 'تم الحل' : 'Resolved', value: stats.complaintStats.resolved, fill: '#22c55e' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-4">
      {/* Program Header */}
      <div 
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{ 
          background: `linear-gradient(135deg, ${programColor}15 0%, ${programColor}05 100%)`,
          borderLeft: `4px solid ${programColor}`
        }}
      >
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: programColor }}
        >
          {stats.programName.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{stats.programName}</h3>
          {stats.programNameEn && (
            <p className="text-sm text-muted-foreground">{stats.programNameEn}</p>
          )}
        </div>
        <Badge 
          variant="secondary"
          className="text-white"
          style={{ backgroundColor: programColor }}
        >
          {stats.totalSurveys} {language === 'ar' ? 'استبيان' : 'Survey'}
        </Badge>
      </div>

      {isExpanded && (
        <>
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4" style={{ borderLeftColor: programColor }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'إجمالي الاستجابات' : 'Total Responses'}
                    </p>
                    <p className="text-xl font-bold">{stats.totalResponses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: programColor }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'المتوسط العام' : 'Avg Satisfaction'}
                    </p>
                    <p className="text-xl font-bold">{stats.averageSatisfaction.toFixed(2)}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: programColor }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'الشكاوى' : 'Complaints'}
                    </p>
                    <p className="text-xl font-bold">{totalComplaints}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4" style={{ borderLeftColor: programColor }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'التعليقات النصية' : 'Text Comments'}
                    </p>
                    <p className="text-xl font-bold">{stats.textCommentsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Course Satisfaction Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {language === 'ar' ? 'رضا الطلبة عن المقررات' : 'Student Satisfaction by Course'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedCourses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(200, sortedCourses.length * 35)}>
                    <BarChart
                      data={sortedCourses}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" domain={[0, 5]} tickCount={6} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value.toFixed(2), language === 'ar' ? 'المتوسط' : 'Average']}
                        contentStyle={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                      />
                      <Bar dataKey="averageSatisfaction" radius={[0, 4, 4, 0]}>
                        {sortedCourses.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={programColor}
                            opacity={0.7 + (0.3 * (sortedCourses.length - index) / sortedCourses.length)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Complaints Status Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {language === 'ar' ? 'حالة الشكاوى' : 'Complaints Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaintStatusData.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={complaintStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {complaintStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, language === 'ar' ? 'شكوى' : 'Complaints']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Resolution Rate */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'نسبة الحل' : 'Resolution Rate'}
                        </span>
                        <Badge 
                          variant="secondary"
                          className={resolutionRate >= 70 ? 'bg-green-100 text-green-800' : resolutionRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                        >
                          {resolutionRate}%
                        </Badge>
                      </div>
                      <Progress value={resolutionRate} className="h-2" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                    <p>{language === 'ar' ? 'لا توجد شكاوى' : 'No complaints'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ProgramSection;
