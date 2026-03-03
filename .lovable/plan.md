

# نقل التوصيات من التقارير إلى صفحة متابعة التوصيات

## الفكرة
عند حفظ التوصيات في صفحة التقرير، إضافة زر **"نقل إلى متابعة التوصيات"** ينسخ التوصية تلقائياً إلى جدول `recommendations` مع ربطها بالبرنامج والمقرر الدراسي.

## التغييرات

### 1. تعديل `src/pages/Reports.tsx`
- إضافة زر جديد في Dialog تعديل التوصيات: **"حفظ ونقل لمتابعة التوصيات"**
- عند الضغط عليه:
  1. حفظ التوصيات في `reports` (كما هو حالياً)
  2. إدراج سجل جديد في جدول `recommendations` بالبيانات التالية:
     - `title`: اسم الاستبيان + اسم المقرر (إن وجد من الفلتر)
     - `description`: نص التوصيات
     - `program_id`: من `survey.program_id`
     - `source_type`: `"survey"`
     - `source_id`: `report.id`
     - `academic_year`: من حقل السنة الأكاديمية
     - `semester`: من حقل الفصل الدراسي
     - `status`: `"pending"`
     - `priority`: `"medium"`
  3. التحقق من عدم وجود توصية مكررة بنفس `source_id` قبل الإدراج (upsert أو check)

### 2. تحديث `src/contexts/LanguageContext.tsx`
- إضافة مفاتيح ترجمة:
  - `recommendations.transferToTracking`: نقل لمتابعة التوصيات / Transfer to Tracking
  - `recommendations.transferSuccess`: تم نقل التوصيات بنجاح / Recommendations transferred
  - `recommendations.alreadyTransferred`: التوصيات منقولة مسبقاً / Already transferred

### ملاحظات
- لا تغيير على قاعدة البيانات — جدول `recommendations` موجود ويحتوي على كل الأعمدة المطلوبة (`source_id`, `source_type`, `program_id`, إلخ)
- الزر يظهر بجانب زر "حفظ التوصيات" في نفس الـ Dialog

