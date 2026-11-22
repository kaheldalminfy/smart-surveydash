export type Standard = { id: string; code: string; name: string };
export type Indicator = { id: string; standard_id: string; code: string; name: string; required_evidence: unknown; responsible_party?: string | null };
export type Assessment = { id: string; indicator_id: string; program_id: string | null; academic_year: string | null; compliance_percentage: number | null; status: string | null; responsible_person?: string | null; due_date?: string | null; follow_up_notes?: string | null; gaps?: unknown };
export type Evidence = { id: string; response_id: string; title: string; file_url: string | null };
export type Action = { id: string; accreditation_indicator_id: string | null; program_id: string | null; academic_year: string | null; title: string; description: string; status: string | null; responsible_person: string | null; due_date: string | null; evidence_notes: string | null };
export type Dataset = { standards: Standard[]; indicators: Indicator[]; assessments: Assessment[]; evidence: Evidence[]; actions: Action[] };
export function evidenceRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
    if (item && typeof item === 'object') {
      const v = item as Record<string, unknown>;
      const title = v.title ?? v.name ?? v.description;
      return typeof title === 'string' && title.trim() ? [title.trim()] : [];
    }
    return [];
  });
}
export function scopeRows(data: Dataset, programId: string | null) {
  return data.indicators.map(indicator => {
    const assessment = data.assessments.find(r => r.indicator_id === indicator.id && r.program_id === programId);
    const evidence = data.evidence.filter(e => e.response_id === assessment?.id && Boolean(e.file_url));
    const requirements = evidenceRequirements(indicator.required_evidence);
    // One supporting attachment is the minimum when no explicit list is configured.
    const expected = Math.max(1, requirements.length);
    const missing = Math.max(0, expected - evidence.length);
    const value = assessment?.compliance_percentage;
    const compliance = typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    const action = data.actions.find(a => a.accreditation_indicator_id === indicator.id && a.program_id === programId);
    return { indicator, assessment, evidence, requirements, expected, missing, compliance, action, needsImprovement: compliance < 100 || missing > 0 };
  });
}
export type ReportRow = ReturnType<typeof scopeRows>[number];
export function scopeMetrics(data: Dataset, programId: string | null) {
  const rows = scopeRows(data, programId);
  const mean = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const expected = rows.reduce((sum, r) => sum + r.expected, 0);
  const attached = rows.reduce((sum, r) => sum + Math.min(r.expected, r.evidence.length), 0);
  const actions = data.actions.filter(a => a.program_id === programId);
  return {
    rows, compliance: mean(rows.map(r => r.compliance)), assessed: rows.filter(r => r.assessment?.compliance_percentage != null).length,
    missing: expected - attached, evidenceCoverage: expected ? Math.round(attached / expected * 100) : null,
    actionCount: actions.length, completedActions: actions.filter(a => a.status === 'completed').length,
    planProgress: actions.length ? Math.round(actions.filter(a => a.status === 'completed').length / actions.length * 100) : null,
    standards: data.standards.map(s => ({ ...s, compliance: mean(rows.filter(r => r.indicator.standard_id === s.id).map(r => r.compliance)) })),
  };
}
