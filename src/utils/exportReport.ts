// PDF Export Utilities v6 - Comprehensive Professional Report with Arabic RTL Fix
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadEmbeddedArabicFont } from './embeddedArabicFont';
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

interface QuestionStat {
  question: string;
  type: string;
  mean?: number;
  stdDev?: number;
  responseCount: number;
  distribution?: Array<{ name: string; value: number; fill: string }>;
  mcqDistribution?: Array<{ name: string; value: number; fill: string }>;
}

// University Colors from DOCX template
const COLORS = {
  red: [207, 32, 46] as [number, number, number],
  blue: [0, 112, 192] as [number, number, number],
  lightBlue: [0, 176, 240] as [number, number, number],
  darkBlue: [0, 51, 102] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  lightGreen: [34, 197, 94] as [number, number, number],
  yellow: [234, 179, 8] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  redText: [239, 68, 68] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
};

// Performance level helper
const getMeanLevel = (mean: number): { label: string; color: [number, number, number] } => {
  if (mean >= 4.5) return { label: 'ممتاز', color: COLORS.green };
  if (mean >= 3.5) return { label: 'جيد جداً', color: COLORS.lightGreen };
  if (mean >= 2.5) return { label: 'متوسط', color: COLORS.yellow };
  if (mean >= 1.5) return { label: 'ضعيف', color: COLORS.orange };
  return { label: 'ضعيف جداً', color: COLORS.redText };
};

// Arabic text wrapper - With proper Amiri font, no reversal needed
// The font handles RTL rendering correctly
const ar = (text: string): string => {
  if (!text) return '';
  return text; // Amiri font handles Arabic correctly without reversal
};

// Draw the colorful header bar (matching DOCX template)
const drawColorBar = (doc: jsPDF, y: number, pageWidth: number) => {
  const barHeight = 8;
  const thirdWidth = pageWidth / 3;
  
  doc.setFillColor(...COLORS.red);
  doc.rect(0, y, thirdWidth, barHeight, 'F');
  
  doc.setFillColor(...COLORS.blue);
  doc.rect(thirdWidth, y, thirdWidth, barHeight, 'F');
  
  doc.setFillColor(...COLORS.lightBlue);
  doc.rect(thirdWidth * 2, y, thirdWidth + 1, barHeight, 'F');
  
  return y + barHeight;
};

// Draw section header
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
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  if (fontLoaded) doc.setFont('Amiri', 'normal');
  doc.text(title, pageWidth - margin - 5, y + 7, { align: 'right' });
  return y + 15;
};

// Draw KPI Card
const drawKPICard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  subText: string,
  bgColor: [number, number, number],
  textColor: [number, number, number],
  fontLoaded: boolean
) => {
  // Background
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Label
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  if (fontLoaded) doc.setFont('Amiri', 'normal');
  doc.text(label, x + width / 2, y + 8, { align: 'center' });
  
  // Value
  doc.setTextColor(...textColor);
  doc.setFontSize(18);
  doc.text(value, x + width / 2, y + 20, { align: 'center' });
  
  // SubText
  if (subText) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);
    doc.text(subText, x + width / 2, y + 27, { align: 'center' });
  }
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
  drawColorBar(doc, pageHeight - 12, pageWidth);
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  if (fontLoaded) doc.setFont('Amiri', 'normal');
  
  doc.text(`${pageNum} / ${totalPages}`, margin + 5, pageHeight - 16);
  doc.text(collegeName, pageWidth / 2, pageHeight - 16, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-GB'), pageWidth - margin - 5, pageHeight - 16, { align: 'right' });
};

// Check if need new page
const checkNewPage = (doc: jsPDF, yPos: number, neededSpace: number, pageHeight: number): number => {
  if (yPos + neededSpace > pageHeight - 30) {
    doc.addPage();
    return 20;
  }
  return yPos;
};

