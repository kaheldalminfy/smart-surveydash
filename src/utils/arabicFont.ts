// Arabic Font Loader - Uses embedded font file for reliable PDF generation

export const loadArabicFont = async (): Promise<string> => {
  try {
    // Load font from public folder - more reliable than CDN
    const response = await fetch('/fonts/Amiri-Regular.ttf');
    
    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binaryString = '';
    const chunkSize = 32768; // Process in chunks to avoid call stack issues
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binaryString);
  } catch (error) {
    console.error('Error loading Arabic font from local file:', error);
    
    // Fallback: try loading from Google CDN
    try {
      console.log('Attempting fallback to Google CDN...');
      const response = await fetch('https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUr.ttf');
      
      if (!response.ok) {
        throw new Error(`CDN fallback failed: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let binaryString = '';
      const chunkSize = 32768;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      return btoa(binaryString);
    } catch (fallbackError) {
      console.error('Fallback font loading also failed:', fallbackError);
      return '';
    }
  }
};
