
# تفعيل دعم اللغة الإنجليزية الشامل في جميع صفحات المنظومة

## المشكلة
حالياً نظام الترجمة (`LanguageContext`) مطبق فقط في 7 صفحات من أصل 21 صفحة. الصفحات التالية تحتوي على نصوص عربية ثابتة بدون دعم للإنجليزية:

**صفحات بدون ترجمة (14 صفحة):**
- `Surveys.tsx` - إدارة الاستبيانات
- `Reports.tsx` - التقارير
- `Complaints.tsx` - الشكاوى
- `Recommendations.tsx` - التوصيات
- `Archives.tsx` - الأرشيف
- `Users.tsx` - المستخدمين
- `SystemSettings.tsx` - الإعدادات
- `SurveyDesigner.tsx` - تصميم الاستبيان
- `TakeSurvey.tsx` - تعبئة الاستبيان
- `SurveyComplete.tsx` - إكمال الاستبيان
- `ComplaintSubmitted.tsx` - تأكيد الشكوى
- `ProgramComparison.tsx` - مقارنة البرامج
- `AcademicCalendar.tsx` - الأجندة الأكاديمية
- `NotFound.tsx` - صفحة غير موجودة

**مكونات بدون ترجمة:**
- `SurveyAnalytics.tsx`, `QRCodeDialog.tsx`, `ComplaintsDashboard.tsx`, `SurveyTemplates.tsx`, `ReportDashboard.tsx`, `PDFPreviewDialog.tsx`, `AddUserDialog.tsx`, وغيرها

## الحل

### المبدأ الأساسي
- جميع عناصر الواجهة (أزرار، عناوين، تسميات، رسائل) تتحول للإنجليزية عند تغيير اللغة
- البيانات المخزنة في قاعدة البيانات (عناوين الاستبيانات، نصوص التقارير، التوصيات، الشكاوى) تبقى كما هي بلغتها الأصلية
- لا تغيير في قاعدة البيانات إطلاقاً

### خطوات التنفيذ

#### 1. توسيع ملف الترجمة `LanguageContext.tsx`
إضافة مفاتيح ترجمة جديدة تغطي جميع النصوص الثابتة في الصفحات غير المترجمة. تقريباً 150-200 مفتاح جديد تشمل:
- نصوص مصمم الاستبيان (أنواع الأسئلة، أزرار الحفظ، تعليمات)
- نصوص صفحة التقارير (أزرار التصدير، عناوين الأقسام)
- نصوص صفحة الشكاوى (أعمدة الجدول، حالات الشكوى)
- نصوص الأرشيف والتوصيات والمقارنة والتقويم
- رسائل Toast (نجاح/خطأ)

#### 2. تحديث كل صفحة لاستخدام `t()` أو `language === 'ar'`
لكل صفحة من الـ 14 صفحة + المكونات المساعدة:
- إضافة `import { useLanguage } from "@/contexts/LanguageContext"`
- استبدال النصوص العربية الثابتة بـ `t('key')` أو `language === 'ar' ? 'عربي' : 'English'`
- إضافة `LanguageToggle` في الصفحات التي لا تحتوي عليه

#### 3. لا تغيير في:
- قاعدة البيانات
- ملفات التقارير PDF/Excel (تبقى بلغة المحتوى الأصلي)
- بيانات الاستبيانات والتوصيات المخزنة

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/contexts/LanguageContext.tsx` | إضافة ~200 مفتاح ترجمة جديد |
| `src/pages/Surveys.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/Reports.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/Complaints.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/Recommendations.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/Archives.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/Users.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/SystemSettings.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/SurveyDesigner.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/TakeSurvey.tsx` | تطبيق `t()` على جميع النصوص الثابتة |
| `src/pages/SurveyComplete.tsx` | تطبيق `t()` |
| `src/pages/ComplaintSubmitted.tsx` | تطبيق `t()` |
| `src/pages/ProgramComparison.tsx` | تطبيق `t()` |
| `src/pages/AcademicCalendar.tsx` | تطبيق `t()` |
| `src/pages/NotFound.tsx` | تطبيق `t()` |
| `src/components/SurveyAnalytics.tsx` | تطبيق `t()` |
| `src/components/QRCodeDialog.tsx` | تطبيق `t()` |
| `src/components/ComplaintsDashboard.tsx` | تطبيق `t()` |
| `src/components/SurveyTemplates.tsx` | تطبيق `t()` |
| `src/components/ReportDashboard.tsx` | تطبيق `t()` |
| `src/components/AddUserDialog.tsx` | تطبيق `t()` |
| مكونات أخرى حسب الحاجة | تطبيق `t()` |

## ملاحظة مهمة
هذا تغيير كبير يشمل ~20+ ملف. يُفضل تنفيذه على مراحل (مثلاً 4-5 ملفات في كل مرة) لتجنب الأخطاء. هل تريد البدء بمجموعة معينة من الصفحات أولاً؟
