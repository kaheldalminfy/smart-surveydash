

## الخطة: عرض التوصيات اليدوية في لوحة التحكم مع إمكانية الإضافة والتعديل

### المشكلة الحالية
لوحة التحكم تعرض التوصيات من حقل `recommendations_text` في جدول `reports` (توصيات AI ويدوية مختلطة). المطلوب:
1. عرض التوصيات من جدول `recommendations` (المدخلة يدوياً أو المنقولة من التقارير)
2. إمكانية إضافة توصية جديدة يدوياً من لوحة التحكم
3. إمكانية تعديل التوصيات الموجودة

### التعديلات المطلوبة

**1. `src/components/dashboard/RoleBasedDashboard.tsx`**
- تعديل واجهة `RecommendationDetail` لتعكس بنية جدول `recommendations`:
```text
{
  id: string
  title: string
  description: string
  status: string
  priority: string
  semester: string | null
  academic_year: string | null
  program_id: string | null
}
```
- تعديل دالة `loadProgramStats` لجلب البيانات من جدول `recommendations` بدلاً من `reports`:
```text
supabase.from('recommendations').select('*').eq('program_id', program.id).order('created_at', { ascending: false })
```
- حذف كود جلب التوصيات القديم (الأسطر 279-301) واستبداله بالاستعلام الجديد

**2. `src/components/dashboard/ProgramSection.tsx`**
- تحديث جدول التوصيات ليعرض أعمدة: **العنوان، الوصف، الحالة، الأولوية**
- إضافة زر **"إضافة توصية"** بجانب عنوان قسم التوصيات (يظهر فقط للمنسقين والمديرين)
- إضافة Dialog لإضافة توصية جديدة تتضمن حقول: العنوان، الوصف، الأولوية
- تعديل Dialog التعديل الحالي ليعمل مع جدول `recommendations` بدلاً من `reports`
- عند الإضافة: إدراج السجل في جدول `recommendations` مع:
  - `program_id`: من البرنامج الحالي
  - `source_type`: `'manual'`
  - `status`: `'pending'`
- عند التعديل: تحديث حقول `title`، `description`، `priority` في جدول `recommendations`
- تحديث `handleSaveRecommendation` ليستخدم `supabase.from('recommendations').update(...)` بدلاً من `reports`
- إضافة Badge للحالة (قيد الانتظار / قيد التنفيذ / مكتملة) وBadge للأولوية (عالية / متوسطة / منخفضة)
- إظهار التوصيات حتى لو كانت القائمة فارغة (مع زر الإضافة)

### تفاصيل تقنية

**أعمدة الجدول المحدّث:**

| العنوان | الوصف | الحالة | الأولوية | تعديل |

**بنية Dialog الإضافة:**
- حقل نصي: العنوان
- حقل نصي كبير: الوصف
- قائمة منسدلة: الأولوية (عالية / متوسطة / منخفضة)

**بنية Dialog التعديل:**
- نفس حقول الإضافة مع تعبئتها بالبيانات الحالية

### ما لن يتغير
- لا تغيير في قاعدة البيانات أو RLS أو المسارات
- لا تغيير في صفحة التقارير أو صفحة التوصيات (`/recommendations`)
- لا ميزات جديدة خارج نطاق المطلوب

