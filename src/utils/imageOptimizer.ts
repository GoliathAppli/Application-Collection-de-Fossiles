export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates an HTMLImageElement from a URL/dataURI
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

/**
 * Crops and optimizes an image with maximum dimensions and JPEG compression
 */
export async function getCroppedAndOptimizedImg(
  imageSrc: string,
  pixelCrop?: CropArea | null,
  maxDimension: number = 1920,
  quality: number = 0.90
): Promise<string> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Impossible d'obtenir le contexte 2D du canvas");
    }

    const cropX = pixelCrop && pixelCrop.width > 0 ? pixelCrop.x : 0;
    const cropY = pixelCrop && pixelCrop.height > 0 ? pixelCrop.y : 0;
    const sourceWidth = pixelCrop && pixelCrop.width > 0 ? pixelCrop.width : image.naturalWidth || image.width;
    const sourceHeight = pixelCrop && pixelCrop.height > 0 ? pixelCrop.height : image.naturalHeight || image.height;

    // Calculate scaled dimensions to keep memory and storage optimal
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    targetWidth = Math.max(1, Math.round(targetWidth));
    targetHeight = Math.max(1, Math.round(targetHeight));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Fill white background in case source is transparent when converting to jpeg
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      cropX,
      cropY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // Prefer high quality JPEG for photographs to keep storage fast & lightweight
    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.error("Erreur lors de l'optimisation de l'image:", err);
    // Fallback: return original imageSrc if anything fails
    return imageSrc;
  }
}

/**
 * Optimizes a raw file/base64 without cropping
 */
export async function optimizeRawImage(
  imageSrc: string,
  maxDimension: number = 1920,
  quality: number = 0.90
): Promise<string> {
  return getCroppedAndOptimizedImg(imageSrc, null, maxDimension, quality);
}
