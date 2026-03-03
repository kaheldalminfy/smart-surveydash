

# ترجمة شاملة لجميع الملفات المتبقية

## الملفات التي تحتاج تعديل (لا تستخدم `useLanguage` حالياً)

### الصفحات (8 ملفات)
| الملف | الحجم | عدد النصوص العربية الثابتة تقريباً |
|-------|-------|-----|
| `Reports.tsx` | 1410 سطر | ~120 نص (الأكبر والأكثر تعقيداً) |
| `Complaints.tsx` | 1586 سطر | ~100 نص |
| `Recommendations.tsx` | 438 سطر | ~40 نص |
| `Archives.tsx` | 593 سطر | ~35 نص |
| `Users.tsx` | 448 سطر | ~30 نص |
| `SurveyDesigner.tsx` | 1280 سطر | ~80 نص |
| `TakeSurvey.tsx` | 709 سطر | ~50 نص |
| `AcademicCalendar.tsx` | 536 سطر | ~35 نص |

### المكونات (~7 ملفات)
| الملف | الحجم |
|-------|-------|
| `ComplaintsDashboard.tsx` | 408 سطر |
| `ComplaintsStatistics.tsx` | ~200 سطر |
| `SurveyAnalytics.tsx` | 805 سطر |
| `SurveyTemplates.tsx` | ~300 سطر |
| `SurveyPreview.tsx` | ~200 سطر |
| `SurveyDistribution.tsx` | ~150 سطر |
| `ReportDashboard.tsx` | مكتمل جزئياً |

## النهج التقني

لكل ملف:
1. إضافة `import { useLanguage } from "@/contexts/LanguageContext"`
2. إضافة `const { t, language } = useLanguage()` 
3. استبدال كل نص عربي ثابت بـ `t('key')` أو `language === 'ar' ? '...' : '...'`
4. إضافة المفاتيح الجديدة المطلوبة في `LanguageContext.tsx`

### أمثلة التحويل في Reports.tsx:
- `"تقرير الاستبيان"` → `t('reports.title')`
- `getMeanLevel`: تحويل من دالة ثابتة إلى دالة تعتمد على `language`
- `"غير موافق بشدة"` في distribution → `language === 'ar' ? 'غير موافق بشدة' : 'Strongly Disagree'`
- رسائل Toast مثل `"تم الحفظ"` → `t('common.saved')`
- تسميات الفلتر والإحصائيات

## خطة التنفيذ (4 دفعات)

**الدفعة 1**: `LanguageContext.tsx` (إضافة ~300 مفتاح جديد) + `Reports.tsx` + `ReportDashboard.tsx`

**الدفعة 2**: `Complaints.tsx` + `ComplaintsDashboard.tsx` + `ComplaintsStatistics.tsx`

**الدفعة 3**: `SurveyDesigner.tsx` + `TakeSurvey.tsx` + `SurveyAnalytics.tsx` + `SurveyTemplates.tsx` + `SurveyPreview.tsx` + `SurveyDistribution.tsx`

**الدفعة 4**: `Recommendations.tsx` + `Archives.tsx` + `Users.tsx` + `AcademicCalendar.tsx`

## ما لن يتغير
- البيانات من قاعدة البيانات (عناوين الاستبيانات، نصوص التوصيات، أسماء البرامج)
- ملفات PDF/Excel المُصدَّرة
- لا تغيير في قاعدة البيانات

