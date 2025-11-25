-- الخطوة 1: إضافة دور مدير البرنامج الجديد فقط
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'program_manager';