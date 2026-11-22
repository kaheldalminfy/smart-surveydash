import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import writeXlsxFile, { type SheetData } from 'write-excel-file/browser';
import { loadEmbeddedArabicFont } from './embeddedArabicFont';
import { scopeMetrics, type Dataset } from '@/lib/accreditationReport';
import { accreditationLabels } from '@/lib/accreditationLabels';
export type AccreditationAnalysis = { summary: string; recommendations: string[] };
export type AccreditationExport = { framework: string; year: string; language: string; scopes: { id: string | null; name: string }[]; data: Dataset; analysis: AccreditationAnalysis | null };
function tables(input: AccreditationExport) {
 const L = accreditationLabels(input.language);
 const status = (s: string | null) => s && s in L ? L[s as keyof typeof L] : s ?? L.pending;
 const details = input.scopes.flatMap(p => scopeMetrics(input.data,p.id).rows.map(r => [p.name, r.indicator.code, r.indicator.name, `${r.compliance}%`, r.assessment?.status ?? L.unassessed, String(r.missing), (r.requirements.length ? r.requirements : [L.supporting]).join('\n'), r.evidence.map(e => e.title).join('\n') || '—', Array.isArray(r.assessment?.gaps) ? r.assessment.gaps.filter(g => typeof g === 'string').join('\n') : '—']));
 const plans = input.scopes.flatMap(p => input.data.actions.filter(a => a.program_id === p.id).map(a => [p.name, input.data.indicators.find(i => i.id === a.accreditation_indicator_id)?.code ?? '—', a.title, a.description, a.responsible_person ?? '—', a.due_date?.slice(0,10) ?? '—', a.evidence_notes ?? '—', status(a.status)]));
 const summary = input.scopes.map(p => { const m = scopeMetrics(input.data,p.id); return [p.name, `${m.compliance ?? '—'}%`, `${m.assessed}/${input.data.indicators.length}`, `${m.evidenceCoverage ?? '—'}%`, String(m.missing), `${m.completedActions}/${m.actionCount}`]; });
 return [
  { title: L.report, head: [L.program,L.compliance,L.assessed,L.evidence,L.missing,L.progress], rows: summary },
  { title: L.gaps, head: [L.program,L.indicator,L.title,L.compliance,L.status,L.missing,L.requirements,L.attachments,L.gaps], rows: details },
  { title: L.plans, head: [L.program,L.indicator,L.title,L.action,L.owner,L.due,L.evidenceNotes,L.status], rows: plans },
  { title: L.summary, head: [L.summary,L.proposals], rows: [[input.analysis?.summary ?? '—', input.analysis?.recommendations.join('\n') ?? '—'],[L.zeroNote,L.countNote]] },
 ];
}
const filename = (input: AccreditationExport) => `accreditation_${input.framework.replace(/[\\/:*?"<>|]/g,'_').slice(0,50)}_${input.year}`;
export async function exportAccreditationExcel(input: AccreditationExport) {
 const sheets = tables(input).map(t => ({ sheet: t.title.slice(0,31), data: [t.head.map(h => ({ value: h, fontWeight: 'bold' as const })), ...t.rows.map(r => r.map(v => ({ value: v, wrap: true })))] as SheetData, columns: t.head.map(() => ({ width: 28 })), rightToLeft: input.language === 'ar', stickyRowsCount: 1 }));
 await writeXlsxFile(sheets,{ fontFamily: 'Arial', fontSize: 11 }).toFile(`${filename(input)}.xlsx`);
}
export async function exportAccreditationPDF(input: AccreditationExport) {
 const doc = new jsPDF({ orientation: 'landscape' });
 const font = await loadEmbeddedArabicFont();
 if (!font) throw new Error('Arabic font unavailable');
 doc.addFileToVFS('Amiri-Regular.ttf',font); doc.addFont('Amiri-Regular.ttf','Amiri','normal'); doc.setFont('Amiri');
 const L = accreditationLabels(input.language);
 doc.setFontSize(18); doc.text(`${L.report} — ${input.framework}`,285,14,{ align: 'right' });
 doc.setFontSize(11); doc.text(`${L.year}: ${input.year}`,285,23,{ align: 'right' });
 const sections = tables(input);
 sections.forEach((t,index) => {
  if (index) doc.addPage();
  doc.setFontSize(14); if(index) doc.text(t.title,285,14,{ align:'right' });
  autoTable(doc,{ startY: index ? 22 : 30, head: [input.language === 'ar' ? [...t.head].reverse() : t.head], body: t.rows.map(r => input.language === 'ar' ? [...r].reverse() : r), styles: { font:'Amiri',fontStyle:'normal',fontSize:9,cellPadding:3,overflow:'linebreak',halign:input.language === 'ar' ? 'right' : 'left' }, headStyles:{ fontStyle:'normal' }, margin:{left:12,right:12}, theme:'grid' });
 });
 doc.save(`${filename(input)}.pdf`);
}