/**
 * Main PDF Export Function - Comprehensive Report matching screen exactly
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
  if (!stats || !survey) {
    toast({
      title: 'خطأ',
      description: 'البيانات غير مكتملة. تأكد من تحميل بيانات التقرير.',
      variant: 'destructive'
    });
    return;
  }

  toast({
    title: 'جاري التصدير...',
    description: 'يتم إنشاء ملف PDF شامل، يرجى الانتظار.',
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
      }
    } catch (error) {
      console.error('Font loading error:', error);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let yPos = 0;

    // ============ PAGE 1: COVER PAGE ============
    yPos = drawColorBar(doc, 0, pageWidth);
    yPos += 8;
    
    // University Title
    doc.setTextColor(...COLORS.darkBlue);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Libyan International Medical University', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    doc.setFontSize(13);
    doc.text('Faculty of Human and Social Sciences', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    if (fontLoaded) {
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.text);
      doc.text(collegeName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    }
    
    // Separator
    doc.setDrawColor(...COLORS.blue);
    doc.setLineWidth(0.8);
    doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
    yPos += 10;

    // Logo
    if (collegeLogo) {
      try {
        doc.addImage(collegeLogo, 'PNG', (pageWidth - 35) / 2, yPos, 35, 35);
        yPos += 42;
      } catch (e) {
        yPos += 5;
      }
    }

    // Main Title Box
    doc.setFillColor(...COLORS.blue);
    doc.roundedRect(margin + 15, yPos, pageWidth - margin * 2 - 30, 35, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.white);
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(20);
    doc.text('تقرير نتائج الاستبيان', pageWidth / 2, yPos + 14, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(survey?.title || 'استبيان', pageWidth / 2, yPos + 26, { align: 'center' });
    yPos += 42;

    // Program & Semester
    if (survey?.programs?.name) {
      doc.setTextColor(...COLORS.darkBlue);
      doc.setFontSize(12);
      doc.text(survey.programs.name, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
    }

    if (report?.semester || report?.academic_year) {
      doc.setFillColor(...COLORS.lightGray);
      doc.roundedRect(margin + 35, yPos, pageWidth - margin * 2 - 70, 12, 2, 2, 'F');
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      
      const infoText = [
        report.semester ? `الفصل: ${report.semester}` : '',
        report.academic_year ? `العام: ${report.academic_year}` : ''
      ].filter(Boolean).join('  |  ');
      doc.text(infoText, pageWidth / 2, yPos + 8, { align: 'center' });
      yPos += 18;
    }

    // ============ KPI CARDS (5 cards like screen) ============
    yPos = drawSectionHeader(doc, yPos, 'الإحصائيات العامة', COLORS.blue, pageWidth, margin, fontLoaded);

    const totalResponses = stats.totalResponses || 0;
    const targetEnrollment = stats.targetEnrollment || survey?.target_enrollment || 0;
    const responseRate = targetEnrollment > 0 ? Math.round((totalResponses / targetEnrollment) * 100) : null;
    const overallMean = typeof stats.overallMean === 'number' ? stats.overallMean : 0;
    const questionCount = stats.questionStats?.length || 0;
    const textResponsesCount = textResponses?.reduce((sum, t) => sum + t.responses.length, 0) || 0;

    const cardWidth = (pageWidth - margin * 2 - 16) / 5;
    const cardHeight = 32;
    const cardY = yPos;

    // Card 1: Total Responses
    drawKPICard(doc, margin, cardY, cardWidth, cardHeight, 
      'إجمالي الاستجابات', String(totalResponses), 
      targetEnrollment > 0 ? `من ${targetEnrollment} طالب` : '',
      [219, 234, 254], COLORS.blue, fontLoaded);

    // Card 2: Response Rate
    drawKPICard(doc, margin + cardWidth + 4, cardY, cardWidth, cardHeight, 
      'معدل الاستجابة', 
      responseRate !== null ? `${responseRate}%` : 'غير محدد',
      responseRate !== null && responseRate >= 70 ? 'نسبة جيدة' : '',
      responseRate === null ? [243, 244, 246] : responseRate >= 70 ? [220, 252, 231] : responseRate >= 50 ? [254, 249, 195] : [254, 215, 170],
      responseRate === null ? COLORS.muted : responseRate >= 70 ? COLORS.green : responseRate >= 50 ? COLORS.yellow : COLORS.orange,
      fontLoaded);

    // Card 3: Overall Mean
    drawKPICard(doc, margin + (cardWidth + 4) * 2, cardY, cardWidth, cardHeight, 
      'المتوسط العام', overallMean > 0 ? overallMean.toFixed(2) : '-', 
      overallMean > 0 ? getMeanLevel(overallMean).label : 'من 5.0',
      [220, 252, 231], COLORS.green, fontLoaded);

    // Card 4: Question Count
    drawKPICard(doc, margin + (cardWidth + 4) * 3, cardY, cardWidth, cardHeight, 
      'عدد الأسئلة', String(questionCount), '',
      [243, 232, 255], COLORS.purple, fontLoaded);

    // Card 5: Text Responses
    drawKPICard(doc, margin + (cardWidth + 4) * 4, cardY, cardWidth, cardHeight, 
      'التعليقات النصية', String(textResponsesCount), '',
      [254, 243, 199], COLORS.amber, fontLoaded);

    yPos = cardY + cardHeight + 12;

    // ============ STATISTICS TABLE ============
    yPos = drawSectionHeader(doc, yPos, 'تفاصيل الإحصائيات', COLORS.darkBlue, pageWidth, margin, fontLoaded);

    const statsTableData = [
      ['القيمة', 'المؤشر'],
      [String(totalResponses), 'إجمالي الاستجابات'],
      [targetEnrollment > 0 ? String(targetEnrollment) : 'غير محدد', 'العدد المستهدف'],
      [responseRate !== null ? `${responseRate}%` : 'غير متاح', 'معدل الاستجابة'],
      [overallMean > 0 ? `${overallMean.toFixed(2)} / 5.00` : '-', 'المتوسط العام'],
      [overallMean > 0 ? getMeanLevel(overallMean).label : '-', 'مستوى الأداء'],
      [stats.overallStdDev > 0 ? stats.overallStdDev.toFixed(2) : '-', 'الانحراف المعياري'],
      [String(questionCount), 'عدد الأسئلة'],
      [String(textResponsesCount), 'عدد التعليقات النصية'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [statsTableData[0]],
      body: statsTableData.slice(1),
      styles: { font: fontLoaded ? 'Amiri' : 'helvetica', fontStyle: 'normal', halign: 'right', fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: COLORS.blue, halign: 'center', fontStyle: 'normal', textColor: [255, 255, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 50 }, 1: { halign: 'right', cellWidth: 70 } },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      margin: { left: margin + 25, right: margin + 25 },
      theme: 'grid'
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // ============ EXECUTIVE SUMMARY ============
    yPos = checkNewPage(doc, yPos, 50, pageHeight);
    yPos = drawSectionHeader(doc, yPos, 'الملخص التنفيذي', COLORS.green, pageWidth, margin, fontLoaded);

    const summaryText = report?.summary?.trim() || 'لا يوجد ملخص تنفيذي. يمكنك توليد ملخص باستخدام زر "إعادة التحليل" بالذكاء الاصطناعي.';
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 12);
    
    const summaryHeight = Math.max(summaryLines.length * 5 + 10, 25);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.green);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'S');
    doc.setTextColor(...COLORS.text);
    doc.text(summaryLines, pageWidth - margin - 6, yPos + 6, { align: 'right' });
    yPos += summaryHeight + 10;

    // ============ RECOMMENDATIONS ============
    yPos = checkNewPage(doc, yPos, 50, pageHeight);
    yPos = drawSectionHeader(doc, yPos, 'التوصيات', COLORS.red, pageWidth, margin, fontLoaded);

    const recText = report?.recommendations_text?.trim() || 'لا توجد توصيات. يمكنك توليد توصيات باستخدام زر "إعادة التحليل" بالذكاء الاصطناعي.';
    doc.setFontSize(10);
    const recLines = doc.splitTextToSize(recText, pageWidth - margin * 2 - 12);
    
    const recHeight = Math.max(recLines.length * 5 + 10, 25);
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.red);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'S');
    doc.setTextColor(...COLORS.text);
    doc.text(recLines, pageWidth - margin - 6, yPos + 6, { align: 'right' });
    yPos += recHeight + 10;

    // ============ CHARTS PAGE ============
    if (chartImages && chartImages.length > 0) {
      doc.addPage();
      yPos = 15;

      // Summary chart first (large)
      const summaryChart = chartImages.find(c => c.type === 'summary');
      if (summaryChart) {
        yPos = drawSectionHeader(doc, yPos, 'ملخص متوسطات الأسئلة', COLORS.blue, pageWidth, margin, fontLoaded);
        
        try {
          const chartWidth = pageWidth - margin * 2;
          const chartHeight = 90;
          
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(margin, yPos, chartWidth, chartHeight, 2, 2, 'F');
          doc.setDrawColor(...COLORS.lightGray);
          doc.roundedRect(margin, yPos, chartWidth, chartHeight, 2, 2, 'S');
          doc.addImage(summaryChart.dataUrl, 'PNG', margin + 2, yPos + 2, chartWidth - 4, chartHeight - 4);
          yPos += chartHeight + 10;
        } catch (e) {
          console.error('Summary chart error:', e);
        }
      }

      // Individual question charts (2 per row)
      const questionCharts = chartImages.filter(c => c.type !== 'summary');
      if (questionCharts.length > 0) {
        yPos = checkNewPage(doc, yPos, 80, pageHeight);
        yPos = drawSectionHeader(doc, yPos, 'توزيع استجابات الأسئلة', COLORS.purple, pageWidth, margin, fontLoaded);

        const chartW = (pageWidth - margin * 2 - 8) / 2;
        const chartH = 55;

        for (let i = 0; i < questionCharts.length; i += 2) {
          yPos = checkNewPage(doc, yPos, chartH + 15, pageHeight);

          // Left chart
          const chart1 = questionCharts[i];
          try {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, yPos, chartW, chartH, 2, 2, 'F');
            doc.setDrawColor(...COLORS.lightGray);
            doc.roundedRect(margin, yPos, chartW, chartH, 2, 2, 'S');
            doc.addImage(chart1.dataUrl, 'PNG', margin + 2, yPos + 2, chartW - 4, chartH - 4);
            
            // Title below
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.muted);
            if (fontLoaded) doc.setFont('Amiri', 'normal');
            doc.text(chart1.title.substring(0, 40), margin + chartW / 2, yPos + chartH + 5, { align: 'center' });
          } catch (e) {}

          // Right chart
          if (i + 1 < questionCharts.length) {
            const chart2 = questionCharts[i + 1];
            try {
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(margin + chartW + 8, yPos, chartW, chartH, 2, 2, 'F');
              doc.setDrawColor(...COLORS.lightGray);
              doc.roundedRect(margin + chartW + 8, yPos, chartW, chartH, 2, 2, 'S');
              doc.addImage(chart2.dataUrl, 'PNG', margin + chartW + 10, yPos + 2, chartW - 4, chartH - 4);
              
              doc.text(chart2.title.substring(0, 40), margin + chartW + 8 + chartW / 2, yPos + chartH + 5, { align: 'center' });
            } catch (e) {}
          }

          yPos += chartH + 15;
        }
      }
    }

    // ============ QUESTION DETAILS TABLE ============
    if (stats.questionStats && stats.questionStats.length > 0) {
      doc.addPage();
      yPos = 15;

      yPos = drawSectionHeader(doc, yPos, 'تفاصيل نتائج الأسئلة', COLORS.blue, pageWidth, margin, fontLoaded);

      const questionData = stats.questionStats.map((q: any, i: number) => {
        const mean = q.mean ? Number(q.mean) : 0;
        return [
          String(q.responseCount || 0),
          q.stdDev ? Number(q.stdDev).toFixed(2) : '-',
          mean > 0 ? mean.toFixed(2) : '-',
          mean > 0 ? getMeanLevel(mean).label : '-',
          q.type === 'likert' ? 'ليكرت' : q.type === 'mcq' ? 'اختيار' : q.type === 'rating' ? 'تقييم' : 'نصي',
          `${i + 1}. ${(q.question || '').substring(0, 45)}${(q.question?.length || 0) > 45 ? '...' : ''}`,
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['ردود', 'انحراف', 'متوسط', 'التقييم', 'النوع', 'السؤال']],
        body: questionData,
        styles: { font: fontLoaded ? 'Amiri' : 'helvetica', fontStyle: 'normal', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: COLORS.blue, halign: 'center', fontStyle: 'normal', textColor: [255, 255, 255] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 14 },
          2: { halign: 'center', cellWidth: 14 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: COLORS.lightGray },
        margin: { left: margin, right: margin },
        theme: 'striped'
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // ============ DISTRIBUTION TABLES FOR EACH QUESTION ============
    if (stats.questionStats && stats.questionStats.length > 0) {
      // Group likert questions for distribution tables
      const likertQuestions = stats.questionStats.filter((q: any) => 
        q.type === 'likert' || q.type === 'rating'
      );

      if (likertQuestions.length > 0) {
        doc.addPage();
        yPos = 15;
        yPos = drawSectionHeader(doc, yPos, 'توزيع استجابات أسئلة ليكرت والتقييم', COLORS.darkBlue, pageWidth, margin, fontLoaded);

        for (const [idx, q] of likertQuestions.entries()) {
          yPos = checkNewPage(doc, yPos, 45, pageHeight);

          // Question header
          doc.setFillColor(...COLORS.lightGray);
          doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
          doc.setTextColor(...COLORS.darkBlue);
          doc.setFontSize(9);
          if (fontLoaded) doc.setFont('Amiri', 'normal');
          doc.text(`س${idx + 1}: ${q.question?.substring(0, 70) || ''}`, pageWidth - margin - 4, yPos + 7, { align: 'right' });
          yPos += 13;

          // Stats row
          const mean = q.mean ? Number(q.mean) : 0;
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.text);
          doc.text(`المتوسط: ${mean.toFixed(2)}  |  الانحراف: ${q.stdDev?.toFixed(2) || '-'}  |  التقييم: ${mean > 0 ? getMeanLevel(mean).label : '-'}`, 
            pageWidth / 2, yPos, { align: 'center' });
          yPos += 8;

          // Simple distribution bar
          if (q.distribution && q.distribution.length > 0) {
            const total = q.distribution.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
            const barWidth = pageWidth - margin * 2 - 40;
            const barHeight = 8;
            let xOffset = margin + 20;

            for (const d of q.distribution) {
              const pct = total > 0 ? (d.value || 0) / total : 0;
              const segWidth = barWidth * pct;
              
              if (segWidth > 0) {
                // Parse color from fill
                const fillColor = d.fill || '#888888';
                const r = parseInt(fillColor.slice(1, 3), 16);
                const g = parseInt(fillColor.slice(3, 5), 16);
                const b = parseInt(fillColor.slice(5, 7), 16);
                doc.setFillColor(r, g, b);
                doc.rect(xOffset, yPos, segWidth, barHeight, 'F');
                
                // Percentage label if segment is wide enough
                if (segWidth > 12 && pct > 0.05) {
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(6);
                  doc.text(`${Math.round(pct * 100)}%`, xOffset + segWidth / 2, yPos + 5.5, { align: 'center' });
                }
                
                xOffset += segWidth;
              }
            }
          }
          yPos += 15;
        }
      }
    }

    // ============ TEXT RESPONSES ============
    if (textResponses && textResponses.length > 0) {
      doc.addPage();
      yPos = 15;

      yPos = drawSectionHeader(doc, yPos, 'الردود النصية المفتوحة', COLORS.amber, pageWidth, margin, fontLoaded);

      for (const item of textResponses) {
        yPos = checkNewPage(doc, yPos, 35, pageHeight);
        
        // Question
        doc.setFillColor(...COLORS.lightGray);
        if (fontLoaded) doc.setFont('Amiri', 'normal');
        doc.setFontSize(10);
        const qLines = doc.splitTextToSize(item.question, pageWidth - margin * 2 - 8);
        const qHeight = qLines.length * 4.5 + 6;
        doc.roundedRect(margin, yPos, pageWidth - margin * 2, qHeight, 2, 2, 'F');
        doc.setTextColor(...COLORS.darkBlue);
        doc.text(qLines, pageWidth - margin - 4, yPos + 5, { align: 'right' });
        yPos += qHeight + 4;

        // Responses (max 10)
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(9);
        const maxResp = Math.min(item.responses.length, 10);
        
        for (let i = 0; i < maxResp; i++) {
          yPos = checkNewPage(doc, yPos, 12, pageHeight);
          
          const respText = `• ${item.responses[i]}`;
          const respLines = doc.splitTextToSize(respText, pageWidth - margin * 2 - 15);
          doc.text(respLines, pageWidth - margin - 8, yPos, { align: 'right' });
          yPos += respLines.length * 4 + 3;
        }
        
        if (item.responses.length > 10) {
          doc.setTextColor(...COLORS.muted);
          doc.setFontSize(8);
          doc.text(`... و ${item.responses.length - 10} ردود إضافية`, pageWidth / 2, yPos, { align: 'center' });
          yPos += 6;
        }
        
        yPos += 8;
      }
    }

    // ============ ADD FOOTERS ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, totalPages, collegeName, pageWidth, pageHeight, margin, fontLoaded);
    }

    // Save
    const filename = `تقرير_شامل_${(survey?.title || 'استبيان').replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '').substring(0, 20)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    toast({
      title: 'تم التصدير بنجاح',
      description: `تم إنشاء تقرير PDF شامل من ${totalPages} صفحات`,
    });

  } catch (error) {
    console.error('PDF Export Error:', error);
    toast({
      title: 'خطأ في التصدير',
      description: 'حدث خطأ أثناء إنشاء ملف PDF.',
      variant: 'destructive'
    });
  }
};

/**
 * Generate PDF Blob for Preview - Returns PDF as Blob without downloading
 */
