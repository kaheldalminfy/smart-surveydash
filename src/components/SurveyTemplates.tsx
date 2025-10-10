import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Star, Users, BarChart3, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  name_en: string;
  description: string;
  category: string;
  questions: any[];
  is_active: boolean;
}

interface SurveyTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  onCreateCustom: () => void;
}

const SurveyTemplates = ({ onSelectTemplate, onCreateCustom }: SurveyTemplatesProps) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(false);
    // استخدام قوالب ثابتة مؤقتاً
    setTemplates([]);
  };

  const categories = [
    { value: "all", label: "جميع القوالب", icon: FileText },
    { value: "course_evaluation", label: "تقييم المقررات", icon: BarChart3 },
    { value: "satisfaction", label: "رضا الطلاب", icon: Star },
    { value: "quality", label: "جودة التعليم", icon: Users },
  ];

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category);
    return categoryData?.icon || FileText;
  };

  const getCategoryLabel = (category: string) => {
    const categoryData = categories.find(c => c.value === category);
    return categoryData?.label || category;
  };

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {category.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* قالب إنشاء استبيان مخصص */}
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={onCreateCustom}>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Plus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">إنشاء استبيان مخصص</h3>
            <p className="text-sm text-muted-foreground">ابدأ من الصفر وأنشئ استبياناً حسب احتياجاتك</p>
          </CardContent>
        </Card>

        {/* القوالب الجاهزة */}
        {filteredTemplates.map((template) => {
          const Icon = getCategoryIcon(template.category);
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectTemplate(template)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(template.category)}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                <CardDescription className="text-sm">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{template.questions?.length || 0} سؤال</span>
                  <Button size="sm" variant="ghost">
                    استخدام القالب
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد قوالب</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === "all" 
              ? "لا توجد قوالب متاحة حالياً" 
              : "لا توجد قوالب في هذه الفئة"}
          </p>
          <Button onClick={onCreateCustom}>
            <Plus className="h-4 w-4 ml-2" />
            إنشاء استبيان مخصص
          </Button>
        </div>
      )}
    </div>
  );
};

export default SurveyTemplates;
