

## Plan: Update Label Text in Report Filter

**What**: Change the label "العدد الفعلي للطلاب في المقرر" to "أدخل عدد المسجلين" in the report filter section.

### Changes

**1. `src/components/reports/ReportFilterCard.tsx` (line 122)**
- Change: `العدد الفعلي للطلاب في المقرر` → `أدخل عدد المسجلين`

**2. `src/contexts/LanguageContext.tsx` (line 728)**
- Update the translation key `reports.actualStudents` from `العدد الفعلي للطلاب في المقرر` to `أدخل عدد المسجلين`

No UI layout, database, schema, or behavior changes. Text-only update.

