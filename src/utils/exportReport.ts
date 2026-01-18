// PDF Export Utilities v4 - Professional Arabic Support
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadEmbeddedArabicFont } from './embeddedArabicFont';
import { processArabicForPDF, formatArabicDate, formatNumber } from './arabicTextUtils';
import { toast } from '@/hooks/use-toast';

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

// University Colors from DOCX template
const COLORS = {
  red: [207, 32, 46] as [number, number, number],       // Red bar
  blue: [0, 112, 192] as [number, number, number],      // Blue bar
  lightBlue: [0, 176, 240] as [number, number, number], // Light blue bar
  darkBlue: [0, 51, 102] as [number, number, number],   // Dark blue text
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  yellow: [234, 179, 8] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  redText: [239, 68, 68] as [number, number, number],
};

// Performance level helper
const getMeanLevel = (mean: number): { label: string; color: [number, number, number] } => {
  if (mean >= 4.5) return { label: 'ممتاز', color: COLORS.green };
  if (mean >= 3.5) return { label: 'جيد جداً', color: [34, 197, 94] };
  if (mean >= 2.5) return { label: 'متوسط', color: COLORS.yellow };
  if (mean >= 1.5) return { label: 'ضعيف', color: COLORS.orange };
  return { label: 'ضعيف جداً', color: COLORS.redText };
};

// Arabic text wrapper for PDF - processes and returns for right-aligned text
const ar = (text: string): string => {
  if (!text) return '';
  return processArabicForPDF(text);
};

// Draw the colorful header bar (matching DOCX template)
const drawColorBar = (doc: jsPDF, y: number, pageWidth: number) => {
  const barHeight = 8;
  const thirdWidth = pageWidth / 3;
  
  // Red bar (left)
  doc.setFillColor(...COLORS.red);
  doc.rect(0, y, thirdWidth, barHeight, 'F');
  
  // Blue bar (middle)
  doc.setFillColor(...COLORS.blue);
  doc.rect(thirdWidth, y, thirdWidth, barHeight, 'F');
  
  // Light blue bar (right)
  doc.setFillColor(...COLORS.lightBlue);
  doc.rect(thirdWidth * 2, y, thirdWidth + 1, barHeight, 'F');
  
  return y + barHeight;
};

// Draw section header with accent color
const drawSectionHeader = (
  doc: jsPDF, 
  y: number, 
  title: string, 
  color: [number, number, number],
  pageWidth: number,
  margin: number,
  fontLoaded: boolean
) => {
  doc.setFillColor(...color);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  if (fontLoaded) doc.setFont('Amiri', 'normal');
  doc.text(ar(title), pageWidth - margin - 5, y + 8.5, { align: 'right' });
  return y + 18;
};

