// Arabic Text Processing Utilities for PDF Generation
// Handles Arabic reshaping and text reversal for proper RTL display in jsPDF

// Arabic character forms mapping for proper reshaping
const ARABIC_FORMS: Record<string, { isolated: string; initial: string; medial: string; final: string }> = {
  'ا': { isolated: '\uFE8D', initial: '\uFE8D', medial: '\uFE8E', final: '\uFE8E' },
  'أ': { isolated: '\uFE83', initial: '\uFE83', medial: '\uFE84', final: '\uFE84' },
  'إ': { isolated: '\uFE87', initial: '\uFE87', medial: '\uFE88', final: '\uFE88' },
  'آ': { isolated: '\uFE81', initial: '\uFE81', medial: '\uFE82', final: '\uFE82' },
  'ب': { isolated: '\uFE8F', initial: '\uFE91', medial: '\uFE92', final: '\uFE90' },
  'ت': { isolated: '\uFE95', initial: '\uFE97', medial: '\uFE98', final: '\uFE96' },
  'ث': { isolated: '\uFE99', initial: '\uFE9B', medial: '\uFE9C', final: '\uFE9A' },
  'ج': { isolated: '\uFE9D', initial: '\uFE9F', medial: '\uFEA0', final: '\uFE9E' },
  'ح': { isolated: '\uFEA1', initial: '\uFEA3', medial: '\uFEA4', final: '\uFEA2' },
  'خ': { isolated: '\uFEA5', initial: '\uFEA7', medial: '\uFEA8', final: '\uFEA6' },
  'د': { isolated: '\uFEA9', initial: '\uFEA9', medial: '\uFEAA', final: '\uFEAA' },
  'ذ': { isolated: '\uFEAB', initial: '\uFEAB', medial: '\uFEAC', final: '\uFEAC' },
  'ر': { isolated: '\uFEAD', initial: '\uFEAD', medial: '\uFEAE', final: '\uFEAE' },
  'ز': { isolated: '\uFEAF', initial: '\uFEAF', medial: '\uFEB0', final: '\uFEB0' },
  'س': { isolated: '\uFEB1', initial: '\uFEB3', medial: '\uFEB4', final: '\uFEB2' },
  'ش': { isolated: '\uFEB5', initial: '\uFEB7', medial: '\uFEB8', final: '\uFEB6' },
  'ص': { isolated: '\uFEB9', initial: '\uFEBB', medial: '\uFEBC', final: '\uFEBA' },
  'ض': { isolated: '\uFEBD', initial: '\uFEBF', medial: '\uFEC0', final: '\uFEBE' },
  'ط': { isolated: '\uFEC1', initial: '\uFEC3', medial: '\uFEC4', final: '\uFEC2' },
  'ظ': { isolated: '\uFEC5', initial: '\uFEC7', medial: '\uFEC8', final: '\uFEC6' },
  'ع': { isolated: '\uFEC9', initial: '\uFECB', medial: '\uFECC', final: '\uFECA' },
  'غ': { isolated: '\uFECD', initial: '\uFECF', medial: '\uFED0', final: '\uFECE' },
  'ف': { isolated: '\uFED1', initial: '\uFED3', medial: '\uFED4', final: '\uFED2' },
  'ق': { isolated: '\uFED5', initial: '\uFED7', medial: '\uFED8', final: '\uFED6' },
  'ك': { isolated: '\uFED9', initial: '\uFEDB', medial: '\uFEDC', final: '\uFEDA' },
  'ل': { isolated: '\uFEDD', initial: '\uFEDF', medial: '\uFEE0', final: '\uFEDE' },
  'م': { isolated: '\uFEE1', initial: '\uFEE3', medial: '\uFEE4', final: '\uFEE2' },
  'ن': { isolated: '\uFEE5', initial: '\uFEE7', medial: '\uFEE8', final: '\uFEE6' },
  'ه': { isolated: '\uFEE9', initial: '\uFEEB', medial: '\uFEEC', final: '\uFEEA' },
  'و': { isolated: '\uFEED', initial: '\uFEED', medial: '\uFEEE', final: '\uFEEE' },
  'ي': { isolated: '\uFEF1', initial: '\uFEF3', medial: '\uFEF4', final: '\uFEF2' },
  'ى': { isolated: '\uFEEF', initial: '\uFEEF', medial: '\uFEF0', final: '\uFEF0' },
  'ئ': { isolated: '\uFE89', initial: '\uFE8B', medial: '\uFE8C', final: '\uFE8A' },
  'ء': { isolated: '\uFE80', initial: '\uFE80', medial: '\uFE80', final: '\uFE80' },
  'ؤ': { isolated: '\uFE85', initial: '\uFE85', medial: '\uFE86', final: '\uFE86' },
  'ة': { isolated: '\uFE93', initial: '\uFE93', medial: '\uFE94', final: '\uFE94' },
  'لا': { isolated: '\uFEFB', initial: '\uFEFB', medial: '\uFEFC', final: '\uFEFC' },
  'لأ': { isolated: '\uFEF7', initial: '\uFEF7', medial: '\uFEF8', final: '\uFEF8' },
  'لإ': { isolated: '\uFEF9', initial: '\uFEF9', medial: '\uFEFA', final: '\uFEFA' },
  'لآ': { isolated: '\uFEF5', initial: '\uFEF5', medial: '\uFEF6', final: '\uFEF6' },
};

