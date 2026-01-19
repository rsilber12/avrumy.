const MAX_SIZE_BYTES = 512 * 1024; // 512KB
const MIN_SIZE_BYTES = 450 * 1024; // 450KB minimum target

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
}

/**
 * Compress an image using canvas to get it under 512KB but above 450KB
 */
export async function compressImageClient(imageUrl: string): Promise<CompressionResult> {
  // Fetch the original image to get its size
  const response = await fetch(imageUrl);
  const originalBlob = await response.blob();
  const originalSize = originalBlob.size;

  // If already under 512KB, no compression needed
  if (originalSize <= MAX_SIZE_BYTES) {
    return { blob: originalBlob, originalSize, newSize: originalSize };
  }

  // Load image into canvas
  const img = await loadImage(imageUrl);
  
  // Calculate target dimensions based on file size reduction needed
  const targetRatio = Math.sqrt(MAX_SIZE_BYTES / originalSize) * 0.95; // 95% safety margin
  let width = Math.round(img.width * targetRatio);
  let height = Math.round(img.height * targetRatio);

  // Create canvas and draw resized image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  // Try different quality levels to get optimal file size
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  // If still too large, reduce quality
  while (blob.size > MAX_SIZE_BYTES && quality > 0.5) {
    quality -= 0.05;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  // If too small and we have room to increase quality, try to get closer to target
  if (blob.size < MIN_SIZE_BYTES && quality < 0.92) {
    // Try larger dimensions with current quality
    const largerRatio = Math.sqrt(MAX_SIZE_BYTES / originalSize) * 0.98;
    width = Math.round(img.width * largerRatio);
    height = Math.round(img.height * largerRatio);
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    const largerBlob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    if (largerBlob.size <= MAX_SIZE_BYTES) {
      blob = largerBlob;
    }
  }

  return {
    blob,
    originalSize,
    newSize: blob.size,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      type,
      quality
    );
  });
}
