-- إضافة مستخدم تجريبي مع الأدوار المناسبة
-- يجب تشغيل هذا في Supabase SQL Editor

-- إدراج دور coordinator للمستخدم الحالي في جميع البرامج
-- استبدل 'USER_ID_HERE' بـ ID المستخدم الفعلي

-- للحصول على ID المستخدم، يمكن تشغيل:
-- SELECT id, email FROM auth.users;

-- ثم استبدال USER_ID_HERE بالـ ID الصحيح

INSERT INTO public.user_roles (user_id, role, program_id)
SELECT 
    'USER_ID_HERE'::uuid,
    'coordinator'::public.app_role,
    id
FROM public.programs
ON CONFLICT (user_id, role, program_id) DO NOTHING;

-- إضافة دور admin للمستخدم (اختياري)
INSERT INTO public.user_roles (user_id, role, program_id)
VALUES ('USER_ID_HERE'::uuid, 'admin'::public.app_role, NULL)
ON CONFLICT (user_id, role, program_id) DO NOTHING;

-- التحقق من الأدوار المضافة
SELECT 
    ur.role,
    p.name as program_name,
    u.email
FROM public.user_roles ur
LEFT JOIN public.programs p ON p.id = ur.program_id
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.user_id = 'USER_ID_HERE'::uuid;