// Characters that don't connect to the next character (non-joining on the left)
const NON_JOINING_AFTER = new Set(['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ء', 'ة', 'ى']);

// Tashkeel (diacritics) to preserve
const TASHKEEL = new Set(['\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652', '\u0670']);

// Check if character is Arabic letter
const isArabicLetter = (char: string): boolean => {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x0621 && code <= 0x064A) || // Arabic letters
         (code >= 0x066E && code <= 0x06D3);   // Extended Arabic
};

// Check if character is Arabic (including tashkeel, numbers, etc.)
const isArabicChar = (char: string): boolean => {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) || // Arabic block
         (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
         (code >= 0xFB50 && code <= 0xFDFF) || // Arabic Presentation Forms-A
         (code >= 0xFE70 && code <= 0xFEFF);   // Arabic Presentation Forms-B
};

/**
 * Reshape Arabic text by converting characters to their proper contextual forms
 */
const reshapeArabic = (text: string): string => {
  if (!text) return '';
  
  // Handle Lam-Alef ligatures first
  text = text.replace(/لا/g, '\uFEFB');
  text = text.replace(/لأ/g, '\uFEF7');
  text = text.replace(/لإ/g, '\uFEF9');
  text = text.replace(/لآ/g, '\uFEF5');
  
  const result: string[] = [];
  const chars = [...text];
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const prevChar = i > 0 ? chars[i - 1] : '';
    const nextChar = i < chars.length - 1 ? chars[i + 1] : '';
    
    // Skip tashkeel, keep them as-is
    if (TASHKEEL.has(char)) {
      result.push(char);
      continue;
    }
    
    // If not Arabic letter, keep as-is
    if (!isArabicLetter(char) || !ARABIC_FORMS[char]) {
      result.push(char);
      continue;
    }
    
    const forms = ARABIC_FORMS[char];
    
    // Find previous actual letter (skip tashkeel)
    let prevLetter = '';
    for (let j = i - 1; j >= 0; j--) {
      if (!TASHKEEL.has(chars[j])) {
        prevLetter = chars[j];
        break;
      }
    }
    
    // Find next actual letter (skip tashkeel)
    let nextLetter = '';
    for (let j = i + 1; j < chars.length; j++) {
      if (!TASHKEEL.has(chars[j])) {
        nextLetter = chars[j];
        break;
      }
    }
    
    const prevConnects = isArabicLetter(prevLetter) && !NON_JOINING_AFTER.has(prevLetter);
    const nextConnects = isArabicLetter(nextLetter);
    
    let form: string;
    if (prevConnects && nextConnects) {
      form = forms.medial;
    } else if (prevConnects) {
      form = forms.final;
    } else if (nextConnects) {
      form = forms.initial;
    } else {
      form = forms.isolated;
    }
    
    result.push(form);
  }
  
  return result.join('');
};

/**
 * Reverse text for RTL display in PDF
 * Handles mixed Arabic/Latin text properly
 */
const reverseForRTL = (text: string): string => {
  if (!text) return '';
  
  // Split into segments of Arabic and non-Arabic
  const segments: { text: string; isArabic: boolean }[] = [];
  let currentSegment = '';
  let currentIsArabic: boolean | null = null;
  
  for (const char of text) {
    const charIsArabic = isArabicChar(char) || TASHKEEL.has(char);
    
    if (currentIsArabic === null) {
      currentIsArabic = charIsArabic;
    }
    
    if (charIsArabic === currentIsArabic || char === ' ') {
      currentSegment += char;
    } else {
      if (currentSegment) {
        segments.push({ text: currentSegment, isArabic: currentIsArabic });
      }
      currentSegment = char;
      currentIsArabic = charIsArabic;
    }
  }
  
  if (currentSegment) {
    segments.push({ text: currentSegment, isArabic: currentIsArabic! });
  }
  
  // Reverse segment order (for RTL overall direction)
  segments.reverse();
  
  // Reverse Arabic segments internally, keep Latin as-is
  return segments.map(seg => {
    if (seg.isArabic) {
      return [...seg.text].reverse().join('');
    }
    return seg.text;
  }).join('');
};

/**
 * Process Arabic text for PDF rendering
 * Applies reshaping and reversal for proper RTL display
 */
export const processArabicForPDF = (text: string): string => {
  if (!text) return '';
  
  // Check if text contains Arabic
  const hasArabic = [...text].some(isArabicChar);
  if (!hasArabic) return text;
  
  // Step 1: Reshape (connect letters)
  const reshaped = reshapeArabic(text);
  
  // Step 2: Reverse for RTL display
  const reversed = reverseForRTL(reshaped);
  
  return reversed;
};

/**
 * Simple reversal for already-shaped text
 */
export const reverseArabicText = (text: string): string => {
  if (!text) return '';
  return reverseForRTL(text);
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
