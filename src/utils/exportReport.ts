// PDF Export Utilities v3 - Fixed Arabic Support
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadEmbeddedArabicFont } from './embeddedArabicFont';
import { formatArabicDate } from './arabicTextUtils';
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

// College Colors - Professional palette
const COLORS = {
  primary: [30, 64, 124] as [number, number, number],      // Deep blue
  secondary: [22, 101, 52] as [number, number, number],    // Forest green
  accent: [126, 34, 206] as [number, number, number],      // Purple
  text: [31, 41, 55] as [number, number, number],          // Dark gray
  muted: [107, 114, 128] as [number, number, number],      // Medium gray
  lightBg: [243, 244, 246] as [number, number, number],    // Light gray
  white: [255, 255, 255] as [number, number, number],
  gold: [180, 130, 50] as [number, number, number],        // Gold accent
};

// Performance level helper
const getMeanLevel = (mean: number): { label: string; color: [number, number, number] } => {
  if (mean >= 4.5) return { label: 'ممتاز', color: [22, 163, 74] };
  if (mean >= 3.5) return { label: 'جيد جداً', color: [34, 197, 94] };
  if (mean >= 2.5) return { label: 'متوسط', color: [234, 179, 8] };
  if (mean >= 1.5) return { label: 'ضعيف', color: [249, 115, 22] };
  return { label: 'ضعيف جداً', color: [239, 68, 68] };
};

// Draw decorative header bar
const drawSectionHeader = (
  doc: jsPDF, 
  y: number, 
  title: string, 
  color: [number, number, number],
  pageWidth: number,
  margin: number
) => {
  doc.setFillColor(...color);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(title, pageWidth - margin - 5, y + 8, { align: 'right' });
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
  margin: number
) => {
  // Footer line
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  
  // Footer text
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`${pageNum} / ${totalPages}`, margin + 5, pageHeight - 10);
  doc.text(collegeName, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(formatArabicDate(new Date()), pageWidth - margin - 5, pageHeight - 10, { align: 'right' });
};

