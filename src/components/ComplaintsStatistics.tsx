import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, BarChart3, AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Program {
  id: string;
  name: string;
  name_en: string | null;
}

interface ComplaintsStatisticsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ComplaintsStatistics = ({ isOpen, onClose }: ComplaintsStatisticsProps) => {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    byType: [] as { name: string; value: number; fill: string }[],
    byCategory: [] as { name: string; value: number; fill: string }[],
    byStatus: [] as { name: string; value: number; fill: string }[],
    byMonth: [] as { name: string; count: number }[],
  });

  useEffect(() => {
    if (isOpen) {
      loadPrograms();
      loadComplaints();
    }
  }, [isOpen]);

  useEffect(() => {
    if (complaints.length > 0) {
      calculateStats();
    }
  }, [complaints, selectedProgram]);

  const loadPrograms = async () => {
    const { data } = await supabase.from("programs").select("*").order("name");
    if (data) setPrograms(data);
  };

  const loadComplaints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*, programs(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل الشكاوى", variant: "destructive" });
    } else {
      setComplaints(data || []);
    }
    setLoading(false);
  };

  const calculateStats = () => {
    const filtered = selectedProgram === "all" 
      ? complaints 
      : complaints.filter(c => c.program_id === selectedProgram);

    const statusLabels: Record<string, string> = {
      pending: "جديدة",
      in_progress: "قيد الإجراء",
      resolved: "تم الحل",
    };

    const typeLabels: Record<string, string> = {
      academic: "أكاديمية",
      administrative: "إدارية",
      technical: "تقنية",
      other: "أخرى",
    };

    const categoryLabels: Record<string, string> = {
      faculty: "أعضاء هيئة التدريس",
      curriculum: "المناهج",
      facilities: "المرافق",
      services: "الخدمات",
      other: "أخرى",
    };

    // Status counts
    const pending = filtered.filter(c => c.status === "pending").length;
    const inProgress = filtered.filter(c => c.status === "in_progress").length;
    const resolved = filtered.filter(c => c.status === "resolved").length;

    // By type
    const typeCounts: Record<string, number> = {};
    filtered.forEach(c => {
      const type = c.type || "other";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const typeColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#6b7280"];
    const byType = Object.entries(typeCounts).map(([key, value], i) => ({
      name: typeLabels[key] || key,
      value,
      fill: typeColors[i % typeColors.length],
    }));

    // By category
    const categoryCounts: Record<string, number> = {};
    filtered.forEach(c => {
      const category = c.complaint_category || "other";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryColors = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];
    const byCategory = Object.entries(categoryCounts).map(([key, value], i) => ({
      name: categoryLabels[key] || key,
      value,
      fill: categoryColors[i % categoryColors.length],
    }));

    // By status
    const byStatus = [
      { name: "جديدة", value: pending, fill: "#f59e0b" },
      { name: "قيد الإجراء", value: inProgress, fill: "#3b82f6" },
      { name: "تم الحل", value: resolved, fill: "#22c55e" },
    ];

    // By month (last 6 months)
    const monthCounts: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = 0;
    }

    filtered.forEach(c => {
      const date = new Date(c.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthCounts[key] !== undefined) {
        monthCounts[key]++;
      }
    });

    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const byMonth = Object.entries(monthCounts).map(([key, count]) => {
      const [year, month] = key.split("-");
      return {
        name: monthNames[parseInt(month) - 1],
        count,
      };
    });

    setStats({
      total: filtered.length,
      pending,
      inProgress,
      resolved,
      byType,
      byCategory,
      byStatus,
      byMonth,
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    // Add Arabic font support
    doc.setFont("helvetica");
    
    const programName = selectedProgram === "all" 
      ? "جميع البرامج" 
      : programs.find(p => p.id === selectedProgram)?.name || "";

    // Title
    doc.setFontSize(18);
    doc.text("تقرير إحصائيات الشكاوى", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`البرنامج: ${programName}`, 105, 30, { align: "center" });
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}`, 105, 38, { align: "center" });

    // Statistics summary
    doc.setFontSize(14);
    doc.text("ملخص الإحصائيات", 190, 55, { align: "right" });
    
    autoTable(doc, {
      startY: 60,
      head: [["الإحصائية", "العدد"]],
      body: [
        ["إجمالي الشكاوى", stats.total.toString()],
        ["شكاوى جديدة", stats.pending.toString()],
        ["قيد الإجراء", stats.inProgress.toString()],
        ["تم الحل", stats.resolved.toString()],
        ["نسبة الحل", `${stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%`],
      ],
      styles: { font: "helvetica", halign: "center" },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // By Type
    doc.setFontSize(14);
    doc.text("توزيع الشكاوى حسب النوع", 190, (doc as any).lastAutoTable.finalY + 15, { align: "right" });
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["النوع", "العدد", "النسبة"]],
      body: stats.byType.map(t => [
        t.name,
        t.value.toString(),
        `${stats.total > 0 ? ((t.value / stats.total) * 100).toFixed(1) : 0}%`,
      ]),
      styles: { font: "helvetica", halign: "center" },
      headStyles: { fillColor: [139, 92, 246] },
    });

    // By Status
    doc.setFontSize(14);
    doc.text("توزيع الشكاوى حسب الحالة", 190, (doc as any).lastAutoTable.finalY + 15, { align: "right" });
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["الحالة", "العدد", "النسبة"]],
      body: stats.byStatus.map(s => [
        s.name,
        s.value.toString(),
        `${stats.total > 0 ? ((s.value / stats.total) * 100).toFixed(1) : 0}%`,
      ]),
      styles: { font: "helvetica", halign: "center" },
      headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save(`complaints-report-${selectedProgram === "all" ? "all" : selectedProgram}.pdf`);
    
    toast({ title: "تم التصدير", description: "تم تصدير التقرير بصيغة PDF" });
  };

  const exportToExcel = () => {
    const programName = selectedProgram === "all" 
      ? "جميع البرامج" 
      : programs.find(p => p.id === selectedProgram)?.name || "";

    const filtered = selectedProgram === "all" 
      ? complaints 
      : complaints.filter(c => c.program_id === selectedProgram);

    // Summary sheet
    const summaryData = [
      ["تقرير إحصائيات الشكاوى"],
      ["البرنامج", programName],
      ["تاريخ التقرير", new Date().toLocaleDateString("ar-SA")],
      [],
      ["ملخص الإحصائيات"],
      ["إجمالي الشكاوى", stats.total],
      ["شكاوى جديدة", stats.pending],
      ["قيد الإجراء", stats.inProgress],
      ["تم الحل", stats.resolved],
      ["نسبة الحل", `${stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%`],
    ];

    // Type distribution sheet
    const typeData = [
      ["توزيع الشكاوى حسب النوع"],
      ["النوع", "العدد", "النسبة"],
      ...stats.byType.map(t => [
        t.name,
        t.value,
        `${stats.total > 0 ? ((t.value / stats.total) * 100).toFixed(1) : 0}%`,
      ]),
    ];

    // Status distribution sheet
    const statusData = [
      ["توزيع الشكاوى حسب الحالة"],
      ["الحالة", "العدد", "النسبة"],
      ...stats.byStatus.map(s => [
        s.name,
        s.value,
        `${stats.total > 0 ? ((s.value / stats.total) * 100).toFixed(1) : 0}%`,
      ]),
    ];

    // Detailed complaints
    const statusLabels: Record<string, string> = {
      pending: "جديدة",
      in_progress: "قيد الإجراء",
      resolved: "تم الحل",
    };

    const typeLabels: Record<string, string> = {
      academic: "أكاديمية",
      administrative: "إدارية",
      technical: "تقنية",
      other: "أخرى",
    };

    const detailsData = [
      ["تفاصيل الشكاوى"],
      ["الموضوع", "النوع", "الحالة", "البرنامج", "تاريخ الإنشاء"],
      ...filtered.map(c => [
        c.subject,
        typeLabels[c.type] || c.type,
        statusLabels[c.status] || c.status,
        c.programs?.name || "-",
        new Date(c.created_at).toLocaleDateString("ar-SA"),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "ملخص");
    
    const ws2 = XLSX.utils.aoa_to_sheet(typeData);
    XLSX.utils.book_append_sheet(wb, ws2, "حسب النوع");
    
    const ws3 = XLSX.utils.aoa_to_sheet(statusData);
    XLSX.utils.book_append_sheet(wb, ws3, "حسب الحالة");
    
    const ws4 = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, ws4, "التفاصيل");

    XLSX.writeFile(wb, `complaints-report-${selectedProgram === "all" ? "all" : selectedProgram}.xlsx`);
    
    toast({ title: "تم التصدير", description: "تم تصدير التقرير بصيغة Excel" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  تقارير إحصائيات الشكاوى
                </CardTitle>
                <CardDescription>إحصائيات شاملة للشكاوى مع إمكانية التصفية والتصدير</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={exportToPDF}>
                  <Download className="h-4 w-4 ml-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  Excel
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  إغلاق
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">البرنامج:</span>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-64">
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

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
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
                        <TrendingUp className="h-10 w-10 text-purple-500 opacity-50" />
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

                {/* Resolution Rate */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">نسبة الحل</span>
                      <Badge variant="secondary">
                        {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">توزيع الشكاوى حسب الحالة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.byStatus.some(s => s.value > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={stats.byStatus}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={100}
                              dataKey="value"
                            >
                              {stats.byStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          لا توجد بيانات
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Type Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">توزيع الشكاوى حسب النوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats.byType.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={stats.byType} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {stats.byType.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          لا توجد بيانات
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Monthly Trend */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">اتجاه الشكاوى الشهري (آخر 6 أشهر)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.byMonth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="عدد الشكاوى" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Category Distribution */}
                  {stats.byCategory.length > 0 && (
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg">توزيع الشكاوى حسب التصنيف</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={stats.byCategory}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={100}
                              dataKey="value"
                            >
                              {stats.byCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplaintsStatistics;
