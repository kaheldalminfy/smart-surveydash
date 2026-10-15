import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Star, Users, BarChart3, Plus, MonitorSmartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type ReportType = "course_evaluation" | "workshop" | "program" | "general";

interface Template {
  id: string; name: string; name_en: string; description: string;
  category: string; questions: any[]; is_active: boolean;
  reportType?: ReportType;
}

type SurveyTemplateRow = Tables<"survey_templates">;

const reportTypes: ReportType[] = ["course_evaluation", "workshop", "program", "general"];
const knownCategories = ["course_evaluation", "satisfaction", "quality", "digital_platforms", "saved"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: unknown) => typeof value === "string" ? value.trim() : "";
const normalizeName = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

const getReportType = (value: unknown): ReportType | undefined =>
  typeof value === "string" && reportTypes.includes(value as ReportType)
    ? value as ReportType
    : undefined;

const inferStoredCategory = (
  templateData: Record<string, unknown>,
  name: string,
  reportType?: ReportType,
) => {
  const storedCategory = getString(templateData.category);
  if (knownCategories.includes(storedCategory)) return storedCategory;

  const searchableText = normalizeName([
    name,
    getString(templateData.title),
    getString(templateData.name_en),
    getString(templateData.title_en),
  ].join(" "));

  if (
    searchableText.includes("منص") ||
    searchableText.includes("platform") ||
    searchableText.includes("moodle") ||
    searchableText.includes("sis") ||
    searchableText.includes("iap.limu") ||
    searchableText.includes("qr")
  ) return "digital_platforms";

  if (reportType === "course_evaluation") return "course_evaluation";
  if (reportType === "program") return "quality";
  return "saved";
};

const mapStoredTemplate = (row: SurveyTemplateRow): Template => {
  const templateData = isRecord(row.template_data) ? row.template_data : {};
  const reportType = getReportType(templateData.reportType ?? templateData.report_type);
  const questions = Array.isArray(templateData.questions) ? templateData.questions : [];

  return {
    id: row.id,
    name: row.name,
    name_en: getString(templateData.name_en) || getString(templateData.title_en) || row.name,
    description: row.description || getString(templateData.description),
    category: inferStoredCategory(templateData, row.name, reportType),
    questions,
    is_active: true,
    reportType,
  };
};

const mergeTemplates = (predefinedTemplates: Template[], storedTemplates: Template[]) => {
  const mergedTemplates = [...predefinedTemplates];

  storedTemplates.forEach((storedTemplate) => {
    const matchingIndex = mergedTemplates.findIndex((template) =>
      template.id === storedTemplate.id ||
      normalizeName(template.name) === normalizeName(storedTemplate.name) ||
      normalizeName(template.name_en) === normalizeName(storedTemplate.name_en)
    );

    if (matchingIndex >= 0) {
      mergedTemplates[matchingIndex] = storedTemplate;
    } else {
      mergedTemplates.push(storedTemplate);
    }
  });

  return mergedTemplates;
};

interface SurveyTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  onCreateCustom: () => void;
}