export const generatePDFBlob = async (
  report: any,
  survey: any,
  stats: any,
  collegeLogo?: string,
  chartImages?: ChartImage[],
  textResponses?: TextResponse[],
  collegeName: string = 'كلية العلوم الإنسانية والاجتماعية'
): Promise<Blob | null> => {
  if (!stats || !survey) {
    return null;
  }

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
      }
    } catch (error) {
      console.error('Font loading error:', error);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let yPos = 0;

    // ============ PAGE 1: COVER PAGE ============
    yPos = drawColorBar(doc, 0, pageWidth);
    yPos += 8;
    
    // University Title
    doc.setTextColor(...COLORS.darkBlue);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Libyan International Medical University', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    
    doc.setFontSize(13);
    doc.text('Faculty of Human and Social Sciences', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    if (fontLoaded) {
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.text);
      doc.text(collegeName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    }
    
    // Separator
    doc.setDrawColor(...COLORS.blue);
    doc.setLineWidth(0.8);
    doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
    yPos += 10;

    // Logo
    if (collegeLogo) {
      try {
        doc.addImage(collegeLogo, 'PNG', (pageWidth - 35) / 2, yPos, 35, 35);
        yPos += 42;
      } catch (e) {
        yPos += 5;
      }
    }

    // Main Title Box
    doc.setFillColor(...COLORS.blue);
    doc.roundedRect(margin + 15, yPos, pageWidth - margin * 2 - 30, 35, 4, 4, 'F');
    
    doc.setTextColor(...COLORS.white);
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(20);
    doc.text('تقرير نتائج الاستبيان', pageWidth / 2, yPos + 14, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(survey?.title || 'استبيان', pageWidth / 2, yPos + 26, { align: 'center' });
    yPos += 42;

    // Program & Semester
    if (survey?.programs?.name) {
      doc.setTextColor(...COLORS.darkBlue);
      doc.setFontSize(12);
      doc.text(survey.programs.name, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
    }

    if (report?.semester || report?.academic_year) {
      doc.setFillColor(...COLORS.lightGray);
      doc.roundedRect(margin + 35, yPos, pageWidth - margin * 2 - 70, 12, 2, 2, 'F');
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      
      const infoText = [
        report.semester ? `الفصل: ${report.semester}` : '',
        report.academic_year ? `العام: ${report.academic_year}` : ''
      ].filter(Boolean).join('  |  ');
      doc.text(infoText, pageWidth / 2, yPos + 8, { align: 'center' });
      yPos += 18;
    }

    // ============ KPI CARDS ============
    yPos = drawSectionHeader(doc, yPos, 'الإحصائيات العامة', COLORS.blue, pageWidth, margin, fontLoaded);

    const totalResponses = stats.totalResponses || 0;
    const targetEnrollment = stats.targetEnrollment || survey?.target_enrollment || 0;
    const responseRate = targetEnrollment > 0 ? Math.round((totalResponses / targetEnrollment) * 100) : null;
    const overallMean = typeof stats.overallMean === 'number' ? stats.overallMean : 0;
    const questionCount = stats.questionStats?.length || 0;
    const textResponsesCount = textResponses?.reduce((sum, t) => sum + t.responses.length, 0) || 0;

    const cardWidth = (pageWidth - margin * 2 - 16) / 5;
    const cardHeight = 32;
    const cardY = yPos;

    drawKPICard(doc, margin, cardY, cardWidth, cardHeight, 
      'إجمالي الاستجابات', String(totalResponses), 
      targetEnrollment > 0 ? `من ${targetEnrollment} طالب` : '',
      [219, 234, 254], COLORS.blue, fontLoaded);

    drawKPICard(doc, margin + cardWidth + 4, cardY, cardWidth, cardHeight, 
      'معدل الاستجابة', 
      responseRate !== null ? `${responseRate}%` : 'غير محدد',
      responseRate !== null && responseRate >= 70 ? 'نسبة جيدة' : '',
      responseRate === null ? [243, 244, 246] : responseRate >= 70 ? [220, 252, 231] : responseRate >= 50 ? [254, 249, 195] : [254, 215, 170],
      responseRate === null ? COLORS.muted : responseRate >= 70 ? COLORS.green : responseRate >= 50 ? COLORS.yellow : COLORS.orange,
      fontLoaded);

    drawKPICard(doc, margin + (cardWidth + 4) * 2, cardY, cardWidth, cardHeight, 
      'المتوسط العام', overallMean > 0 ? overallMean.toFixed(2) : '-', 
      overallMean > 0 ? getMeanLevel(overallMean).label : 'من 5.0',
      [220, 252, 231], COLORS.green, fontLoaded);

    drawKPICard(doc, margin + (cardWidth + 4) * 3, cardY, cardWidth, cardHeight, 
      'عدد الأسئلة', String(questionCount), '',
      [243, 232, 255], COLORS.purple, fontLoaded);

    drawKPICard(doc, margin + (cardWidth + 4) * 4, cardY, cardWidth, cardHeight, 
      'التعليقات النصية', String(textResponsesCount), '',
      [254, 243, 199], COLORS.amber, fontLoaded);

    yPos = cardY + cardHeight + 12;

    // ============ STATISTICS TABLE ============
    yPos = drawSectionHeader(doc, yPos, 'تفاصيل الإحصائيات', COLORS.darkBlue, pageWidth, margin, fontLoaded);

    const statsTableData = [
      ['القيمة', 'المؤشر'],
      [String(totalResponses), 'إجمالي الاستجابات'],
      [targetEnrollment > 0 ? String(targetEnrollment) : 'غير محدد', 'العدد المستهدف'],
      [responseRate !== null ? `${responseRate}%` : 'غير متاح', 'معدل الاستجابة'],
      [overallMean > 0 ? `${overallMean.toFixed(2)} / 5.00` : '-', 'المتوسط العام'],
      [overallMean > 0 ? getMeanLevel(overallMean).label : '-', 'مستوى الأداء'],
      [stats.overallStdDev > 0 ? stats.overallStdDev.toFixed(2) : '-', 'الانحراف المعياري'],
      [String(questionCount), 'عدد الأسئلة'],
      [String(textResponsesCount), 'عدد التعليقات النصية'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [statsTableData[0]],
      body: statsTableData.slice(1),
      styles: { font: fontLoaded ? 'Amiri' : 'helvetica', fontStyle: 'normal', halign: 'right', fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: COLORS.blue, halign: 'center', fontStyle: 'normal', textColor: [255, 255, 255] },
      columnStyles: { 0: { halign: 'center', cellWidth: 50 }, 1: { halign: 'right', cellWidth: 70 } },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      margin: { left: margin + 25, right: margin + 25 },
      theme: 'grid'
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // ============ EXECUTIVE SUMMARY ============
    yPos = checkNewPage(doc, yPos, 50, pageHeight);
    yPos = drawSectionHeader(doc, yPos, 'الملخص التنفيذي', COLORS.green, pageWidth, margin, fontLoaded);

    const summaryText = report?.summary?.trim() || 'لا يوجد ملخص تنفيذي.';
    if (fontLoaded) doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2 - 12);
    
    const summaryHeight = Math.max(summaryLines.length * 5 + 10, 25);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.green);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, summaryHeight, 2, 2, 'S');
    doc.setTextColor(...COLORS.text);
    doc.text(summaryLines, pageWidth - margin - 6, yPos + 6, { align: 'right' });
    yPos += summaryHeight + 10;

    // ============ RECOMMENDATIONS ============
    yPos = checkNewPage(doc, yPos, 50, pageHeight);
    yPos = drawSectionHeader(doc, yPos, 'التوصيات', COLORS.red, pageWidth, margin, fontLoaded);

    const recText = report?.recommendations_text?.trim() || 'لا توجد توصيات.';
    doc.setFontSize(10);
    const recLines = doc.splitTextToSize(recText, pageWidth - margin * 2 - 12);
    
    const recHeight = Math.max(recLines.length * 5 + 10, 25);
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'F');
    doc.setDrawColor(...COLORS.red);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, recHeight, 2, 2, 'S');
    doc.setTextColor(...COLORS.text);
    doc.text(recLines, pageWidth - margin - 6, yPos + 6, { align: 'right' });

    // ============ ADD FOOTERS ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, totalPages, collegeName, pageWidth, pageHeight, margin, fontLoaded);
    }

    // Return as Blob
    return doc.output('blob');

  } catch (error) {
    console.error('PDF Preview Error:', error);
    return null;
  }
};

/**
 * Export to Excel
 */
export const exportToExcel = (report: any, survey: any, stats: any, textResponses?: TextResponse[]) => {
  try {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['تقرير الاستبيان الشامل'], [''],
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
      description: `تم حفظ ملف Excel`,
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
    if (!element) return null;

    const canvas = await html2canvas(element, { 
      backgroundColor: '#ffffff', 
      scale: 2.5, 
      logging: false, 
      useCORS: true,
      allowTaint: true
    });
    
    return { id: elementId, dataUrl: canvas.toDataURL('image/png', 0.95), title, type };
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
