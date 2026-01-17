import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadArabicFont } from './arabicFont';

export const exportToPDF = async (report: any, survey: any, stats: any, logoUrl?: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load Arabic font
  try {
    const arabicFontBase64 = await loadArabicFont();
    if (arabicFontBase64 && arabicFontBase64.length > 1000) {
      doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');
    }
  } catch (error) {
    console.error('Error loading font:', error);
  }

  doc.setLanguage('ar');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Logo
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', (pageWidth - 35) / 2, yPos, 35, 35);
      yPos += 45;
    } catch (e) { console.error(e); }
  }

  // Header
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('تقرير الاستبيان', pageWidth / 2, yPos + 12, { align: 'center' });
  doc.setFontSize(14);
  doc.text(survey?.title || '', pageWidth / 2, yPos + 22, { align: 'center' });
  doc.setFontSize(11);
  doc.text(survey?.programs?.name || '', pageWidth / 2, yPos + 30, { align: 'center' });
  yPos += 45;

  // Info
  if (report?.semester || report?.academic_year) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(11);
    const info = [report.semester ? `الفصل: ${report.semester}` : '', report.academic_year ? `العام: ${report.academic_year}` : ''].filter(Boolean).join(' | ');
    doc.text(info, pageWidth / 2, yPos + 8, { align: 'center' });
    yPos += 18;
  }

  doc.setTextColor(0, 0, 0);

  // Stats table
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('الإحصائيات الرئيسية', pageWidth - 20, yPos + 7);
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  autoTable(doc, {
    startY: yPos,
    head: [['المؤشر', 'القيمة']],
    body: [
      ['إجمالي الاستجابات', String(stats.totalResponses || 0)],
      ['معدل الاستجابة', `${stats.responseRate || 0}%`],
      ['المتوسط العام', stats.overallMean ? Number(stats.overallMean).toFixed(2) : '-'],
      ['الانحراف المعياري', stats.overallStdDev ? Number(stats.overallStdDev).toFixed(2) : '-'],
    ],
    styles: { font: 'Amiri', halign: 'right', fontSize: 11 },
    headStyles: { fillColor: [37, 99, 235], halign: 'center' },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Summary
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('الملخص التنفيذي', pageWidth - 20, yPos + 7);
  yPos += 15;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(report.summary || 'لا يوجد ملخص', pageWidth - 50);
  doc.text(summaryLines, pageWidth - 25, yPos);
  yPos += summaryLines.length * 6 + 15;

  // Recommendations
  doc.setFillColor(34, 139, 34);
  doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('التوصيات', pageWidth - 20, yPos + 7);
  yPos += 15;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  const recLines = doc.splitTextToSize(report.recommendations_text || 'لا توجد توصيات', pageWidth - 50);
  doc.text(recLines, pageWidth - 25, yPos);

  // Question table on new page
  if (stats.questionStats?.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text('تفاصيل الأسئلة', pageWidth - 20, yPos + 7);
    yPos += 15;

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'المتوسط', 'الانحراف', 'السؤال']],
      body: stats.questionStats.map((q: any, i: number) => [
        String(q.responseCount || 0),
        q.mean ? Number(q.mean).toFixed(2) : '-',
        q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
        `${i + 1}. ${q.question}`,
      ]),
      styles: { font: 'Amiri', fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235], halign: 'center' },
      columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right' } },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`صفحة ${i} من ${pages}`, 15, pageHeight - 8);
    doc.text(`تاريخ: ${new Date().toLocaleDateString('ar-SA')}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  }

  doc.save(`تقرير_${survey?.title || 'استبيان'}.pdf`);
};

export const exportToExcel = (report: any, survey: any, stats: any) => {
  const wb = XLSX.utils.book_new();
  const data = [
    ['تقرير الاستبيان'], [''], ['العنوان', survey?.title], ['البرنامج', survey?.programs?.name],
    [''], ['إجمالي الاستجابات', stats.totalResponses], ['المتوسط العام', stats.overallMean?.toFixed(2)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'التقرير');
  XLSX.writeFile(wb, `تقرير_${survey?.title || 'استبيان'}.xlsx`);
};
