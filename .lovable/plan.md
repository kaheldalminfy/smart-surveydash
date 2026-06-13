## السبب الجذري المؤكد
- عند دخولك كـ admin، لوحة التحكم وكثير من الصفحات تعرض مكونات صُممت أصلًا بمفاتيح `t()` فتترجم بشكل صحيح.
- عند دخول منسق/مشرف، يتم عرض `RoleBasedDashboard.tsx` و `ProgramSection.tsx` ومكونات أخرى تحتوي **مئات النصوص العربية مكتوبة مباشرة في الكود** (وليس عبر `t()`)، لذلك تبقى عربية حتى لو اخترت الإنجليزية.
- لا توجد مشكلة في تحميل الدور (`ProtectedRoute` يحمّل الأدوار بشكل صحيح). المشكلة كلها في النصوص الـ hardcoded.

## ترتيب الأولويات حسب أثر المستخدم
سأبدأ بالملفات التي يراها المنسق/المشرف يوميًا، ثم أنتقل للباقي.

### المرحلة 1 — لوحة المنسق/المشرف (الأهم)
1. `src/components/dashboard/RoleBasedDashboard.tsx`
2. `src/components/dashboard/ProgramSection.tsx`
3. `src/pages/Dashboard.tsx` (النصوص المتبقية)
4. `src/components/ai/ProgramRiskPanel.tsx`
5. `src/components/ai/AICopilotWidget.tsx`

### المرحلة 2 — الصفحات الأساسية المشتركة
6. `src/pages/Surveys.tsx`
7. `src/pages/Complaints.tsx` + `src/components/complaints/ComplaintStatusDashboard.tsx`
8. `src/pages/Reports.tsx`
9. `src/pages/Archives.tsx` + `src/components/archives/ArchiveCreateWizard.tsx`
10. `src/pages/Index.tsx` (صفحة الهبوط)

### المرحلة 3 — الاعتماد الأكاديمي
11. `src/pages/Accreditation.tsx`, `AccreditationFramework.tsx`, `IndicatorDetails.tsx`
12. كل ملفات `src/components/accreditation/*`

### المرحلة 4 — مصمم الاستبيان والصفحات المتبقية
13. `src/pages/SurveyDesigner.tsx`, `TakeSurvey.tsx`, `SubmitComplaint.tsx`
14. `src/components/survey-designer/*`
15. `BackupExport.tsx`, `Users.tsx`, `Auth.tsx`, `SystemSettings.tsx`, `AcademicCalendar.tsx`, `Unsubscribe.tsx`

## أسلوب التنفيذ
لكل ملف:
1. استخراج كل نص مرئي للمستخدم.
2. إضافة المفاتيح في `LanguageContext.tsx` بالعربية والإنجليزية معًا (لا أُضيف مفتاحًا في جهة دون الأخرى).
3. استبدال النصوص بـ `t('namespace.key')`.
4. الحفاظ على بيانات قاعدة البيانات بلغتها الأصلية كما هو متفق عليه في الذاكرة.

سأضيف أيضًا في `t()` تحذير console عند طلب مفتاح غير موجود حتى نلتقط أي ثغرة مستقبلية فورًا.

## الاختبار قبل أن أقول "تم"
بعد كل مرحلة:
1. أفتح المعاينة عبر أداة المتصفح.
2. أسجل الدخول بحساب admin (للتأكد أن شيئًا لم يكسر).
3. ثم بحساب coordinator وحساب program_manager.
4. أزور كل route تخص المرحلة، أبدّل اللغة عربي → إنجليزي → عربي.
5. أتحقق من:
   - عدم بقاء أي نص عربي في الواجهة الإنجليزية.
   - عدم ظهور مفاتيح خام مثل `dashboard.title`.
   - عدم وجود أخطاء في console.
6. ألتقط لقطات شاشة سريعة للأدلة عند الحاجة.
7. أقدّم لك في نهاية كل مرحلة جدولًا واضحًا: شاشة / دور / النتيجة.

## معيار النجاح
- صفر نصوص عربية مكتوبة مباشرة في الملفات المذكورة أعلاه.
- مفاتيح `ar` و `en` متطابقة 100%.
- تجربة فعلية ناجحة بدورَي coordinator و program_manager على كل route، عربي وإنجليزي.

## ملاحظة صريحة بشأن الحسابات للاختبار
لاختبار أدوار المنسق والمشرف فعليًا، أحتاج إما:
- بيانات دخول حساب موجود بدور coordinator وآخر بدور program_manager، أو
- إذنك بإنشاء حسابين تجريبيين مؤقتين بهذين الدورين عبر edge function الموجودة لإدارة المستخدمين.

بدون أحدهما لن أتمكن من الاختبار الحقيقي ولن أعلن "تم".

## حجم العمل
العدد الكلي للملفات المتأثرة كبير (≈ 30 ملفًا) وبعضها يحتوي مئات النصوص. لذا التنفيذ سيكون على عدة جولات متتالية، وسأبلّغك بانتهاء كل مرحلة مع نتائج اختبارها قبل الانتقال للتالية.