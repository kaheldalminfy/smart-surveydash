
# خطة تنفيذ وحدة الاعتماد الذكية (AI Accreditation Module)

## نظرة عامة على المشروع

هذه الخطة تتضمن إنشاء وحدة متكاملة لدعم متطلبات الاعتماد الأكاديمي (المؤسسي والبرامجي) باستخدام الذكاء الاصطناعي، تشمل:

1. إدارة معايير الاعتماد ومؤشراتها
2. تحليل ذكي للمتطلبات باستخدام AI
3. مساعدة في صياغة الردود ومراجعتها
4. متابعة نسب الاستيفاء والفجوات

---

## البنية التقنية

### 1. جداول قاعدة البيانات الجديدة

#### جدول أُطر الاعتماد `accreditation_frameworks`
```text
+----------------------+------------------+--------------------------------+
| Column               | Type             | Description                    |
+----------------------+------------------+--------------------------------+
| id                   | uuid (PK)        | المعرف الفريد                  |
| name                 | text             | اسم الإطار (مثلاً: NCAAA)      |
| name_en              | text             | الاسم بالإنجليزية              |
| type                 | enum             | institutional/programmatic     |
| scope                | enum             | national/international         |
| version              | text             | رقم الإصدار                    |
| description          | text             | وصف الإطار                     |
| source_file_url      | text             | رابط الملف المصدر              |
| is_active            | boolean          | نشط/غير نشط                    |
| created_by           | uuid (FK)        | منشئ الإطار                    |
| program_id           | uuid (FK)        | البرنامج (للاعتماد البرامجي)   |
| created_at           | timestamptz      | تاريخ الإنشاء                  |
+----------------------+------------------+--------------------------------+
```

#### جدول المعايير `accreditation_standards`
```text
+----------------------+------------------+--------------------------------+
| Column               | Type             | Description                    |
+----------------------+------------------+--------------------------------+
| id                   | uuid (PK)        | المعرف الفريد                  |
| framework_id         | uuid (FK)        | الإطار المرتبط                 |
| code                 | text             | رمز المعيار (مثلاً: S1)        |
| name                 | text             | اسم المعيار                    |
| description          | text             | وصف المعيار                    |
| order_index          | integer          | الترتيب                        |
| weight               | decimal          | الوزن النسبي                   |
| created_at           | timestamptz      | تاريخ الإنشاء                  |
+----------------------+------------------+--------------------------------+
```

#### جدول المؤشرات `accreditation_indicators`
```text
+----------------------+------------------+--------------------------------+
| Column               | Type             | Description                    |
+----------------------+------------------+--------------------------------+
| id                   | uuid (PK)        | المعرف الفريد                  |
| standard_id          | uuid (FK)        | المعيار المرتبط                |
| code                 | text             | رمز المؤشر (مثلاً: S1.1)       |
| name                 | text             | اسم المؤشر                     |
| description          | text             | وصف المؤشر                     |
| objective            | text             | هدف المؤشر                     |
| responsible_party    | text             | الجهة المسؤولة                 |
| importance_level     | enum             | critical/high/medium/low       |
| required_evidence    | jsonb            | قائمة الأدلة المطلوبة          |
| response_guidelines  | text             | إرشادات صياغة الرد             |
| response_template    | text             | نموذج رد إرشادي                |
| order_index          | integer          | الترتيب                        |
| created_at           | timestamptz      | تاريخ الإنشاء                  |
+----------------------+------------------+--------------------------------+
```

