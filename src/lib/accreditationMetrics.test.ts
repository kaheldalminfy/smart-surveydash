import { describe, expect, it } from 'vitest';
import { scopeMetrics, scopeRows, type Dataset } from './accreditationReport';
const data: Dataset = {
 standards: [{ id: 's', code: 'S1', name: 'Standard' }],
 indicators: [{ id: 'i1', standard_id: 's', code: '1', name: 'One', required_evidence: ['Policy','Minutes'] }, { id: 'i2', standard_id: 's', code: '2', name: 'Two', required_evidence: [] }],
 assessments: [{ id: 'r1', indicator_id: 'i1', program_id: 'p1', academic_year: '2026-2027', status: 'reviewed', compliance_percentage: 80 }, { id: 'r2', indicator_id: 'i1', program_id: null, academic_year: '2026-2027', status: 'approved', compliance_percentage: 100 }],
 evidence: [{ id: 'e', response_id: 'r1', title: 'Policy', file_url: 'private/path' }], actions: [{ id: 'a', accreditation_indicator_id: 'i1', program_id: 'p1', academic_year: '2026-2027', title: 'Action', description: '', status: 'completed', responsible_person: null, due_date: null, evidence_notes: null }],
};
describe('accreditation reporting rules', () => {
 it('keeps each program independent', () => { expect(scopeMetrics(data, 'p1').compliance).toBe(40); expect(scopeMetrics(data, 'p2').compliance).toBe(0); });
 it('evaluates institutional data once at college scope', () => { expect(scopeRows(data, null)[0].compliance).toBe(100); expect(scopeRows(data, 'p1')[0].compliance).toBe(80); });
 it('counts missing unassessed indicators as zero', () => { expect(scopeMetrics(data, 'p1').assessed).toBe(1); expect(scopeMetrics(data, 'p1').standards[0].compliance).toBe(40); });
 it('requires two attachments for two declared evidence requirements', () => { expect(scopeRows(data, 'p1')[0].missing).toBe(1); expect(scopeMetrics(data, 'p1').evidenceCoverage).toBe(33); });
 it('creates improvement candidates for every incomplete indicator', () => { expect(scopeRows(data, 'p1').filter(r => r.needsImprovement).map(r => r.indicator.id)).toEqual(['i1','i2']); });
 it('counts only completed tracked actions in plan progress', () => { expect(scopeMetrics(data, 'p1').planProgress).toBe(100); expect(scopeMetrics(data, 'p2').planProgress).toBeNull(); });
 it('does not invent scores for empty standards or plans', () => { expect(scopeMetrics({ standards: data.standards, indicators: [], assessments: [], evidence: [], actions: [] }, null).compliance).toBeNull(); });
});
