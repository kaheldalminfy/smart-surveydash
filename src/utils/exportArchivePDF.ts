// Archive PDF Export — generates a comprehensive period closure report
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadEmbeddedArabicFont } from './embeddedArabicFont';

interface ArchiveItem {
  id: string;
  title?: string;
  data_type: string;
  status?: string;
  semester: string;
  academic_year: string;
  archived_at: string;
  closing_notes?: string;
  kpis_snapshot?: any;
  data?: any;
  programs?: { name: string };
  profiles?: { full_name: string };
}

const C = {
  primary: [0, 51, 102] as [number, number, number],
  accent: [0, 112, 192] as [number, number, number],
  red: [207, 32, 46] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  light: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
};

const fmtNum = (v: any) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
};

const KPI_LABELS_AR: Record<string, string> = {
  surveys_count: 'عدد الاستبيانات',
  responses_count: 'عدد الاستجابات',
  complaints_count: 'عدد الشكاوى',
  complaints_resolved: 'الشكاوى المحلولة',
  complaints_resolution_rate: 'نسبة حل الشكاوى',
  reports_count: 'عدد التقارير',
  recommendations_count: 'عدد التوصيات',
  avg_likert: 'متوسط ليكرت',
  avg_compliance_percentage: 'متوسط الامتثال %',
};

