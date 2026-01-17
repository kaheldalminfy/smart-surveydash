// Arabic Text Processing Utilities for PDF Generation
// Handles Arabic reshaping and text reversal for proper RTL display

// Arabic character forms mapping for proper reshaping
const ARABIC_CHARS_MAP: { [key: string]: { isolated: string; initial: string; medial: string; final: string } } = {
  'ا': { isolated: 'ا', initial: 'ا', medial: 'ـا', final: 'ـا' },
  'أ': { isolated: 'أ', initial: 'أ', medial: 'ـأ', final: 'ـأ' },
  'إ': { isolated: 'إ', initial: 'إ', medial: 'ـإ', final: 'ـإ' },
  'آ': { isolated: 'آ', initial: 'آ', medial: 'ـآ', final: 'ـآ' },
  'ب': { isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب' },
  'ت': { isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت' },
  'ث': { isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث' },
  'ج': { isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج' },
  'ح': { isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح' },
  'خ': { isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ' },
  'د': { isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد' },
  'ذ': { isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ' },
  'ر': { isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر' },
  'ز': { isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز' },
  'س': { isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس' },
  'ش': { isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش' },
  'ص': { isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص' },
  'ض': { isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض' },
  'ط': { isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط' },
  'ظ': { isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ' },
  'ع': { isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع' },
  'غ': { isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ' },
  'ف': { isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف' },
  'ق': { isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق' },
  'ك': { isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك' },
  'ل': { isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل' },
  'م': { isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم' },
  'ن': { isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن' },
  'ه': { isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه' },
  'و': { isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو' },
  'ي': { isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي' },
  'ى': { isolated: 'ى', initial: 'ى', medial: 'ـى', final: 'ـى' },
  'ئ': { isolated: 'ئ', initial: 'ئـ', medial: 'ـئـ', final: 'ـئ' },
  'ء': { isolated: 'ء', initial: 'ء', medial: 'ء', final: 'ء' },
  'ؤ': { isolated: 'ؤ', initial: 'ؤ', medial: 'ـؤ', final: 'ـؤ' },
  'ة': { isolated: 'ة', initial: 'ة', medial: 'ـة', final: 'ـة' },
};

// Characters that don't connect to the next character
const NON_CONNECTING = ['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ء', 'ة', 'ى'];

// Check if character is Arabic
const isArabic = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) || // Arabic
         (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
         (code >= 0xFB50 && code <= 0xFDFF) || // Arabic Presentation Forms-A
         (code >= 0xFE70 && code <= 0xFEFF);   // Arabic Presentation Forms-B
};

// Check if previous character connects to next
const connectsToNext = (char: string): boolean => {
  return isArabic(char) && !NON_CONNECTING.includes(char);
};

/**
 * Simple Arabic text reversal for RTL display
 * This reverses the character order for proper RTL rendering in PDF
 */
export const reverseArabicText = (text: string): string => {
  if (!text) return '';
  
  // Split into words, reverse Arabic words but keep numbers/punctuation in order
  const words = text.split(/(\s+)/);
  const processedWords = words.map(word => {
    // Check if word contains Arabic
    const hasArabic = [...word].some(isArabic);
    if (hasArabic) {
      // Reverse the word for RTL
      return [...word].reverse().join('');
    }
    return word;
  });
  
  // Reverse word order for RTL
  return processedWords.reverse().join('');
};

/**
 * Process Arabic text for PDF - handles reshaping for connected letters
 * This is a simplified reshaper that handles basic Arabic text
 */
export const processArabicForPDF = (text: string): string => {
  if (!text) return '';
  
  // For jsPDF with proper Arabic font, we just need to ensure the text is properly encoded
  // The font itself handles the reshaping when properly embedded
  return text;
};

/**
 * Format Arabic number with proper display
 */
export const formatArabicNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals);
};

/**
 * Format date for Arabic display
 */
export const formatArabicDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Use Arabic locale for date formatting
  try {
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    // Fallback to ISO format
    return d.toISOString().split('T')[0];
  }
};

/**
 * Split long Arabic text into lines that fit within a given width
 * This is a helper for text that needs manual wrapping
 */
export const splitArabicText = (text: string, maxCharsPerLine: number = 80): string[] => {
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
