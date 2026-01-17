// Embedded Arabic Font Loader
// This module provides a reliable way to load Arabic font for PDF generation
// by embedding a subset or using a robust loading mechanism

import { toast } from '@/hooks/use-toast';

// Font loading state
let cachedFontBase64: string | null = null;
let isLoading = false;
let loadPromise: Promise<string> | null = null;

// Minimal embedded font subset for critical Arabic characters (fallback)
// This is a small base64 placeholder - the actual font is loaded from the server
const FALLBACK_NOTICE = true;

/**
 * Load Arabic font with caching and error handling
 * Attempts multiple sources and provides user feedback
 */
export const loadEmbeddedArabicFont = async (): Promise<string> => {
  // Return cached font if available
  if (cachedFontBase64) {
    return cachedFontBase64;
  }
  
  // If already loading, return the existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  isLoading = true;
  
  loadPromise = (async () => {
    const sources = [
      '/fonts/Amiri-Regular.ttf',
      'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUr.ttf',
      'https://cdn.jsdelivr.net/npm/@fontsource/amiri@5.0.19/files/amiri-arabic-400-normal.woff'
    ];
    
    for (const source of sources) {
      try {
        console.log(`Attempting to load font from: ${source}`);
        
        const response = await fetch(source, {
          mode: source.startsWith('http') ? 'cors' : 'same-origin',
          cache: 'force-cache'
        });
        
        if (!response.ok) {
          console.warn(`Font source ${source} returned ${response.status}`);
          continue;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength < 1000) {
          console.warn(`Font from ${source} seems too small: ${arrayBuffer.byteLength} bytes`);
          continue;
        }
        
        // Convert to base64 in chunks to avoid stack overflow
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        const chunkSize = 8192;
        
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64 = btoa(binaryString);
        
        if (base64.length > 1000) {
          console.log(`Successfully loaded font from ${source} (${base64.length} chars)`);
          cachedFontBase64 = base64;
          isLoading = false;
          return base64;
        }
      } catch (error) {
        console.warn(`Failed to load font from ${source}:`, error);
      }
    }
    
    // All sources failed
    isLoading = false;
    
    toast({
      title: 'تنبيه',
      description: 'فشل تحميل الخط العربي. سيتم استخدام خط افتراضي قد لا يعرض العربية بشكل صحيح.',
      variant: 'destructive'
    });
    
    return '';
  })();
  
  return loadPromise;
};

/**
 * Check if font is already cached
 */
export const isFontCached = (): boolean => {
  return cachedFontBase64 !== null && cachedFontBase64.length > 1000;
};

/**
 * Clear font cache (useful for testing or forcing reload)
 */
export const clearFontCache = (): void => {
  cachedFontBase64 = null;
  loadPromise = null;
  isLoading = false;
};

/**
 * Preload font in background (call on app init or before export)
 */
export const preloadArabicFont = (): void => {
  if (!cachedFontBase64 && !isLoading) {
    loadEmbeddedArabicFont().catch(console.error);
  }
};