export async function exportArchivePDF(item: ArchiveItem): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Load Arabic font
  let hasArabic = false;
  try {
    const b64 = await loadEmbeddedArabicFont();
    if (b64) {
      doc.addFileToVFS('Amiri-Regular.ttf', b64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      hasArabic = true;
    }
  } catch (e) {
    console.warn('Arabic font unavailable, using default font.', e);
  }
  const setFont = (size = 11, bold = false) => {
    if (hasArabic) doc.setFont('Amiri', 'normal');
    else doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
  };

  // === Cover Page ===
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, 70, 'F');
  doc.setFillColor(...C.red);
  doc.rect(0, 70, pageW, 4, 'F');

  doc.setTextColor(...C.white);
  setFont(22, true);
  doc.text('تقرير إغلاق فترة أكاديمية', pageW / 2, 30, { align: 'center' });
  setFont(14);
  doc.text('Period Closure Archive Report', pageW / 2, 42, { align: 'center' });

  doc.setTextColor(...C.text);
  setFont(16, true);
  const programLabel = item.programs?.name || 'College Level';
  doc.text(programLabel, pageW / 2, 95, { align: 'center' });

  setFont(13);
  doc.text(`${item.semester} — ${item.academic_year}`, pageW / 2, 108, { align: 'center' });

  if (item.title) {
    setFont(11);
    doc.setTextColor(...C.muted);
    doc.text(item.title, pageW / 2, 120, { align: 'center', maxWidth: pageW - 30 });
  }

  // Status badge
  const statusLabel = item.status === 'frozen' ? 'مجمّد' : item.status === 'published' ? 'منشور' : 'مسودة';
  const badgeColor = item.status === 'frozen' ? C.accent : item.status === 'published' ? C.green : C.muted;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(pageW / 2 - 25, 130, 50, 10, 2, 2, 'F');
  doc.setTextColor(...C.white);
  setFont(11, true);
  doc.text(statusLabel, pageW / 2, 137, { align: 'center' });

  // Footer info on cover
  doc.setTextColor(...C.muted);
  setFont(10);
  const archivedOn = new Date(item.archived_at).toLocaleDateString('ar-SA');
  doc.text(`تاريخ الأرشفة: ${archivedOn}`, pageW / 2, pageH - 25, { align: 'center' });
  if (item.profiles?.full_name) {
    doc.text(`أرشفه: ${item.profiles.full_name}`, pageW / 2, pageH - 18, { align: 'center' });
  }

  // === KPIs Page ===
  doc.addPage();
  let y = 20;
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(...C.white);
  setFont(13, true);
  doc.text('المؤشرات الرئيسية للفترة', pageW - 12, 9, { align: 'right' });

  y = 25;
  doc.setTextColor(...C.text);
  const kpis = item.kpis_snapshot || {};
  const kpiRows = Object.entries(kpis).map(([k, v]) => [
    KPI_LABELS_AR[k] || k,
    fmtNum(v),
  ]);
  if (kpiRows.length === 0) kpiRows.push(['—', 'لا توجد مؤشرات']);

  autoTable(doc, {
    startY: y,
    head: [['المؤشر', 'القيمة']],
    body: kpiRows,
    theme: 'grid',
    styles: { font: hasArabic ? 'Amiri' : 'helvetica', fontSize: 11, halign: 'right', cellPadding: 3 },
    headStyles: { fillColor: C.primary, textColor: C.white, halign: 'right' },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 70, halign: 'center' } },
    margin: { left: 15, right: 15 },
  });

  // === Closing Notes ===
  if (item.closing_notes) {
    y = (doc as any).lastAutoTable.finalY + 12;
    if (y > pageH - 40) { doc.addPage(); y = 20; }
    setFont(13, true);
    doc.setTextColor(...C.primary);
    doc.text('ملاحظات ختامية', pageW - 15, y, { align: 'right' });
    y += 7;
    doc.setDrawColor(...C.accent);
    doc.line(pageW - 15, y, 15, y);
    y += 6;
    setFont(11);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(item.closing_notes, pageW - 30);
    doc.text(lines, pageW - 15, y, { align: 'right' });
  }

  // === Snapshot summary tables ===
  const snap = item.data || {};

  const summarySection = (title: string, rows: any[][], head: string[]) => {
    if (!rows.length) return;
    doc.addPage();
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(...C.white);
    setFont(13, true);
    doc.text(title, pageW - 12, 9, { align: 'right' });

    autoTable(doc, {
      startY: 22,
      head: [head],
      body: rows,
      theme: 'striped',
      styles: { font: hasArabic ? 'Amiri' : 'helvetica', fontSize: 9, halign: 'right', cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: C.accent, textColor: C.white, halign: 'right' },
      margin: { left: 12, right: 12 },
    });
  };

  // Surveys
  const surveys = snap.surveys || [];
  summarySection(
    `الاستبيانات (${surveys.length})`,
    surveys.map((s: any) => [
      s.title || '—',
      s.status || '—',
      String((s.questions || []).length),
      s.target_enrollment ?? '—',
    ]),
    ['العنوان', 'الحالة', 'عدد الأسئلة', 'العدد المستهدف'],
  );

  // Complaints
  const complaints = snap.complaints || [];
  summarySection(
    `الشكاوى (${complaints.length})`,
    complaints.map((c: any) => [
      c.subject || '—',
      c.type || '—',
      c.status || '—',
      new Date(c.created_at).toLocaleDateString('ar-SA'),
    ]),
    ['الموضوع', 'النوع', 'الحالة', 'التاريخ'],
  );

  // Recommendations
  const recs = snap.recommendations || [];
  summarySection(
    `التوصيات (${recs.length})`,
    recs.map((r: any) => [
      r.title || '—',
      r.priority || '—',
      r.status || '—',
    ]),
    ['التوصية', 'الأولوية', 'الحالة'],
  );

  // Indicator responses
  const inds = snap.indicator_responses || [];
  summarySection(
    `استجابات المؤشرات (${inds.length})`,
    inds.map((i: any) => [
      i.compliance_level || '—',
      `${i.compliance_percentage ?? 0}%`,
      i.status || '—',
    ]),
    ['مستوى الامتثال', 'النسبة', 'الحالة'],
  );

  // Footer page numbers
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setTextColor(...C.muted);
    setFont(9);
    doc.text(`${i} / ${total}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  return doc.output('blob');
}

export async function downloadArchivePDF(item: ArchiveItem) {
  const blob = await exportArchivePDF(item);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (item.programs?.name || 'archive').replace(/[^\w\u0600-\u06FF\-]+/g, '_');
  a.download = `${safeName}_${item.academic_year}_${item.semester}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
