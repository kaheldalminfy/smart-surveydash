// PDF Export Utilities v2
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadArabicFont } from './arabicFont';

// Types
interface ChartImage {
  id: string;
  dataUrl: string;
  title: string;
  type: 'likert' | 'mcq' | 'summary';
}

interface TextResponse {
  question: string;
  responses: string[];
}

// Colors
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  secondary: [34, 139, 34] as [number, number, number],
  accent: [139, 92, 246] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  lightBg: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const getMeanLevel = (mean: number): { label: string; color: [number, number, number] } => {
  if (mean >= 4.5) return { label: 'ممتاز', color: [22, 163, 74] };
  if (mean >= 3.5) return { label: 'جيد جداً', color: [34, 197, 94] };
  if (mean >= 2.5) return { label: 'متوسط', color: [234, 179, 8] };
  if (mean >= 1.5) return { label: 'ضعيف', color: [249, 115, 22] };
  return { label: 'ضعيف جداً', color: [239, 68, 68] };
};

export const exportToPDF = async (
  report: any,
  survey: any,
  stats: any,
  collegeLogo?: string,
  chartImages?: ChartImage[],
  textResponses?: TextResponse[],
  collegeName: string = 'كلية العلوم الإنسانية والاجتماعية'
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load Arabic font
  let fontLoaded = false;
  try {
    const arabicFontBase64 = await loadArabicFont();
    if (arabicFontBase64 && arabicFontBase64.length > 1000) {
      doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');
      fontLoaded = true;
    }
  } catch (error) {
    console.error('Font loading error:', error);
  }

  doc.setLanguage('ar');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 20;

  // PAGE 1: Cover
  if (collegeLogo) {
    try {
      doc.addImage(collegeLogo, 'PNG', (pageWidth - 40) / 2, yPos, 40, 40);
      yPos += 50;
    } catch (e) {
      console.error('Logo error:', e);
    }
  }

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 45, 4, 4, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.text('تقرير نتائج الاستبيان', pageWidth / 2, yPos + 15, { align: 'center' });
  doc.setFontSize(16);
  doc.text(survey?.title || 'استبيان', pageWidth / 2, yPos + 28, { align: 'center' });
  doc.setFontSize(12);
  doc.text(survey?.programs?.name || '', pageWidth / 2, yPos + 38, { align: 'center' });
  yPos += 55;

  // Semester info
  if (report?.semester || report?.academic_year) {
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 14, 2, 2, 'F');
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    const infoText = [
      report.semester ? `الفصل الدراسي: ${report.semester}` : '',
      report.academic_year ? `العام الأكاديمي: ${report.academic_year}` : ''
    ].filter(Boolean).join('  |  ');
    doc.text(infoText, pageWidth / 2, yPos + 9, { align: 'center' });
    yPos += 20;
  }

  // Statistics section
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(13);
  doc.text('الإحصائيات الرئيسية', pageWidth - margin - 5, yPos + 7, { align: 'right' });
  yPos += 15;

  const statsData = [
    ['إجمالي الاستجابات', String(stats.totalResponses || 0)],
    ['معدل الاستجابة', `${stats.responseRate || 0}%`],
    ['المتوسط العام', stats.overallMean ? Number(stats.overallMean).toFixed(2) + ' من 5.0' : '-'],
    ['التقييم', stats.overallMean ? getMeanLevel(stats.overallMean).label : '-'],
    ['الانحراف المعياري', stats.overallStdDev ? Number(stats.overallStdDev).toFixed(2) : '-'],
    ['عدد الأسئلة', String(stats.questionStats?.length || 0)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['المؤشر', 'القيمة']],
    body: statsData,
    styles: { font: fontLoaded ? 'Amiri' : 'helvetica', halign: 'right', fontSize: 11, cellPadding: 4 },
    headStyles: { fillColor: COLORS.primary, halign: 'center', fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'right', cellWidth: 80 }, 1: { halign: 'center', cellWidth: 70 } },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    margin: { left: margin + 5, right: margin + 5 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Summary
  if (yPos + 60 > pageHeight - 30) { doc.addPage(); yPos = 20; }
  doc.setFillColor(...COLORS.secondary);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(13);
  doc.text('الملخص التنفيذي', pageWidth - margin - 5, yPos + 7, { align: 'right' });
  yPos += 15;

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  const summaryText = report?.summary || 'لا يوجد ملخص تنفيذي متاح.';
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 10);
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryLines.length * 5 + 10, 2, 2, 'F');
  doc.text(summaryLines, pageWidth - margin - 5, yPos + 7, { align: 'right' });
  yPos += summaryLines.length * 5 + 20;

  // Recommendations
  if (yPos + 50 > pageHeight - 30) { doc.addPage(); yPos = 20; }
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(13);
  doc.text('التوصيات', pageWidth - margin - 5, yPos + 7, { align: 'right' });
  yPos += 15;

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  const recText = report?.recommendations_text || 'لا توجد توصيات متاحة.';
  const recLines = doc.splitTextToSize(recText, pageWidth - margin * 2 - 10);
  doc.setFillColor(249, 245, 255);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, recLines.length * 5 + 10, 2, 2, 'F');
  doc.text(recLines, pageWidth - margin - 5, yPos + 7, { align: 'right' });

  // PAGE 2: Charts
  if (chartImages && chartImages.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(13);
    doc.text('الرسوم البيانية', pageWidth - margin - 5, yPos + 7, { align: 'right' });
    yPos += 18;

    for (const chart of chartImages) {
      if (yPos + 90 > pageHeight - 30) { doc.addPage(); yPos = 20; }
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(11);
      doc.text(chart.title, pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      try {
        doc.addImage(chart.dataUrl, 'PNG', margin + 5, yPos, pageWidth - margin * 2 - 10, 70);
        yPos += 85;
      } catch (e) {
        console.error('Chart error:', e);
        yPos += 10;
      }
    }
  }

  // PAGE 3: Question Details
  if (stats.questionStats && stats.questionStats.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(13);
    doc.text('تفاصيل نتائج الأسئلة', pageWidth - margin - 5, yPos + 7, { align: 'right' });
    yPos += 15;

    const questionData = stats.questionStats.map((q: any, i: number) => [
      String(q.responseCount || 0),
      q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
      q.mean ? Number(q.mean).toFixed(2) : '-',
      q.mean ? getMeanLevel(q.mean).label : '-',
      `${i + 1}. ${q.question}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'انحراف', 'متوسط', 'التقييم', 'السؤال']],
      body: questionData,
      styles: { font: fontLoaded ? 'Amiri' : 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary, halign: 'center', fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'right' },
      },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      margin: { left: margin, right: margin },
    });
  }

  // PAGE 4: Text Responses
  if (textResponses && textResponses.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFillColor(...COLORS.secondary);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(13);
    doc.text('الردود النصية المفتوحة', pageWidth - margin - 5, yPos + 7, { align: 'right' });
    yPos += 18;

    for (const item of textResponses) {
      if (yPos + 30 > pageHeight - 30) { doc.addPage(); yPos = 20; }
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(11);
      const qLines = doc.splitTextToSize(item.question, pageWidth - margin * 2 - 5);
      doc.text(qLines, pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += qLines.length * 5 + 5;

      doc.setTextColor(...COLORS.text);
      doc.setFontSize(9);
      const maxResponses = Math.min(item.responses.length, 10);
      for (let i = 0; i < maxResponses; i++) {
        if (yPos + 15 > pageHeight - 30) { doc.addPage(); yPos = 20; }
        const respLines = doc.splitTextToSize(`${i + 1}. ${item.responses[i]}`, pageWidth - margin * 2 - 15);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(margin, yPos - 2, pageWidth - margin * 2, respLines.length * 4 + 6, 1, 1, 'F');
        doc.text(respLines, pageWidth - margin - 5, yPos + 3, { align: 'right' });
        yPos += respLines.length * 4 + 10;
      }
      if (item.responses.length > 10) {
        doc.setTextColor(...COLORS.muted);
        doc.text(`... و${item.responses.length - 10} ردود أخرى`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
      }
      yPos += 10;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`صفحة ${i} من ${totalPages}`, margin, pageHeight - 8);
    doc.text(collegeName, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(new Date().toLocaleDateString('ar-SA'), pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  doc.save(`تقرير_${survey?.title || 'استبيان'}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (report: any, survey: any, stats: any, textResponses?: TextResponse[]) => {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['تقرير الاستبيان'], [''],
    ['العنوان', survey?.title || ''],
    ['البرنامج', survey?.programs?.name || ''],
    ['الفصل الدراسي', report?.semester || ''],
    ['العام الأكاديمي', report?.academic_year || ''],
    [''], ['الإحصائيات'],
    ['إجمالي الاستجابات', stats.totalResponses || 0],
    ['معدل الاستجابة', `${stats.responseRate || 0}%`],
    ['المتوسط العام', stats.overallMean ? Number(stats.overallMean).toFixed(2) : '-'],
    ['الانحراف المعياري', stats.overallStdDev ? Number(stats.overallStdDev).toFixed(2) : '-'],
    [''], ['الملخص التنفيذي'], [report?.summary || ''],
    [''], ['التوصيات'], [report?.recommendations_text || ''],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');

  if (stats.questionStats?.length > 0) {
    const questionsData = [
      ['#', 'السؤال', 'النوع', 'المتوسط', 'الانحراف المعياري', 'عدد الاستجابات', 'التقييم'],
      ...stats.questionStats.map((q: any, i: number) => [
        i + 1, q.question,
        q.type === 'likert' ? 'ليكرت' : q.type === 'mcq' ? 'اختيار متعدد' : q.type === 'rating' ? 'تقييم' : 'نصي',
        q.mean ? Number(q.mean).toFixed(2) : '-',
        q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
        q.responseCount || 0,
        q.mean ? getMeanLevel(q.mean).label : '-',
      ]),
    ];
    const questionsSheet = XLSX.utils.aoa_to_sheet(questionsData);
    questionsSheet['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, questionsSheet, 'الأسئلة');
  }

  if (textResponses?.length) {
    const textData: any[][] = [['السؤال', 'الرد']];
    textResponses.forEach(item => {
      item.responses.forEach((resp, i) => textData.push([i === 0 ? item.question : '', resp]));
      textData.push(['', '']);
    });
    const textSheet = XLSX.utils.aoa_to_sheet(textData);
    textSheet['!cols'] = [{ wch: 50 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, textSheet, 'الردود النصية');
  }

  XLSX.writeFile(wb, `تقرير_${survey?.title || 'استبيان'}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const captureChartAsImage = async (
  elementId: string,
  title: string,
  type: 'likert' | 'mcq' | 'summary' = 'summary'
): Promise<ChartImage | null> => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById(elementId);
    if (!element) return null;

    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true });
    return { id: elementId, dataUrl: canvas.toDataURL('image/png'), title, type };
  } catch (error) {
    console.error('Chart capture error:', error);
    return null;
  }
};

export const captureAllCharts = async (
  chartConfigs: Array<{ id: string; title: string; type: 'likert' | 'mcq' | 'summary' }>
): Promise<ChartImage[]> => {
  const results: ChartImage[] = [];
  for (const config of chartConfigs) {
    const result = await captureChartAsImage(config.id, config.title, config.type);
    if (result) results.push(result);
  }
  return results;
};