const SurveyTemplates = ({ onSelectTemplate, onCreateCustom }: SurveyTemplatesProps) => {
  const { t, language } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const predefinedTemplates: Template[] = [
      {
        id: "course-eval-1", name: "تقييم المقرر الدراسي", name_en: "Course Evaluation",
        description: language === 'ar' ? "قالب شامل لتقييم جودة المقرر والأستاذ" : "Comprehensive template for evaluating course and instructor quality",
        category: "course_evaluation", is_active: true,
        questions: [
          { text: "كان محتوى المقرر واضحاً ومنظماً", type: "likert", order_index: 0, is_required: true },
          { text: "ساعدني المقرر على تحقيق أهداف التعلم", type: "likert", order_index: 1, is_required: true },
          { text: "كان الأستاذ متمكناً من المادة العلمية", type: "likert", order_index: 2, is_required: true },
          { text: "استخدم الأستاذ أساليب تدريس فعالة", type: "likert", order_index: 3, is_required: true },
          { text: "كانت طرق التقييم عادلة وواضحة", type: "likert", order_index: 4, is_required: true },
          { text: "ما هي مقترحاتك لتحسين المقرر؟", type: "text", order_index: 5, is_required: false }
        ]
      },
      {
        id: "satisfaction-1", name: "استبيان رضا الطلاب", name_en: "Student Satisfaction Survey",
        description: language === 'ar' ? "قياس مستوى رضا الطلاب عن الخدمات التعليمية" : "Measure student satisfaction with educational services",
        category: "satisfaction", is_active: true,
        questions: [
          { text: "ما مدى رضاك عن جودة التعليم بشكل عام؟", type: "likert", order_index: 0, is_required: true },
          { text: "ما مدى رضاك عن المرافق والتجهيزات؟", type: "likert", order_index: 1, is_required: true },
          { text: "ما مدى رضاك عن خدمات الدعم الطلابي؟", type: "likert", order_index: 2, is_required: true },
          { text: "هل تنصح الآخرين بالالتحاق بهذا البرنامج؟", type: "likert", order_index: 3, is_required: true },
          { text: "ما هي أبرز نقاط القوة في البرنامج؟", type: "text", order_index: 4, is_required: false },
          { text: "ما هي المجالات التي تحتاج للتحسين؟", type: "text", order_index: 5, is_required: false }
        ]
      },
      {
        id: "electronic-platforms-1",
        name: "تقييم تجربة الطلبة مع المنصات الإلكترونية",
        name_en: "Student Electronic Platforms Evaluation",
        description: language === 'ar'
          ? "تقييم سهولة الاستخدام والأداء والرضا عن المنصات الإلكترونية للطلبة"
          : "Evaluate usability, performance, and student satisfaction with electronic platforms",
        category: "digital_platforms",
        is_active: true,
        reportType: "general",
        questions: [
          { text: "القسم الأول: تقييم منصة Moodle", type: "section", order_index: 0, is_required: false },
          { text: "ما مدى استخدامك لمنصة Moodle؟", type: "mcq", order_index: 1, is_required: true, options: { choices: ["يوميًا", "عدة مرات أسبوعيًا", "أسبوعيًا", "نادرًا", "لم أستخدمها"] } },
          { text: "يسهل تسجيل الدخول إلى منصة Moodle.", type: "likert", order_index: 2, is_required: false },
          { text: "واجهة منصة Moodle واضحة وسهلة التصفح.", type: "likert", order_index: 3, is_required: false },
          { text: "تعمل منصة Moodle بسرعة واستقرار دون أخطاء متكررة.", type: "likert", order_index: 4, is_required: false },
          { text: "يسهل الوصول إلى المحتوى التعليمي والواجبات والاختبارات عبر منصة Moodle.", type: "likert", order_index: 5, is_required: false },
          { text: "أنا راضٍ بشكل عام عن تجربتي مع منصة Moodle.", type: "likert", order_index: 6, is_required: false },

          { text: "القسم الثاني: تقييم منصة SIS", type: "section", order_index: 7, is_required: false },
          { text: "ما مدى استخدامك لمنصة SIS؟", type: "mcq", order_index: 8, is_required: true, options: { choices: ["يوميًا", "عدة مرات أسبوعيًا", "أسبوعيًا", "نادرًا", "لم أستخدمها"] } },
          { text: "يسهل تسجيل الدخول إلى منصة SIS.", type: "likert", order_index: 9, is_required: false },
          { text: "واجهة منصة SIS واضحة وسهلة التصفح.", type: "likert", order_index: 10, is_required: false },
          { text: "تعمل منصة SIS بسرعة واستقرار دون أخطاء متكررة.", type: "likert", order_index: 11, is_required: false },
          { text: "الخدمات والمعلومات التي تقدمها منصة SIS واضحة وتلبي احتياجاتي.", type: "likert", order_index: 12, is_required: false },
          { text: "أنا راضٍ بشكل عام عن تجربتي مع منصة SIS.", type: "likert", order_index: 13, is_required: false },

          { text: "القسم الثالث: تقييم منصة iap.limu", type: "section", order_index: 14, is_required: false },
          { text: "ما مدى استخدامك لمنصة iap.limu؟", type: "mcq", order_index: 15, is_required: true, options: { choices: ["يوميًا", "عدة مرات أسبوعيًا", "أسبوعيًا", "نادرًا", "لم أستخدمها"] } },
          { text: "يسهل تسجيل الدخول إلى منصة iap.limu.", type: "likert", order_index: 16, is_required: false },
          { text: "واجهة منصة iap.limu واضحة وسهلة التصفح.", type: "likert", order_index: 17, is_required: false },
          { text: "تعمل منصة iap.limu بسرعة واستقرار دون أخطاء متكررة.", type: "likert", order_index: 18, is_required: false },
          { text: "إجراءات تسجيل الطالب وإدخال البيانات ومتابعة طلب التسجيل عبر منصة iap.limu واضحة وسهلة.", type: "likert", order_index: 19, is_required: false },
          { text: "أنا راضٍ بشكل عام عن تجربتي مع منصة iap.limu.", type: "likert", order_index: 20, is_required: false },

          { text: "القسم الرابع: تقييم منصة تسجيل حضور الطالب بالـ QR", type: "section", order_index: 21, is_required: false },
          { text: "ما مدى استخدامك لمنصة تسجيل حضور الطالب بالـ QR؟", type: "mcq", order_index: 22, is_required: true, options: { choices: ["يوميًا", "عدة مرات أسبوعيًا", "أسبوعيًا", "نادرًا", "لم أستخدمها"] } },
          { text: "يسهل الوصول إلى منصة تسجيل حضور الطالب بالـ QR واستخدامها.", type: "likert", order_index: 23, is_required: false },
          { text: "واجهة منصة تسجيل حضور الطالب بالـ QR واضحة وسهلة التصفح.", type: "likert", order_index: 24, is_required: false },
          { text: "تعمل منصة تسجيل حضور الطالب بالـ QR بسرعة واستقرار دون أخطاء متكررة.", type: "likert", order_index: 25, is_required: false },
          { text: "تسجل المنصة حضور الطالب باستخدام رمز QR بدقة، وتعرض حالة الحضور بوضوح.", type: "likert", order_index: 26, is_required: false },
          { text: "أنا راضٍ بشكل عام عن تجربتي مع منصة تسجيل حضور الطالب بالـ QR.", type: "likert", order_index: 27, is_required: false },

          { text: "القسم الخامس: التقييم العام والمقترحات", type: "section", order_index: 28, is_required: false },
          { text: "ما المنصة التي تستخدمها أكثر؟", type: "mcq", order_index: 29, is_required: true, options: { choices: ["Moodle", "SIS", "iap.limu", "منصة تسجيل حضور الطالب بالـ QR"] } },
          { text: "ما المنصة التي تحتاج إلى تحسين عاجل؟", type: "mcq", order_index: 30, is_required: true, options: { choices: ["Moodle", "SIS", "iap.limu", "منصة تسجيل حضور الطالب بالـ QR"] } },
          { text: "ما المشكلة الأكثر تكرارًا عند استخدام المنصات الإلكترونية؟", type: "mcq", order_index: 31, is_required: true, options: { choices: ["صعوبة تسجيل الدخول", "بطء المنصة", "أخطاء أو توقف متكرر", "صعوبة التصفح", "بيانات ناقصة أو غير دقيقة", "ضعف العمل على الهاتف", "مشكلة أخرى"] } },
          { text: "اذكر اسم المنصة ومقترحك لتحسينها.", type: "text", order_index: 32, is_required: false }
        ]
      },
      {
        id: "quality-1", name: "تقييم جودة البرنامج الأكاديمي", name_en: "Academic Program Quality",
        description: language === 'ar' ? "تقييم شامل لجودة البرنامج الأكاديمي ومخرجاته" : "Comprehensive evaluation of academic program quality and outcomes",
        category: "quality", is_active: true,
        questions: [
          { text: "يلبي البرنامج احتياجات سوق العمل", type: "likert", order_index: 0, is_required: true },
          { text: "المقررات الدراسية متنوعة وشاملة", type: "likert", order_index: 1, is_required: true },
          { text: "يوفر البرنامج فرصاً للتدريب العملي", type: "likert", order_index: 2, is_required: true },
          { text: "الخطة الدراسية منطقية ومتسلسلة", type: "likert", order_index: 3, is_required: true },
          { text: "يطور البرنامج مهارات التفكير النقدي", type: "likert", order_index: 4, is_required: true }
        ]
      },
      {
        id: "facilities-1", name: "تقييم المرافق والخدمات", name_en: "Facilities Evaluation",
        description: language === 'ar' ? "تقييم جودة المرافق والخدمات الجامعية" : "Evaluate quality of university facilities and services",
        category: "satisfaction", is_active: true,
        questions: [
          { text: "جودة القاعات الدراسية", type: "rating", order_index: 0, is_required: true },
          { text: "جودة المختبرات والمعامل", type: "rating", order_index: 1, is_required: true },
          { text: "جودة المكتبة ومصادر التعلم", type: "rating", order_index: 2, is_required: true },
          { text: "جودة خدمات الإنترنت", type: "rating", order_index: 3, is_required: true },
          { text: "ما هي المرافق التي تحتاج لتحسين عاجل؟", type: "text", order_index: 4, is_required: false }
        ]
      },
      {
        id: "teaching-1", name: "تقييم أساليب التدريس", name_en: "Teaching Methods Evaluation",
        description: language === 'ar' ? "تقييم فعالية أساليب التدريس المستخدمة" : "Evaluate effectiveness of teaching methods",
        category: "course_evaluation", is_active: true,
        questions: [
          { text: "يستخدم الأساتذة أساليب تدريس متنوعة", type: "likert", order_index: 0, is_required: true },
          { text: "يشجع الأساتذة على المشاركة الفعالة", type: "likert", order_index: 1, is_required: true },
          { text: "يستخدم الأساتذة التقنية بشكل فعال", type: "likert", order_index: 2, is_required: true },
          { text: "يربط الأساتذة المحتوى بالواقع العملي", type: "likert", order_index: 3, is_required: true }
        ]
      }
    ];
    try {
      const { data, error } = await supabase
        .from("survey_templates")
        .select("id, name, description, template_data, is_public, created_by, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const storedTemplates = (data || []).map(mapStoredTemplate);
      setTemplates(mergeTemplates(predefinedTemplates, storedTemplates));
    } catch (error) {
      console.error("Error loading survey templates:", error);
      setTemplates(predefinedTemplates);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const categories = [
    { value: "all", label: t('templates.allTemplates'), icon: FileText },
    { value: "course_evaluation", label: t('templates.courseEval'), icon: BarChart3 },
    { value: "satisfaction", label: t('templates.satisfaction'), icon: Star },
    { value: "quality", label: t('templates.quality'), icon: Users },
    { value: "digital_platforms", label: t('templates.digitalPlatforms'), icon: MonitorSmartphone },
    { value: "saved", label: t('templates.saved'), icon: FileText },
  ];

  const getCategoryIcon = (category: string) => categories.find(c => c.value === category)?.icon || FileText;
  const getCategoryLabel = (category: string) => categories.find(c => c.value === category)?.label || category;

  const filteredTemplates = selectedCategory === "all" ? templates : templates.filter(t => t.category === selectedCategory);

  if (loading) return (<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button key={category.value} variant={selectedCategory === category.value ? "default" : "outline"} size="sm"
              onClick={() => setSelectedCategory(category.value)} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />{category.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={onCreateCustom}>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Plus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t('designer.createCustom')}</h3>
            <p className="text-sm text-muted-foreground">{t('designer.createCustomDesc')}</p>
          </CardContent>
        </Card>

        {filteredTemplates.map((template) => {
          const Icon = getCategoryIcon(template.category);
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectTemplate(template)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-xs">{getCategoryLabel(template.category)}</Badge>
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight">{language === 'ar' ? template.name : template.name_en}</CardTitle>
                <CardDescription className="text-sm">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{template.questions?.filter(question => question.type !== "section").length || 0} {t('designer.questions')}</span>
                  <Button size="sm" variant="ghost">{t('designer.useTemplate')}</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('templates.noTemplates')}</h3>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === "all" ? t('templates.noTemplatesAvailable') : t('templates.noTemplatesInCategory')}
          </p>
          <Button onClick={onCreateCustom}><Plus className="h-4 w-4 ml-2" />{t('designer.createCustom')}</Button>
        </div>
      )}
    </div>
  );
};

export default SurveyTemplates;
