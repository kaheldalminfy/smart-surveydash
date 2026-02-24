

# إضافة صلاحية تعديل التوصيات في التقارير

## المشكلة
جدول `reports` لا يحتوي على سياسة UPDATE، مما يمنع الجميع من حفظ أو تعديل التوصيات.

## الحل

### 1. إضافة سياسة UPDATE على جدول reports (migration واحد فقط)

سياسة RLS تسمح لمدير النظام (admin) والمنسقين (coordinator) فقط بتعديل التقارير:

- مدير النظام: يستطيع تعديل توصيات أي تقرير
- المنسق: يستطيع تعديل توصيات تقارير برنامجه فقط
- باقي الأدوار (مدير البرنامج / العميد / أعضاء هيئة التدريس): عرض فقط، لا يستطيعون التعديل

### 2. لا تغيير في الكود ولا في البيانات

الكود الحالي في `src/pages/Reports.tsx` يستخدم بالفعل `upsert` لحفظ التوصيات وسيعمل تلقائيا بمجرد إضافة السياسة. لن يتم تعديل أي بيانات أو هيكل جداول - فقط إضافة سياسة أمان جديدة.

## التفاصيل التقنية

| التغيير | التفاصيل |
|---------|----------|
| Migration SQL | `CREATE POLICY "Coordinators and admins can update reports" ON public.reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM surveys WHERE surveys.id = reports.survey_id AND (has_role_in_program(auth.uid(), 'coordinator', surveys.program_id) OR has_role(auth.uid(), 'admin'))))` |
| ملفات الكود | لا تعديل |
| البيانات | لا تعديل |