/**
 * Main PDF Export Function
 * Generates a professional multi-page PDF report with Arabic support
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

  // Show loading toast
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
        doc.setFont('Amiri');
        fontLoaded = true;
        console.log('Arabic font loaded successfully');
      }
    } catch (error) {
      console.error('Font loading error:', error);
    }

    // Set language for RTL support
    doc.setLanguage('ar');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 15;

    // ============ PAGE 1: COVER PAGE ============
    
    // College Logo
    if (collegeLogo) {
      try {
        doc.addImage(collegeLogo, 'PNG', (pageWidth - 35) / 2, yPos, 35, 35);
        yPos += 45;
      } catch (e) {
        console.warn('Logo loading error:', e);
        yPos += 10;
      }
    }

    // Decorative top border
    doc.setFillColor(...COLORS.gold);
    doc.rect(margin, yPos, pageWidth - margin * 2, 3, 'F');
    yPos += 8;

    // Main Title Box
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 50, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(26);
    doc.text('تقرير نتائج الاستبيان', pageWidth / 2, yPos + 18, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text(survey?.title || 'استبيان', pageWidth / 2, yPos + 32, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(survey?.programs?.name || collegeName, pageWidth / 2, yPos + 44, { align: 'center' });
    yPos += 60;

    // Semester & Year Info Box
    if (report?.semester || report?.academic_year) {
      doc.setFillColor(...COLORS.lightBg);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 2, 2, 'F');
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(13);
      
      const semester = report.semester || '';
      const academicYear = report.academic_year || '';
      const infoText = `${semester ? 'الفصل: ' + semester : ''}${semester && academicYear ? '  |  ' : ''}${academicYear ? 'العام: ' + academicYear : ''}`;
      doc.text(infoText, pageWidth / 2, yPos + 12, { align: 'center' });
      yPos += 25;
    }

    // ============ STATISTICS SECTION ============
    yPos = drawSectionHeader(doc, yPos, 'الإحصائيات الرئيسية', COLORS.primary, pageWidth, margin);

    // Calculate real values
    const totalResponses = stats.totalResponses || 0;
    const targetEnrollment = stats.targetEnrollment || survey?.target_enrollment || 0;
    const responseRate = targetEnrollment > 0 
      ? Math.round((totalResponses / targetEnrollment) * 100) 
      : 0;
    const overallMean = typeof stats.overallMean === 'number' ? stats.overallMean : 0;
    const overallStdDev = typeof stats.overallStdDev === 'number' ? stats.overallStdDev : 0;

    const statsData = [
      ['القيمة', 'المؤشر'],
      [String(totalResponses), 'إجمالي الاستجابات'],
      [targetEnrollment > 0 ? String(targetEnrollment) : 'غير محدد', 'العدد المستهدف'],
      [targetEnrollment > 0 ? `${responseRate}%` : 'غير متاح', 'معدل الاستجابة'],
      [overallMean > 0 ? `${overallMean.toFixed(2)} / 5.00` : '-', 'المتوسط العام'],
      [overallMean > 0 ? getMeanLevel(overallMean).label : '-', 'مستوى الأداء'],
      [overallStdDev > 0 ? overallStdDev.toFixed(2) : '-', 'الانحراف المعياري'],
      [String(stats.questionStats?.length || 0), 'عدد الأسئلة'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [statsData[0]],
      body: statsData.slice(1),
      styles: { 
        font: fontLoaded ? 'Amiri' : 'helvetica', 
        halign: 'right', 
        fontSize: 12, 
        cellPadding: 5 
      },
      headStyles: { 
        fillColor: COLORS.primary, 
        halign: 'center', 
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      columnStyles: { 
        0: { halign: 'center', cellWidth: 60 }, 
        1: { halign: 'right', cellWidth: 80 } 
      },
      alternateRowStyles: { fillColor: COLORS.lightBg },
      margin: { left: margin + 15, right: margin + 15 },
      theme: 'grid'
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============ SUMMARY SECTION ============
    if (yPos + 60 > pageHeight - 30) { 
      doc.addPage(); 
      yPos = 20; 
    }

    yPos = drawSectionHeader(doc, yPos, 'الملخص التنفيذي', COLORS.secondary, pageWidth, margin);

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    const summaryText = report?.summary || 'لا يوجد ملخص تنفيذي. يمكنك توليد ملخص باستخدام الذكاء الاصطناعي من صفحة التقرير.';
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 15);
    
    // Summary box
    const summaryHeight = Math.max(summaryLines.length * 6 + 12, 30);
    doc.setFillColor(240, 253, 244); // Light green
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.secondary);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'S');
    doc.text(summaryLines, pageWidth - margin - 8, yPos + 8, { align: 'right' });
    yPos += summaryHeight + 12;

    // ============ RECOMMENDATIONS SECTION ============
    if (yPos + 50 > pageHeight - 30) { 
      doc.addPage(); 
      yPos = 20; 
    }

    yPos = drawSectionHeader(doc, yPos, 'التوصيات', COLORS.accent, pageWidth, margin);

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    const recText = report?.recommendations_text || 'لا توجد توصيات. يمكنك توليد توصيات باستخدام الذكاء الاصطناعي من صفحة التقرير.';
    const recLines = doc.splitTextToSize(recText, pageWidth - margin * 2 - 15);
    
    const recHeight = Math.max(recLines.length * 6 + 12, 30);
    doc.setFillColor(250, 245, 255); // Light purple
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'S');
    doc.text(recLines, pageWidth - margin - 8, yPos + 8, { align: 'right' });

    // ============ PAGE 2: CHARTS ============
    if (chartImages && chartImages.length > 0) {
      doc.addPage();
      yPos = 20;

      yPos = drawSectionHeader(doc, yPos, 'الرسوم البيانية والتحليلات', COLORS.primary, pageWidth, margin);

      for (const chart of chartImages) {
        if (yPos + 95 > pageHeight - 30) { 
          doc.addPage(); 
          yPos = 20; 
        }
        
        // Chart title
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(12);
        doc.text(chart.title, pageWidth - margin - 5, yPos, { align: 'right' });
        yPos += 6;
        
        // Chart image
        try {
          const chartWidth = pageWidth - margin * 2 - 10;
          const chartHeight = 75;
          
          // White background for chart
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(margin + 5, yPos, chartWidth, chartHeight, 2, 2, 'F');
          doc.setDrawColor(...COLORS.lightBg);
          doc.roundedRect(margin + 5, yPos, chartWidth, chartHeight, 2, 2, 'S');
          
          doc.addImage(chart.dataUrl, 'PNG', margin + 8, yPos + 2, chartWidth - 6, chartHeight - 4);
          yPos += chartHeight + 12;
        } catch (e) {
          console.error('Chart rendering error:', e);
          doc.setTextColor(...COLORS.muted);
          doc.setFontSize(10);
          doc.text('تعذر تحميل الرسم البياني', pageWidth / 2, yPos + 20, { align: 'center' });
          yPos += 30;
        }
      }
    }

    // ============ PAGE 3: QUESTION DETAILS ============
    if (stats.questionStats && stats.questionStats.length > 0) {
      doc.addPage();
      yPos = 20;

      yPos = drawSectionHeader(doc, yPos, 'تفاصيل نتائج الأسئلة', COLORS.primary, pageWidth, margin);

      const questionData = stats.questionStats.map((q: any, i: number) => [
        String(q.responseCount || 0),
        q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
        q.mean ? Number(q.mean).toFixed(2) : '-',
        q.mean ? getMeanLevel(q.mean).label : '-',
        `${i + 1}. ${q.question?.substring(0, 60) || ''}${(q.question?.length || 0) > 60 ? '...' : ''}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['ردود', 'انحراف', 'متوسط', 'التقييم', 'السؤال']],
        body: questionData,
        styles: { 
          font: fontLoaded ? 'Amiri' : 'helvetica', 
          fontSize: 9, 
          cellPadding: 4,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: COLORS.primary, 
          halign: 'center', 
          fontStyle: 'bold',
          textColor: [255, 255, 255]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'right', cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: COLORS.lightBg },
        margin: { left: margin, right: margin },
        theme: 'striped',
        didDrawPage: () => {
          // This runs on each new page created by autotable
        }
      });
    }

    // ============ PAGE 4: TEXT RESPONSES ============
    if (textResponses && textResponses.length > 0) {
      doc.addPage();
      yPos = 20;

      yPos = drawSectionHeader(doc, yPos, 'الردود النصية المفتوحة', COLORS.secondary, pageWidth, margin);

      for (const item of textResponses) {
        if (yPos + 40 > pageHeight - 30) { 
          doc.addPage(); 
          yPos = 20; 
        }
        
        // Question header
        doc.setFillColor(...COLORS.lightBg);
        const qLines = doc.splitTextToSize(item.question, pageWidth - margin * 2 - 10);
        const qHeight = qLines.length * 5 + 8;
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, qHeight, 2, 2, 'F');
        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(11);
        doc.text(qLines, pageWidth - margin - 5, yPos + 6, { align: 'right' });
        yPos += qHeight + 5;

        // Responses (max 8 per question)
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        const maxResponses = Math.min(item.responses.length, 8);
        
        for (let i = 0; i < maxResponses; i++) {
          if (yPos + 15 > pageHeight - 30) { 
            doc.addPage(); 
            yPos = 20; 
          }
          
          const respText = `• ${item.responses[i]}`;
          const respLines = doc.splitTextToSize(respText, pageWidth - margin * 2 - 20);
          doc.text(respLines, pageWidth - margin - 10, yPos, { align: 'right' });
          yPos += respLines.length * 5 + 4;
        }
        
        if (item.responses.length > 8) {
          doc.setTextColor(...COLORS.muted);
          doc.setFontSize(9);
          doc.text(`... و ${item.responses.length - 8} ردود إضافية`, pageWidth / 2, yPos, { align: 'center' });
          yPos += 8;
        }
        
        yPos += 10;
      }
    }

    // ============ ADD FOOTERS TO ALL PAGES ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (fontLoaded) doc.setFont('Amiri');
      addPageFooter(doc, i, totalPages, collegeName, pageWidth, pageHeight, margin);
    }

    // Save PDF
    const filename = `تقرير_${(survey?.title || 'استبيان').substring(0, 30)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    // Success toast
    toast({
      title: 'تم التصدير بنجاح',
      description: `تم حفظ التقرير: ${filename}`,
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
