// Amiri Regular Arabic Font - Base64 encoded (subset for common Arabic characters)
// This is a minimal subset to keep file size reasonable

export const loadArabicFont = async (): Promise<string> => {
  // Load Amiri font from CDN and convert to base64
  try {
    const response = await fetch('https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUr.ttf');
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
  } catch (error) {
    console.error('Error loading Arabic font:', error);
    return '';
  }
};