// Add page footer
const addPageFooter = (
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  collegeName: string,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  fontLoaded: boolean
) => {
  // Draw color bar at bottom
  drawColorBar(doc, pageHeight - 12, pageWidth);
  
  // Footer text above the bar
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  if (fontLoaded) doc.setFont('Amiri', 'normal');
  
  doc.text(`${pageNum} / ${totalPages}`, margin + 5, pageHeight - 16);
  doc.text(ar(collegeName), pageWidth / 2, pageHeight - 16, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-GB'), pageWidth - margin - 5, pageHeight - 16, { align: 'right' });
};

/**
 * Main PDF Export Function - Professional Multi-page Report
 */
export const exportToPDF = async (
  report: any,
  survey: any,
  stats: any,
  collegeLogo?: string,
  chartImages?: ChartImage[],
  textResponses?: TextResponse[],
  collegeName: string = 'كلية العلوم الإنسانية والاجتماعية'
) => {
  // Validate input data
  if (!stats || !survey) {
    toast({
      title: 'خطأ',
      description: 'البيانات غير مكتملة. تأكد من تحميل بيانات التقرير.',
      variant: 'destructive'
    });
    return;
  }

  const loadingToast = toast({
    title: 'جاري التصدير...',
    description: 'يتم إنشاء ملف PDF، يرجى الانتظار.',
  });

  try {
    const doc = new jsPDF({ 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4',
      putOnlyUsedFonts: true
    });

    // Load Arabic font
    let fontLoaded = false;
    try {
      const arabicFontBase64 = await loadEmbeddedArabicFont();
      if (arabicFontBase64 && arabicFontBase64.length > 1000) {
        doc.addFileToVFS('Amiri-Regular.ttf', arabicFontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri', 'normal');
        fontLoaded = true;
        console.log('Arabic font loaded successfully');
      }
    } catch (error) {
      console.error('Font loading error:', error);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 0;

    // ============ PAGE 1: COVER PAGE ============
    
    // Top color bar (like DOCX template)
    yPos = drawColorBar(doc, 0, pageWidth);
    yPos += 10;
    
    // University Title - English
    doc.setTextColor(...COLORS.darkBlue);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Libyan International Medical University', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    
    doc.setFontSize(14);
    doc.text('Faculty of Human and Social Sciences', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Arabic Title
    if (fontLoaded) {
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.text);
      doc.text(ar(collegeName), pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
    }
    
    // Separator line
    doc.setDrawColor(...COLORS.blue);
    doc.setLineWidth(1);
    doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
    yPos += 15;

    // College Logo (if available)
    if (collegeLogo) {
      try {
        doc.addImage(collegeLogo, 'PNG', (pageWidth - 40) / 2, yPos, 40, 40);
        yPos += 50;
      } catch (e) {
        console.warn('Logo loading error:', e);
        yPos += 5;
      }
    }

    // Main Title Box
    doc.setFillColor(...COLORS.blue);
    doc.roundedRect(margin + 10, yPos, pageWidth - margin * 2 - 20, 40, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.white);
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(22);
    doc.text(ar('تقرير نتائج الاستبيان'), pageWidth / 2, yPos + 16, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(ar(survey?.title || 'استبيان'), pageWidth / 2, yPos + 30, { align: 'center' });
    yPos += 50;

    // Program name
    if (survey?.programs?.name) {
      doc.setTextColor(...COLORS.darkBlue);
      doc.setFontSize(14);
      doc.text(ar(survey.programs.name), pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
    }

    // Semester & Year Info
    if (report?.semester || report?.academic_year) {
      doc.setFillColor(...COLORS.lightGray);
      doc.roundedRect(margin + 30, yPos, pageWidth - margin * 2 - 60, 14, 2, 2, 'F');
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(12);
      
      const semesterText = report.semester ? `الفصل الدراسي: ${report.semester}` : '';
      const yearText = report.academic_year ? `العام الأكاديمي: ${report.academic_year}` : '';
      const infoText = [semesterText, yearText].filter(Boolean).join('  |  ');
      doc.text(ar(infoText), pageWidth / 2, yPos + 9, { align: 'center' });
      yPos += 22;
    }

    // ============ STATISTICS SECTION ============
    yPos = drawSectionHeader(doc, yPos, 'الإحصائيات الرئيسية', COLORS.blue, pageWidth, margin, fontLoaded);

    // Calculate real values
    const totalResponses = stats.totalResponses || 0;
    const targetEnrollment = stats.targetEnrollment || survey?.target_enrollment || 0;
    const responseRate = targetEnrollment > 0 
      ? Math.round((totalResponses / targetEnrollment) * 100) 
      : 0;
    const overallMean = typeof stats.overallMean === 'number' ? stats.overallMean : 0;
    const overallStdDev = typeof stats.overallStdDev === 'number' ? stats.overallStdDev : 0;

    const statsData = [
      [ar('القيمة'), ar('المؤشر')],
      [String(totalResponses), ar('إجمالي الاستجابات')],
      [targetEnrollment > 0 ? String(targetEnrollment) : ar('غير محدد'), ar('العدد المستهدف')],
      [targetEnrollment > 0 ? `${responseRate}%` : ar('غير متاح'), ar('معدل الاستجابة')],
      [overallMean > 0 ? `${overallMean.toFixed(2)} / 5.00` : '-', ar('المتوسط العام')],
      [overallMean > 0 ? ar(getMeanLevel(overallMean).label) : '-', ar('مستوى الأداء')],
      [overallStdDev > 0 ? overallStdDev.toFixed(2) : '-', ar('الانحراف المعياري')],
      [String(stats.questionStats?.length || 0), ar('عدد الأسئلة')],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [statsData[0]],
      body: statsData.slice(1),
      styles: { 
        font: fontLoaded ? 'Amiri' : 'helvetica', 
        fontStyle: 'normal',
        halign: 'right', 
        fontSize: 11, 
        cellPadding: 4 
      },
      headStyles: { 
        fillColor: COLORS.blue, 
        halign: 'center', 
        fontStyle: 'normal',
        textColor: [255, 255, 255]
      },
      columnStyles: { 
        0: { halign: 'center', cellWidth: 55 }, 
        1: { halign: 'right', cellWidth: 75 } 
      },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      margin: { left: margin + 20, right: margin + 20 },
      theme: 'grid'
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============ EXECUTIVE SUMMARY SECTION ============
    if (yPos + 60 > pageHeight - 35) { 
      doc.addPage(); 
      yPos = 20; 
    }

    yPos = drawSectionHeader(doc, yPos, 'الملخص التنفيذي', COLORS.green, pageWidth, margin, fontLoaded);

    doc.setTextColor(...COLORS.text);
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(11);
    
    // Get summary text - use actual data or fallback message
    const summaryText = report?.summary && report.summary.trim() !== '' 
      ? report.summary 
      : 'لا يوجد ملخص تنفيذي. يمكنك توليد ملخص باستخدام الذكاء الاصطناعي من خلال زر "توليد بالذكاء الاصطناعي" في صفحة التقرير.';
    
    const processedSummary = ar(summaryText);
    const summaryLines = doc.splitTextToSize(processedSummary, pageWidth - margin * 2 - 16);
    
    // Summary box
    const summaryHeight = Math.max(summaryLines.length * 6 + 12, 35);
    doc.setFillColor(240, 253, 244); // Light green
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.green);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'S');
    doc.text(summaryLines, pageWidth - margin - 8, yPos + 8, { align: 'right' });
    yPos += summaryHeight + 12;

    // ============ RECOMMENDATIONS SECTION ============
    if (yPos + 50 > pageHeight - 35) { 
      doc.addPage(); 
      yPos = 20; 
    }

    yPos = drawSectionHeader(doc, yPos, 'التوصيات', COLORS.red, pageWidth, margin, fontLoaded);

    doc.setTextColor(...COLORS.text);
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(11);
    
    // Get recommendations text - use actual data or fallback message
    const recText = report?.recommendations_text && report.recommendations_text.trim() !== ''
      ? report.recommendations_text
      : 'لا توجد توصيات. يمكنك توليد توصيات باستخدام الذكاء الاصطناعي من خلال زر "توليد بالذكاء الاصطناعي" في صفحة التقرير.';
    
    const processedRec = ar(recText);
    const recLines = doc.splitTextToSize(processedRec, pageWidth - margin * 2 - 16);
    
    const recHeight = Math.max(recLines.length * 6 + 12, 35);
    doc.setFillColor(254, 242, 242); // Light red
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.red);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'S');
    doc.text(recLines, pageWidth - margin - 8, yPos + 8, { align: 'right' });

    // ============ PAGE 2: CHARTS ============
    if (chartImages && chartImages.length > 0) {
      doc.addPage();
      yPos = 20;

      yPos = drawSectionHeader(doc, yPos, 'الرسوم البيانية والتحليلات', COLORS.blue, pageWidth, margin, fontLoaded);

      for (const chart of chartImages) {
        if (yPos + 90 > pageHeight - 35) { 
          doc.addPage(); 
          yPos = 20; 
        }
        
        // Chart title
        doc.setTextColor(...COLORS.text);
        if (fontLoaded) doc.setFont('Amiri', 'normal');
        doc.setFontSize(11);
        doc.text(ar(chart.title), pageWidth - margin - 5, yPos, { align: 'right' });
        yPos += 6;
        
        // Chart image
        try {
          const chartWidth = pageWidth - margin * 2 - 10;
          const chartHeight = 70;
          
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(margin + 5, yPos, chartWidth, chartHeight, 2, 2, 'F');
          doc.setDrawColor(...COLORS.lightGray);
          doc.roundedRect(margin + 5, yPos, chartWidth, chartHeight, 2, 2, 'S');
          
          doc.addImage(chart.dataUrl, 'PNG', margin + 8, yPos + 2, chartWidth - 6, chartHeight - 4);
          yPos += chartHeight + 12;
        } catch (e) {
          console.error('Chart rendering error:', e);
          doc.setTextColor(...COLORS.muted);
          doc.setFontSize(10);
          doc.text(ar('تعذر تحميل الرسم البياني'), pageWidth / 2, yPos + 20, { align: 'center' });
          yPos += 30;
        }
      }
    }

    // ============ PAGE 3: QUESTION DETAILS ============
    if (stats.questionStats && stats.questionStats.length > 0) {
      doc.addPage();
      yPos = 20;

      yPos = drawSectionHeader(doc, yPos, 'تفاصيل نتائج الأسئلة', COLORS.blue, pageWidth, margin, fontLoaded);

      const questionData = stats.questionStats.map((q: any, i: number) => [
        String(q.responseCount || 0),
        q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
        q.mean ? Number(q.mean).toFixed(2) : '-',
        q.mean ? ar(getMeanLevel(q.mean).label) : '-',
        ar(`${i + 1}. ${(q.question || '').substring(0, 55)}${(q.question?.length || 0) > 55 ? '...' : ''}`),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[ar('ردود'), ar('انحراف'), ar('متوسط'), ar('التقييم'), ar('السؤال')]],
        body: questionData,
        styles: { 
          font: fontLoaded ? 'Amiri' : 'helvetica', 
          fontStyle: 'normal',
          fontSize: 9, 
          cellPadding: 3,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: COLORS.blue, 
          halign: 'center', 
          fontStyle: 'normal',
          textColor: [255, 255, 255]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { halign: 'center', cellWidth: 16 },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: COLORS.lightGray },
        margin: { left: margin, right: margin },
        theme: 'striped'
      });
    }

    // ============ PAGE 4: TEXT RESPONSES ============
    if (textResponses && textResponses.length > 0) {
      doc.addPage();
      yPos = 20;

      yPos = drawSectionHeader(doc, yPos, 'الردود النصية المفتوحة', COLORS.lightBlue, pageWidth, margin, fontLoaded);

      for (const item of textResponses) {
        if (yPos + 40 > pageHeight - 35) { 
          doc.addPage(); 
          yPos = 20; 
        }
        
        // Question header
        doc.setFillColor(...COLORS.lightGray);
        const questionText = ar(item.question);
        const qLines = doc.splitTextToSize(questionText, pageWidth - margin * 2 - 10);
        const qHeight = qLines.length * 5 + 8;
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, qHeight, 2, 2, 'F');
        doc.setTextColor(...COLORS.darkBlue);
        if (fontLoaded) doc.setFont('Amiri', 'normal');
        doc.setFontSize(11);
        doc.text(qLines, pageWidth - margin - 5, yPos + 6, { align: 'right' });
        yPos += qHeight + 5;

        // Responses (max 8 per question)
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        const maxResponses = Math.min(item.responses.length, 8);
        
        for (let i = 0; i < maxResponses; i++) {
          if (yPos + 15 > pageHeight - 35) { 
            doc.addPage(); 
            yPos = 20; 
          }
          
          const respText = ar(`• ${item.responses[i]}`);
          const respLines = doc.splitTextToSize(respText, pageWidth - margin * 2 - 20);
          doc.text(respLines, pageWidth - margin - 10, yPos, { align: 'right' });
          yPos += respLines.length * 5 + 4;
        }
        
        if (item.responses.length > 8) {
          doc.setTextColor(...COLORS.muted);
          doc.setFontSize(9);
          doc.text(ar(`... و ${item.responses.length - 8} ردود إضافية`), pageWidth / 2, yPos, { align: 'center' });
          yPos += 8;
        }
        
        yPos += 10;
      }
    }

    // ============ ADD FOOTERS TO ALL PAGES ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, totalPages, collegeName, pageWidth, pageHeight, margin, fontLoaded);
    }

    // Save PDF
    const filename = `تقرير_${(survey?.title || 'استبيان').replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '').substring(0, 25)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    toast({
      title: 'تم التصدير بنجاح',
      description: `تم حفظ التقرير بنجاح`,
    });

  } catch (error) {
    console.error('PDF Export Error:', error);
    toast({
      title: 'خطأ في التصدير',
      description: 'حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.',
      variant: 'destructive'
    });
  }
};

/**
 * Export to Excel
 */
export const exportToExcel = (report: any, survey: any, stats: any, textResponses?: TextResponse[]) => {
  try {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['تقرير الاستبيان'], [''],
      ['العنوان', survey?.title || ''],
      ['البرنامج', survey?.programs?.name || ''],
      ['الفصل الدراسي', report?.semester || ''],
      ['العام الأكاديمي', report?.academic_year || ''],
      [''], ['الإحصائيات'],
      ['إجمالي الاستجابات', stats.totalResponses || 0],
      ['العدد المستهدف', stats.targetEnrollment || 'غير محدد'],
      ['معدل الاستجابة', `${stats.responseRate || 0}%`],
      ['المتوسط العام', stats.overallMean ? Number(stats.overallMean).toFixed(2) : '-'],
      ['الانحراف المعياري', stats.overallStdDev ? Number(stats.overallStdDev).toFixed(2) : '-'],
      [''], ['الملخص التنفيذي'], [report?.summary || 'لا يوجد'],
      [''], ['التوصيات'], [report?.recommendations_text || 'لا توجد'],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');

    // Questions Sheet
    if (stats.questionStats?.length > 0) {
      const questionsData = [
        ['#', 'السؤال', 'النوع', 'المتوسط', 'الانحراف المعياري', 'عدد الردود', 'التقييم'],
        ...stats.questionStats.map((q: any, i: number) => [
          i + 1,
          q.question,
          q.type === 'likert' ? 'ليكرت' : q.type === 'mcq' ? 'اختيار' : q.type === 'rating' ? 'تقييم' : 'نصي',
          q.mean ? Number(q.mean).toFixed(2) : '-',
          q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
          q.responseCount || 0,
          q.mean ? getMeanLevel(q.mean).label : '-',
        ]),
      ];
      const questionsSheet = XLSX.utils.aoa_to_sheet(questionsData);
      questionsSheet['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, questionsSheet, 'الأسئلة');
    }

    // Text Responses Sheet
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

    const filename = `تقرير_${(survey?.title || 'استبيان').substring(0, 30)}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: 'تم التصدير بنجاح',
      description: `تم حفظ ملف Excel: ${filename}`,
    });
  } catch (error) {
    console.error('Excel Export Error:', error);
    toast({
      title: 'خطأ في التصدير',
      description: 'حدث خطأ أثناء إنشاء ملف Excel.',
      variant: 'destructive'
    });
  }
};

/**
 * Capture chart as image
 */
export const captureChartAsImage = async (
  elementId: string,
  title: string,
  type: 'likert' | 'mcq' | 'summary' = 'summary'
): Promise<ChartImage | null> => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Chart element not found: ${elementId}`);
      return null;
    }

    const canvas = await html2canvas(element, { 
      backgroundColor: '#ffffff', 
      scale: 2, 
      logging: false, 
      useCORS: true,
      allowTaint: true
    });
    
    return { 
      id: elementId, 
      dataUrl: canvas.toDataURL('image/png', 0.95), 
      title, 
      type 
    };
  } catch (error) {
    console.error('Chart capture error:', error);
    return null;
  }
};

/**
 * Capture all charts
 */
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
