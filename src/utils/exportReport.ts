import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadArabicFont } from './arabicFont';

export const exportToPDF = async (report: any, survey: any, stats: any, logoUrl?: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Load and add Arabic font - using embedded font for reliability
  let fontLoaded = false;
  try {
    const arabicFontBase64 = await loadArabicFont();
    if (arabicFontBase64 && arabicFontBase64.length > 1000) {
      doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');
      fontLoaded = true;
      console.log('Arabic font loaded successfully');
    } else {
      console.warn('Arabic font base64 is empty or too small');
    }
  } catch (error) {
    console.error('Error setting Arabic font:', error);
  }

  // If font failed to load, show warning but continue
  if (!fontLoaded) {
    console.warn('Arabic font not loaded - PDF may have rendering issues');
  }

  doc.setLanguage('ar');
  
  let yPos = 20;

  // Add college logo if available
  if (logoUrl && logoUrl.trim()) {
    try {
      // Add logo at top center
      doc.addImage(logoUrl, 'PNG', 85, yPos, 40, 40);
      yPos += 45;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      yPos = 20;
    }
  }
  
  // Header with border
  doc.setFillColor(66, 139, 202);
  doc.rect(15, yPos - 5, 180, 30, 'F');
  
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('تقرير الاستبيان', 105, yPos + 5, { align: 'center' });
  yPos += 12;
  
  doc.setFontSize(16);
  doc.text(survey?.title || 'استبيان', 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(survey?.programs?.name || '', 105, yPos, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Add semester and academic year
  if (report?.semester || report?.academic_year) {
    doc.setFontSize(12);
    const semesterText = report.semester ? `الفصل الدراسي: ${report.semester}` : '';
    const yearText = report.academic_year ? `العام الأكاديمي: ${report.academic_year}` : '';
    const infoText = [semesterText, yearText].filter(Boolean).join(' - ');
    doc.text(infoText, 105, yPos, { align: 'center' });
    yPos += 7;
  }
  
  // Stats Section with enhanced styling
  doc.setFillColor(240, 248, 255);
  doc.rect(15, yPos, 180, 10, 'F');
  
  doc.setFontSize(14);
  doc.setFont('Amiri', 'normal');
  doc.text('الإحصائيات الرئيسية', 20, yPos + 7);
  yPos += 12;
  
  const statsData = [
    ['إجمالي الاستجابات', String(stats.totalResponses || 0)],
    ['معدل الاستجابة', `${stats.responseRate || 0}%`],
    ['المتوسط العام', stats.overallMean ? stats.overallMean.toFixed(2) : 'غير متاح'],
    ['الانحراف المعياري', stats.overallStdDev ? stats.overallStdDev.toFixed(2) : 'غير متاح'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['المؤشر', 'القيمة']],
    body: statsData,
    styles: { 
      font: 'Amiri', 
      halign: 'right',
      fontSize: 11,
      cellPadding: 5
    },
    headStyles: { 
      fillColor: [66, 139, 202],
      fontSize: 12,
      fontStyle: 'bold'
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 20, right: 20 }
  });

  // Summary Section with enhanced styling
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFillColor(240, 248, 255);
  doc.rect(15, yPos - 3, 180, 10, 'F');
  
  doc.setFontSize(14);
  doc.setFont('Amiri', 'normal');
  doc.text('الملخص التنفيذي', 20, yPos + 4);
  yPos += 12;
  
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(11);
  const summaryText = report.summary || 'لا يوجد ملخص متاح حالياً. يرجى مراجعة التفاصيل أدناه.';
  const summaryLines = doc.splitTextToSize(summaryText, 170);
  
  // Add background for summary
  doc.setFillColor(250, 250, 250);
  doc.rect(20, yPos - 2, 170, summaryLines.length * 6 + 4, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos - 2, 170, summaryLines.length * 6 + 4, 'S');
  
  doc.text(summaryLines, 25, yPos + 2);

  // Recommendations Section
  yPos += summaryLines.length * 6 + 15;
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFillColor(240, 255, 240);
  doc.rect(15, yPos - 3, 180, 10, 'F');
  
  doc.setFontSize(14);
  doc.setFont('Amiri', 'normal');
  doc.text('التوصيات والمقترحات', 20, yPos + 4);
  yPos += 12;
  
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(11);
  const recommendationText = report.recommendations_text || 'لا توجد توصيات محددة حالياً. سيتم تحديث هذا القسم بناءً على تحليل النتائج.';
  const recommendationLines = doc.splitTextToSize(recommendationText, 170);
  
  // Add background for recommendations
  doc.setFillColor(250, 255, 250);
  doc.rect(20, yPos - 2, 170, recommendationLines.length * 6 + 4, 'F');
  doc.setDrawColor(200, 220, 200);
  doc.rect(20, yPos - 2, 170, recommendationLines.length * 6 + 4, 'S');
  
  doc.text(recommendationLines, 25, yPos + 2);
  yPos += recommendationLines.length * 6 + 10;

  // Question Stats with enhanced presentation
  if (stats.questionStats && stats.questionStats.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }
    
    doc.setFillColor(255, 248, 240);
    doc.rect(15, yPos - 3, 180, 10, 'F');
    
    doc.setFontSize(14);
    doc.setFont('Amiri', 'normal');
    doc.text('تفاصيل الأسئلة والتقييمات', 20, yPos + 4);
    yPos += 12;
    
    const questionData = stats.questionStats.map((q: any, index: number) => [
      `${index + 1}. ${q.question}`,
      q.mean ? q.mean.toFixed(2) : 'غير متاح',
      q.stdDev ? q.stdDev.toFixed(2) : 'غير متاح',
      q.responseCount || 0
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['السؤال', 'المتوسط', 'الانحراف المعياري', 'عدد الإجابات']],
      body: questionData,
      styles: { 
        font: 'Amiri', 
        halign: 'right', 
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        fontSize: 11,
        fontStyle: 'bold'
      },
      columnStyles: { 
        0: { cellWidth: 100 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 20, right: 20 }
    });
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `صفحة ${i} من ${pageCount} | كلية العلوم الإنسانية والاجتماعية - نظام إدارة الاستبيانات`,
      105,
      285,
      { align: 'center' }
    );
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
    ...(report?.semester ? [['الفصل الدراسي', report.semester]] : []),
    ...(report?.academic_year ? [['العام الأكاديمي', report.academic_year]] : []),
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