#### جدول استجابات المؤشرات `indicator_responses`
```text
+----------------------+------------------+--------------------------------+
| Column               | Type             | Description                    |
+----------------------+------------------+--------------------------------+
| id                   | uuid (PK)        | المعرف الفريد                  |
| indicator_id         | uuid (FK)        | المؤشر                         |
| program_id           | uuid (FK)        | البرنامج                       |
| academic_year        | text             | السنة الأكاديمية               |
| semester             | text             | الفصل الدراسي                  |
| response_text        | text             | نص الرد                        |
| status               | enum             | draft/submitted/reviewed       |
| compliance_level     | enum             | compliant/partial/non_compliant|
| compliance_percentage| integer          | نسبة الاستيفاء (0-100)         |
| ai_feedback          | text             | ملاحظات AI                     |
| ai_score             | integer          | تقييم AI                       |
| strengths            | jsonb            | نقاط القوة                     |
| gaps                 | jsonb            | الفجوات                        |
| improvement_notes    | text             | ملاحظات التحسين                |
| submitted_by         | uuid (FK)        | مقدم الرد                      |
| reviewed_by          | uuid (FK)        | المراجع                        |
| created_at           | timestamptz      | تاريخ الإنشاء                  |
| updated_at           | timestamptz      | تاريخ التحديث                  |
+----------------------+------------------+--------------------------------+
```

#### جدول مرفقات الأدلة `indicator_evidence`
```text
+----------------------+------------------+--------------------------------+
| Column               | Type             | Description                    |
+----------------------+------------------+--------------------------------+
| id                   | uuid (PK)        | المعرف الفريد                  |
| response_id          | uuid (FK)        | استجابة المؤشر                 |
| evidence_type        | text             | نوع الدليل                     |
| title                | text             | عنوان الدليل                   |
| description          | text             | وصف الدليل                     |
| file_url             | text             | رابط الملف                     |
| file_type            | text             | نوع الملف                      |
| uploaded_by          | uuid (FK)        | رافع الملف                     |
| created_at           | timestamptz      | تاريخ الإنشاء                  |
+----------------------+------------------+--------------------------------+
```

---

### 2. Storage Bucket للمرفقات

```sql
-- إنشاء bucket لملفات الاعتماد
insert into storage.buckets (id, name, public) 
values ('accreditation-files', 'accreditation-files', false);
```

---

### 3. Edge Functions للذكاء الاصطناعي

#### Function 1: `analyze-framework`
تحليل ملف معايير الاعتماد المرفوع واستخراج المعايير والمؤشرات تلقائياً

#### Function 2: `analyze-indicator`
تحليل مؤشر معين وتوضيح:
- المطلوب في الرد
- أنواع الأدلة المطلوبة
- صياغة رد إرشادية

#### Function 3: `evaluate-response`
تقييم استجابة المستخدم وتقديم:
- نسبة الاستيفاء
- نقاط القوة
- الفجوات
- اقتراحات للتحسين

#### Function 4: `generate-response-draft`
مساعدة المستخدم في صياغة رد أولي بناءً على المعلومات المدخلة

---

### 4. صفحات الواجهة الأمامية

#### صفحة 1: `Accreditation.tsx` (الصفحة الرئيسية)
- عرض قائمة أُطر الاعتماد
- إحصائيات عامة (نسبة الاستيفاء الكلية)
- فلترة حسب النوع (مؤسسي/برامجي)

#### صفحة 2: `AccreditationFramework.tsx` (تفاصيل الإطار)
- عرض المعايير والمؤشرات في هيكل شجري
- نسب الاستيفاء لكل معيار
- التنقل بين المؤشرات

#### صفحة 3: `IndicatorDetails.tsx` (تفاصيل المؤشر)
- عرض تفاصيل المؤشر
- تحليل AI للمتطلبات
- نموذج إدخال الرد
- رفع الأدلة والمرفقات
- تقييم AI للرد

---

### 5. المكونات الجديدة

```text
src/components/accreditation/
├── FrameworkCard.tsx          # بطاقة عرض إطار الاعتماد
├── StandardAccordion.tsx      # عرض المعيار مع مؤشراته
├── IndicatorCard.tsx          # بطاقة المؤشر مع حالته
├── ResponseForm.tsx           # نموذج إدخال الرد
├── EvidenceUploader.tsx       # رفع الأدلة والمرفقات
├── AIAnalysisPanel.tsx        # لوحة تحليل AI
├── ComplianceProgress.tsx     # شريط تقدم الاستيفاء
├── GapsReport.tsx             # تقرير الفجوات
├── FrameworkImporter.tsx      # استيراد إطار جديد
└── AccreditationDashboard.tsx # لوحة إحصائيات الاعتماد
```

---

## سير العمل (Workflow)

