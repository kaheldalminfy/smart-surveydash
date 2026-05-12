# Fix incomplete Arabic→English translation

## Findings (deep audit)

I scanned every `.tsx` file under `src/` for Arabic characters and cross-referenced with i18n usage (`useLanguage` / `t()`). Result:

**20 files contain hardcoded Arabic text and never call the i18n system.** They will always display Arabic regardless of the language toggle.

### Affected areas

**Reports module (entire UI)**
- `pages/Reports.tsx`
- `components/reports/ReportStatisticsCards.tsx`
- `components/reports/ReportMetadataCard.tsx`
- `components/reports/ReportFilterCard.tsx`
- `components/reports/ReportDeleteDialog.tsx`
- `components/reports/ReportHeader.tsx`
- `components/reports/RecommendationsCard.tsx`
- `components/reports/QuestionsSummaryChart.tsx`
- `components/reports/QuestionAnalysisSection.tsx`

**Complaints sub-components**
- `components/complaints/NewComplaintDialog.tsx`
- `components/complaints/ComplaintStatusDashboard.tsx`
- `components/complaints/ComplaintResolutionDialog.tsx`
- `components/complaints/ComplaintQRSection.tsx`
- `components/complaints/ComplaintFiltersCard.tsx`
- `components/complaints/ComplaintEditDialog.tsx`
- `components/complaints/ComplaintDetailsDialog.tsx`
- `components/complaints/ComplaintClickableStats.tsx`
- `components/complaints/ComplaintCard.tsx`

**Other**
- `components/ProgramComparison.tsx`
- `components/DashboardButton.tsx`

Files with i18n but partial coverage exist too (e.g. some toast messages), but the 20 above are the main visible problems.

## Plan

1. Extend `src/contexts/LanguageContext.tsx` with new translation keys grouped by namespace: `reports.*`, `complaintsUI.*`, `programComparison.*`, `dashboardBtn.*`.
2. For each affected file:
   - Import `useLanguage`
   - Replace every Arabic literal with `t('key')`
   - Keep DB-sourced text (program/course names, user-entered content) unchanged per existing memory rule.
3. Verify by toggling language in preview; spot-check Reports page and Complaints dialogs.

## Scope confirmation

This is a substantial sweep (~200 individual strings across 20 files + ~200 new keys in LanguageContext). I will preserve all logic, only swap presentation strings.
