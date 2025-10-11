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
    // قوالب حقيقية للاستبيانات
    const predefinedTemplates: Template[] = [
      {
        id: "course-eval-1",
        name: "تقييم المقرر الدراسي",
        name_en: "Course Evaluation",
        description: "قالب شامل لتقييم جودة المقرر والأستاذ",
        category: "course_evaluation",
        is_active: true,
        questions: [
          {
            text: "كان محتوى المقرر واضحاً ومنظماً",
            type: "likert",
            order_index: 0,
            is_required: true
          },
          {
            text: "ساعدني المقرر على تحقيق أهداف التعلم",
            type: "likert",
            order_index: 1,
            is_required: true
          },
          {
            text: "كان الأستاذ متمكناً من المادة العلمية",
            type: "likert",
            order_index: 2,
            is_required: true
          },
          {
            text: "استخدم الأستاذ أساليب تدريس فعالة",
            type: "likert",
            order_index: 3,
            is_required: true
          },
          {
            text: "كانت طرق التقييم عادلة وواضحة",
            type: "likert",
            order_index: 4,
            is_required: true
          },
          {
            text: "ما هي مقترحاتك لتحسين المقرر؟",
            type: "text",
            order_index: 5,
            is_required: false
          }
        ]
      },
      {
        id: "satisfaction-1",
        name: "استبيان رضا الطلاب",
        name_en: "Student Satisfaction Survey",
        description: "قياس مستوى رضا الطلاب عن الخدمات التعليمية",
        category: "satisfaction",
        is_active: true,
        questions: [
          {
            text: "ما مدى رضاك عن جودة التعليم بشكل عام؟",
            type: "likert",
            order_index: 0,
            is_required: true
          },
          {
            text: "ما مدى رضاك عن المرافق والتجهيزات؟",
            type: "likert",
            order_index: 1,
            is_required: true
          },
          {
            text: "ما مدى رضاك عن خدمات الدعم الطلابي؟",
            type: "likert",
            order_index: 2,
            is_required: true
          },
          {
            text: "هل تنصح الآخرين بالالتحاق بهذا البرنامج؟",
            type: "likert",
            order_index: 3,
            is_required: true
          },
          {
            text: "ما هي أبرز نقاط القوة في البرنامج؟",
            type: "text",
            order_index: 4,
            is_required: false
          },
          {
            text: "ما هي المجالات التي تحتاج للتحسين؟",
            type: "text",
            order_index: 5,
            is_required: false
          }
        ]
      },
      {
        id: "quality-1",
        name: "تقييم جودة البرنامج الأكاديمي",
        name_en: "Academic Program Quality",
        description: "تقييم شامل لجودة البرنامج الأكاديمي ومخرجاته",
        category: "quality",
        is_active: true,
        questions: [
          {
            text: "يلبي البرنامج احتياجات سوق العمل",
            type: "likert",
            order_index: 0,
            is_required: true
          },
          {
            text: "المقررات الدراسية متنوعة وشاملة",
            type: "likert",
            order_index: 1,
            is_required: true
          },
          {
            text: "يوفر البرنامج فرصاً للتدريب العملي",
            type: "likert",
            order_index: 2,
            is_required: true
          },
          {
            text: "الخطة الدراسية منطقية ومتسلسلة",
            type: "likert",
            order_index: 3,
            is_required: true
          },
          {
            text: "يطور البرنامج مهارات التفكير النقدي",
            type: "likert",
            order_index: 4,
            is_required: true
          }
        ]
      },
      {
        id: "facilities-1",
        name: "تقييم المرافق والخدمات",
        name_en: "Facilities Evaluation",
        description: "تقييم جودة المرافق والخدمات الجامعية",
        category: "satisfaction",
        is_active: true,
        questions: [
          {
            text: "جودة القاعات الدراسية",
            type: "rating",
            order_index: 0,
            is_required: true
          },
          {
            text: "جودة المختبرات والمعامل",
            type: "rating",
            order_index: 1,
            is_required: true
          },
          {
            text: "جودة المكتبة ومصادر التعلم",
            type: "rating",
            order_index: 2,
            is_required: true
          },
          {
            text: "جودة خدمات الإنترنت",
            type: "rating",
            order_index: 3,
            is_required: true
          },
          {
            text: "ما هي المرافق التي تحتاج لتحسين عاجل؟",
            type: "text",
            order_index: 4,
            is_required: false
          }
        ]
      },
      {
        id: "teaching-1",
        name: "تقييم أساليب التدريس",
        name_en: "Teaching Methods Evaluation",
        description: "تقييم فعالية أساليب التدريس المستخدمة",
        category: "course_evaluation",
        is_active: true,
        questions: [
          {
            text: "يستخدم الأساتذة أساليب تدريس متنوعة",
            type: "likert",
            order_index: 0,
            is_required: true
          },
          {
            text: "يشجع الأساتذة على المشاركة الفعالة",
            type: "likert",
            order_index: 1,
            is_required: true
          },
          {
            text: "يستخدم الأساتذة التقنية بشكل فعال",
            type: "likert",
            order_index: 2,
            is_required: true
          },
          {
            text: "يربط الأساتذة المحتوى بالواقع العملي",
            type: "likert",
            order_index: 3,
            is_required: true
          }
        ]
      }
    ];

    setTemplates(predefinedTemplates);
    setLoading(false);
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