### المرحلة 1: رفع/اختيار إطار الاعتماد
1. المستخدم يختار نوع الاعتماد (مؤسسي/برامجي)
2. رفع ملف المعايير (PDF/Word) أو اختيار من مكتبة جاهزة
3. AI يحلل الملف ويستخرج المعايير والمؤشرات
4. مراجعة وتأكيد الاستخراج

### المرحلة 2: تحليل المؤشرات
- لكل مؤشر يعرض النظام:
  - تعريف المؤشر وهدفه
  - الجهة المسؤولة
  - درجة الأهمية
  - المطلوب في الرد (صياغة + أمثلة)
  - المرفقات المطلوبة (أنواع الأدلة)

### المرحلة 3: إدخال الردود
1. المستخدم يدخل رده أو يطلب مساعدة AI
2. رفع الأدلة والمرفقات
3. حفظ كمسودة أو إرسال للمراجعة

### المرحلة 4: التقييم الذكي
- AI يقيم الرد ويقدم:
  - نسبة الاستيفاء
  - الحالة (مستوفى/جزئي/غير مستوفى)
  - نقاط القوة
  - الفجوات
  - ملاحظات للتحسين

### المرحلة 5: لوحة المتابعة
- عرض نسب الاستيفاء الإجمالية
- تقرير الفجوات
- الأولويات للتحسين

---

## التفاصيل التقنية

### RLS Policies
```sql
-- سياسات أمان مشابهة لباقي الجداول
-- المنسقون يديرون أُطر برامجهم
-- المديرون يطلعون فقط
-- العميد يطلع على الكل
```

### Enums المطلوبة
```sql
CREATE TYPE accreditation_type AS ENUM ('institutional', 'programmatic');
CREATE TYPE accreditation_scope AS ENUM ('national', 'international');
CREATE TYPE importance_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE compliance_level AS ENUM ('compliant', 'partial', 'non_compliant');
CREATE TYPE response_status AS ENUM ('draft', 'submitted', 'reviewed', 'approved');
```

---

## التحديثات المطلوبة

### 1. الملفات الجديدة
| الملف | الوصف |
|-------|-------|
| `src/pages/Accreditation.tsx` | الصفحة الرئيسية للاعتماد |
| `src/pages/AccreditationFramework.tsx` | تفاصيل الإطار |
| `src/pages/IndicatorDetails.tsx` | تفاصيل المؤشر |
| `src/components/accreditation/*.tsx` | مكونات الوحدة |
| `supabase/functions/analyze-framework/` | تحليل الإطار |
| `supabase/functions/analyze-indicator/` | تحليل المؤشر |
| `supabase/functions/evaluate-response/` | تقييم الرد |

### 2. الملفات المحدثة
| الملف | التحديث |
|-------|---------|
| `src/App.tsx` | إضافة routes جديدة |
| `src/pages/Dashboard.tsx` | إضافة رابط للوحدة |
| `src/contexts/LanguageContext.tsx` | ترجمات جديدة |
| `supabase/config.toml` | إعدادات Edge Functions |

---

## الجدول الزمني المقترح

| المرحلة | المهام | الأولوية |
|---------|--------|----------|
| 1 | إنشاء جداول قاعدة البيانات + RLS | عالية |
| 2 | الصفحة الرئيسية + قائمة الأُطر | عالية |
| 3 | Edge Function لتحليل الإطار | عالية |
| 4 | صفحة تفاصيل الإطار والمعايير | عالية |
| 5 | صفحة المؤشر + نموذج الرد | عالية |
| 6 | Edge Functions للتقييم | متوسطة |
| 7 | لوحة الإحصائيات والفجوات | متوسطة |
| 8 | تصدير التقارير | منخفضة |

---

## القيمة المضافة

- **تقليل الجهد والوقت**: أتمتة تحليل المعايير وتوضيح المتطلبات
- **توحيد الردود**: قوالب وإرشادات موحدة
- **رفع الجودة**: تقييم ذكي مستمر
- **الجاهزية المستمرة**: متابعة دائمة لحالة الاستيفاء
- **تقليل الأخطاء**: مراجعة آلية للفجوات

