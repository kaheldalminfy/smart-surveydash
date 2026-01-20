// Arabic Text Processing Utilities for PDF Generation
// Handles Arabic text properly for RTL display in jsPDF

/**
 * Process Arabic text for PDF rendering
 * jsPDF with proper Arabic fonts can render Arabic correctly when text is NOT reversed
 * The font handles the RTL rendering internally
 */
export const processArabicForPDF = (text: string): string => {
  if (!text) return '';
  
  // With proper Arabic fonts like Amiri, we should NOT reverse the text
  // The font and right-align handle RTL display correctly
  // Just return the text as-is for the font to handle
  return text;
};

/**
 * Process text with reshaping for older/limited PDF libraries
 * Only use this if the font doesn't support automatic shaping
 */
export const processArabicWithReshaping = (text: string): string => {
  if (!text) return '';
  
  // Check if text contains Arabic
  const hasArabic = [...text].some(isArabicChar);
  if (!hasArabic) return text;
  
  // Apply ligatures for common combinations
  let processed = text;
  processed = processed.replace(/لا/g, 'لا');
  processed = processed.replace(/لأ/g, 'لأ');
  processed = processed.replace(/لإ/g, 'لإ');
  processed = processed.replace(/لآ/g, 'لآ');
  
  return processed;
};

// Check if character is Arabic
const isArabicChar = (char: string): boolean => {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) || // Arabic block
         (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
         (code >= 0xFB50 && code <= 0xFDFF) || // Arabic Presentation Forms-A
         (code >= 0xFE70 && code <= 0xFEFF);   // Arabic Presentation Forms-B
};

/**
 * Format number with Arabic or Western digits
 */
export const formatNumber = (num: number, decimals: number = 2, useArabicDigits: boolean = false): string => {
  const formatted = num.toFixed(decimals);
  if (!useArabicDigits) return formatted;
  
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return formatted.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d)]);
};

/**
 * Format date for display
 */
export const formatArabicDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return d.toISOString().split('T')[0];
  }
};

/**
 * Split long text into lines for PDF
 */
export const splitTextToLines = (text: string, maxCharsPerLine: number = 80): string[] => {
  if (!text) return [];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  
  return lines;
};
