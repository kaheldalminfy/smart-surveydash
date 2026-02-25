

# عرض التوصيات في لوحة تحكم البرامج مع إمكانية التعديل

## المشكلة
لوحة التحكم في تبويب "البرامج" لا تعرض التوصيات المحفوظة في جدول `reports`. المطلوب إظهارها لكل برنامج مع إمكانية تعديلها للمنسقين ومدير النظام.

## الحل

### 1. تعديل `RoleBasedDashboard.tsx`
- إضافة نوع بيانات جديد `RecommendationDetail` يحتوي على: `reportId`, `surveyId`, `surveyTitle`, `recommendationsText`
- إضافة حقل `recommendations: RecommendationDetail[]` إلى `ProgramStats`
- في دالة `loadProgramStats`: جلب التوصيات من جدول `reports` المرتبط باستبيانات البرنامج عبر `survey_id`
- تمرير `userRole` كـ prop إلى `ProgramSection`

### 2. تعديل `ProgramSection.tsx`
- استقبال `userRole` كـ prop جديد
- إضافة قسم "التوصيات" كـ Collapsible (مشابه لأقسام الاستبيانات والشكاوى)
- عرض كل توصية مع اسم الاستبيان المرتبط بها في جدول
- زر "تعديل" يظهر فقط إذا كان `userRole === 'admin' || userRole === 'coordinator'`
- عند الضغط على التعديل: نافذة Dialog تحتوي على Textarea لتعديل النص وزر حفظ
- الحفظ يتم عبر `supabase.from('reports').update({ recommendations_text }).eq('id', reportId)`
- عرض رسالة نجاح بعد الحفظ عبر toast

### 3. لا تغيير في قاعدة البيانات
- لا يتم إضافة أو حذف أو تعديل أي جداول أو بيانات
- سياسة UPDATE الموجودة تدعم المنسقين والأدمن بالفعل

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/dashboard/RoleBasedDashboard.tsx` | إضافة `RecommendationDetail` و `recommendations` إلى `ProgramStats`، جلب التوصيات من `reports`، تمرير `userRole` |
| `src/components/dashboard/ProgramSection.tsx` | إضافة قسم التوصيات القابل للطي مع Dialog للتعديل |

