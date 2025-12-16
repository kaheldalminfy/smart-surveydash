import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Archive, 
  Search, 
  Download, 
  Calendar, 
  FileText,
  BarChart3,
  Users,
  Clock,
  Eye,
  Trash2,
  Plus,
  FolderOpen,
  Lock
} from "lucide-react";
import DashboardButton from "@/components/DashboardButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ArchivedItem {
  id: string;
  title: string;
  data_type: "survey" | "report" | "complaint";
  semester: string;
  academic_year: string;
  archived_at: string;
  archived_by: string;
  is_frozen: boolean;
  metadata?: any;
  file_path?: string;
  programs?: { name: string };
  profiles?: { full_name: string };
}

const Archives = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [archives, setArchives] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);

  const semesters = ["خريف", "ربيع", "صيف"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => `${currentYear - i}-${currentYear - i + 1}`);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("archives")
        .select(`
          *,
          programs (name),
          profiles!archives_archived_by_fkey (full_name)
        `)
        .order("archived_at", { ascending: false });

      if (error) throw error;
      setArchives(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الأرشيف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteArchiveItem = async (itemId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العنصر من الأرشيف؟")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("archives")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف العنصر من الأرشيف",
      });

      loadArchives();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في حذف العنصر",
        variant: "destructive",
      });
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      survey: { label: "استبيان", variant: "default" as const, color: "bg-blue-500" },
      report: { label: "تقرير", variant: "secondary" as const, color: "bg-green-500" },
      complaint: { label: "شكوى", variant: "outline" as const, color: "bg-orange-500" },
      recommendation: { label: "توصية", variant: "outline" as const, color: "bg-purple-500" },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.survey;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      survey: BarChart3,
      report: FileText,
      complaint: Users,
      recommendation: FileText,
    };
    
    const Icon = icons[type as keyof typeof icons] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  const filteredArchives = archives.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.data_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.data_type === typeFilter;
    const matchesSemester = semesterFilter === "all" || item.semester === semesterFilter;
    const matchesYear = yearFilter === "all" || item.academic_year === yearFilter;
    
    return matchesSearch && matchesType && matchesSemester && matchesYear;
  });

  const getArchiveStats = () => {
    const total = archives.length;
    const surveys = archives.filter(a => a.data_type === "survey").length;
    const reports = archives.filter(a => a.data_type === "report").length;
    const complaints = archives.filter(a => a.data_type === "complaint").length;
    const frozen = archives.filter(a => a.is_frozen).length;
    
    return { total, surveys, reports, complaints, frozen };
  };

  const getArchivesByPeriod = () => {
    const byYear = archives.reduce((acc, item) => {
      const year = item.academic_year;
      if (!acc[year]) acc[year] = {};
      
      const semester = item.semester;
      if (!acc[year][semester]) acc[year][semester] = [];
      
      acc[year][semester].push(item);
      return acc;
    }, {} as Record<string, Record<string, ArchivedItem[]>>);
    
    return byYear;
  };

  const stats = getArchiveStats();
  const archivesByPeriod = getArchivesByPeriod();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <DashboardButton />
          <div>
            <h1 className="text-3xl font-bold">الأرشيف الفصلي</h1>
            <p className="text-muted-foreground">إدارة وتنظيم الأرشيف الفصلي للاستبيانات والتقارير</p>
          </div>
        </div>
        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              أرشفة عنصر جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>أرشفة عنصر جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ملاحظة: هذه الميزة ستكون متاحة قريباً لأرشفة الاستبيانات والتقارير تلقائياً
              </p>
              <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                إغلاق
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي العناصر</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Archive className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الاستبيانات</p>
                <p className="text-2xl font-bold">{stats.surveys}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">التقارير</p>
                <p className="text-2xl font-bold">{stats.reports}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الشكاوى</p>
                <p className="text-2xl font-bold">{stats.complaints}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">مجمدة</p>
                <p className="text-2xl font-bold">{stats.frozen}</p>
              </div>
              <Lock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">عرض القائمة</TabsTrigger>
          <TabsTrigger value="timeline">العرض الزمني</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث في الأرشيف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <select
                  className="rounded-md border border-input bg-background px-3 py-2"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="survey">الاستبيانات</option>
                  <option value="report">التقارير</option>
                  <option value="complaint">الشكاوى</option>
                  <option value="recommendation">التوصيات</option>
                </select>

                <select
                  className="rounded-md border border-input bg-background px-3 py-2"
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                >
                  <option value="all">جميع الفصول</option>
                  {semesters.map(semester => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>

                <select
                  className="rounded-md border border-input bg-background px-3 py-2"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="all">جميع السنوات</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Archives List */}
          <div className="space-y-4">
            {filteredArchives.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getTypeIcon(item.data_type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{item.title || `${item.data_type} - ${item.semester} ${item.academic_year}`}</h3>
                          {getTypeBadge(item.data_type)}
                          <Badge variant="outline">{item.semester} {item.academic_year}</Badge>
                          {item.is_frozen && (
                            <Badge variant="secondary" className="bg-yellow-500">
                              <Lock className="h-3 w-3 ml-1" />
                              مجمد
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>أُرشف في {new Date(item.archived_at).toLocaleDateString('ar-SA')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>بواسطة {item.profiles?.full_name || "النظام"}</span>
                          </div>
                          {item.programs && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{item.programs.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {item.file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "قريباً",
                              description: "ميزة تحميل الملفات ستكون متاحة قريباً",
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {!item.is_frozen && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteArchiveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredArchives.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد عناصر مؤرشفة</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || typeFilter !== "all" || semesterFilter !== "all" || yearFilter !== "all"
                      ? "لا توجد عناصر تطابق معايير البحث"
                      : "لم يتم أرشفة أي عناصر بعد"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {Object.entries(archivesByPeriod)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, semesters]) => (
              <Card key={year}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    العام الأكاديمي {year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(semesters).map(([semester, items]) => (
                      <div key={semester} className="border-l-2 border-primary pl-4">
                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          فصل {semester} ({items.length} عنصر)
                        </h4>
                        <div className="grid gap-3">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                {getTypeIcon(item.data_type)}
                                <div>
                                  <p className="font-medium">{item.title || `${item.data_type} - ${item.semester} ${item.academic_year}`}</p>
                                  <p className="text-sm text-muted-foreground">
                                    أُرشف في {new Date(item.archived_at).toLocaleDateString('ar-SA')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getTypeBadge(item.data_type)}
                                {item.is_frozen && (
                                  <Badge variant="secondary" className="bg-yellow-500">
                                    <Lock className="h-3 w-3" />
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedItem(item)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

          {Object.keys(archivesByPeriod).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد بيانات زمنية</h3>
                <p className="text-muted-foreground">لم يتم أرشفة أي عناصر بعد</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTypeIcon(selectedItem.data_type)}
                تفاصيل العنصر المؤرشف
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {getTypeBadge(selectedItem.data_type)}
                <Badge variant="outline">{selectedItem.semester} {selectedItem.academic_year}</Badge>
                {selectedItem.is_frozen && (
                  <Badge variant="secondary" className="bg-yellow-500">
                    <Lock className="h-3 w-3 ml-1" />
                    مجمد
                  </Badge>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {selectedItem.title || `${selectedItem.data_type} - ${selectedItem.semester} ${selectedItem.academic_year}`}
                </h3>
                {selectedItem.metadata && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">معلومات إضافية:</h4>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(selectedItem.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">نوع العنصر:</span>
                  <p>{selectedItem.data_type === "survey" ? "استبيان" : selectedItem.data_type === "report" ? "تقرير" : selectedItem.data_type === "complaint" ? "شكوى" : "توصية"}</p>
                </div>
                <div>
                  <span className="font-medium">الفصل الدراسي:</span>
                  <p>{selectedItem.semester} {selectedItem.academic_year}</p>
                </div>
                <div>
                  <span className="font-medium">تاريخ الأرشفة:</span>
                  <p>{new Date(selectedItem.archived_at).toLocaleDateString('ar-SA')}</p>
                </div>
                <div>
                  <span className="font-medium">أُرشف بواسطة:</span>
                  <p>{selectedItem.profiles?.full_name || "النظام"}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  إغلاق
                </Button>
                {selectedItem.file_path && (
                  <Button onClick={() => {
                    toast({
                      title: "قريباً",
                      description: "ميزة تحميل الملفات ستكون متاحة قريباً",
                    });
                  }}>
                    <Download className="h-4 w-4 ml-2" />
                    تحميل الملف
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Archives;
