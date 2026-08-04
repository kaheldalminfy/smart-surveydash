// Export recommendations of a given academic year to Excel / PDF
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import writeXlsxFile, { type SheetData } from 'write-excel-file/browser';
import { loadEmbeddedArabicFont } from './embeddedArabicFont';

export interface ExportRecommendationItem {
  title: string;
  description: string;
  course_name: string | null;
  program_name: string;
  academic_year: string | null;
  semester: string | null;
  status: string | null;
  priority: string | null;
  kind: 'manual' | 'report';
}

export interface ExportLabels {
  isArabic: boolean;
  documentTitle: string;
  year: string;
  program: string;
  semester: string;
  course: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  source: string;
  notTracked: string;
  none: string;
  semesterLabel: (s: string | null) => string;
  statusLabel: (s: string | null) => string;
  priorityLabel: (p: string | null) => string;
  sourceLabel: (k: 'manual' | 'report') => string;
}

const safeName = (v: string) => v.replace(/[\\/:*?"<>|]/g, '_').substring(0, 60);

const toRows = (items: ExportRecommendationItem[], L: ExportLabels) =>
  items.map((i) => [
    i.program_name || '—',
    L.semesterLabel(i.semester),
    i.course_name || L.none,
    i.title || '—',
    i.description || '—',
    L.priorityLabel(i.priority),
    i.status ? L.statusLabel(i.status) : L.notTracked,
    L.sourceLabel(i.kind),
  ]);

const headers = (L: ExportLabels) => [
  L.program,
  L.semester,
  L.course,
  L.title,
  L.description,
  L.priority,
  L.status,
  L.source,
];

export async function exportRecommendationsExcel(
  year: string,
  items: ExportRecommendationItem[],
  L: ExportLabels
) {
  const data: SheetData = [
    headers(L).map((h) => ({ value: h, fontWeight: 'bold' as const })),
    ...toRows(items, L).map((r) => r.map((c) => ({ value: c }))),
  ];

  await writeXlsxFile(
    [
      {
        data,
        sheet: safeName(`${L.year} ${year || '-'}`) || 'Recommendations',
        columns: [
          { width: 28 },
          { width: 14 },
          { width: 28 },
          { width: 34 },
          { width: 70 },
          { width: 12 },
          { width: 16 },
          { width: 14 },
        ],
        rightToLeft: L.isArabic,
        stickyRowsCount: 1,
      },
    ],
    { fontFamily: 'Arial', fontSize: 11 }
  ).toFile(`${safeName(L.documentTitle)}_${year || 'all'}.xlsx`);
}

export async function exportRecommendationsPDF(
  year: string,
  items: ExportRecommendationItem[],
  L: ExportLabels
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

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
  const fontName = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'normal');
  doc.setFontSize(15);
  doc.text(L.documentTitle, pageW / 2, 10, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${L.year}: ${year || '—'}`, pageW / 2, 17, { align: 'center' });

  const completed = items.filter((i) => i.status === 'completed').length;
  const rate = items.length ? Math.round((completed / items.length) * 100) : 0;
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(10);
  doc.text(
    `${items.length} • ${rate}%`,
    L.isArabic ? pageW - 12 : 12,
    29,
    { align: L.isArabic ? 'right' : 'left' }
  );

  autoTable(doc, {
    startY: 34,
    head: [headers(L)],
    body: toRows(items, L),
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 8.5,
      cellPadding: 2,
      halign: L.isArabic ? 'right' : 'left',
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: { fillColor: [0, 112, 192], textColor: [255, 255, 255], font: fontName },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 20 },
      2: { cellWidth: 34 },
      3: { cellWidth: 40 },
      4: { cellWidth: 78 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
      7: { cellWidth: 20 },
    },
    margin: { left: 8, right: 8 },
  });

  doc.save(`${safeName(L.documentTitle)}_${year || 'all'}.pdf`);
}
