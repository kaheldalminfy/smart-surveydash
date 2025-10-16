import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (report: any, survey: any, stats: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add Arabic font support
  doc.setLanguage('ar');
  
  // Header
  doc.setFontSize(20);
  doc.text('تقرير الاستبيان', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(survey?.title || 'استبيان', 105, 30, { align: 'center' });
  doc.text(survey?.programs?.name || '', 105, 37, { align: 'center' });
  
  // Stats
  let yPos = 50;
  doc.setFontSize(12);
  doc.text('الإحصائيات الرئيسية:', 20, yPos);
  yPos += 10;
  
  const statsData = [
    ['إجمالي الاستجابات', stats.totalResponses || 0],
    ['معدل الاستجابة', `${stats.responseRate || 0}%`],
    ['المتوسط العام', stats.overallMean?.toFixed(2) || 'N/A'],
    ['الانحراف المعياري', stats.overallStdDev?.toFixed(2) || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['المؤشر', 'القيمة']],
    body: statsData,
    styles: { font: 'helvetica', halign: 'right' },
    headStyles: { fillColor: [66, 139, 202] },
  });

  // Summary
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('الملخص التنفيذي:', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(report.summary || 'لا يوجد ملخص متاح', 170);
  doc.text(summaryLines, 20, yPos);

  // Recommendations
  yPos += summaryLines.length * 5 + 10;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.text('التوصيات:', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  const recommendationLines = doc.splitTextToSize(report.recommendations_text || 'لا توجد توصيات متاحة', 170);
  doc.text(recommendationLines, 20, yPos);

  // Question Stats
  if (stats.questionStats && stats.questionStats.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('تفاصيل الأسئلة:', 20, 20);
    
    const questionData = stats.questionStats.map((q: any) => [
      q.question,
      q.mean?.toFixed(2) || 'N/A',
      q.stdDev?.toFixed(2) || 'N/A',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['السؤال', 'المتوسط', 'الانحراف']],
      body: questionData,
      styles: { font: 'helvetica', halign: 'right', fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: { 0: { cellWidth: 120 } },
    });
  }

  // Save
  doc.save(`تقرير_${survey?.title || 'استبيان'}.pdf`);
};

export const exportToExcel = (report: any, survey: any, stats: any) => {
  const workbook = XLSX.utils.book_new();

  // Overview sheet
  const overviewData = [
    ['تقرير الاستبيان'],
    [''],
    ['عنوان الاستبيان', survey?.title || ''],
    ['البرنامج', survey?.programs?.name || ''],
    [''],
    ['الإحصائيات الرئيسية'],
    ['إجمالي الاستجابات', stats.totalResponses || 0],
    ['معدل الاستجابة', `${stats.responseRate || 0}%`],
    ['المتوسط العام', stats.overallMean?.toFixed(2) || 'N/A'],
    ['الانحراف المعياري', stats.overallStdDev?.toFixed(2) || 'N/A'],
    [''],
    ['الملخص التنفيذي'],
    [report.summary || 'لا يوجد ملخص متاح'],
    [''],
    ['التوصيات'],
    [report.recommendations_text || 'لا توجد توصيات متاحة'],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'نظرة عامة');

  // Question stats sheet
  if (stats.questionStats && stats.questionStats.length > 0) {
    const questionData = [
      ['السؤال', 'المتوسط', 'الانحراف المعياري'],
      ...stats.questionStats.map((q: any) => [
        q.question,
        q.mean?.toFixed(2) || 'N/A',
        q.stdDev?.toFixed(2) || 'N/A',
      ]),
    ];
    
    const questionSheet = XLSX.utils.aoa_to_sheet(questionData);
    XLSX.utils.book_append_sheet(workbook, questionSheet, 'تفاصيل الأسئلة');
  }

  // Likert distribution sheet
  if (stats.likertDistribution && stats.likertDistribution.length > 0) {
    const likertData = [
      ['التصنيف', 'العدد'],
      ...stats.likertDistribution.map((item: any) => [item.label, item.count]),
    ];
    
    const likertSheet = XLSX.utils.aoa_to_sheet(likertData);
    XLSX.utils.book_append_sheet(workbook, likertSheet, 'توزيع ليكرت');
  }

  // Save
  XLSX.writeFile(workbook, `تقرير_${survey?.title || 'استبيان'}.xlsx`);
};
