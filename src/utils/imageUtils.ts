/**
 * Utility for client-side image compression, validation, and storage.
 * Compresses uploaded product image files into lightweight data URLs
 * to ensure fast rendering, low memory footprint, and reliable local persistence.
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, WebP, or GIF).',
    };
  }

  // Max 10MB raw file size check before compression
  if (file.size > 10 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Image file is too large (maximum 10MB).',
    };
  }

  return { valid: true };
}

/**
 * Compresses an image file using an offscreen canvas.
 * Resizes images exceeding max dimensions while preserving aspect ratio.
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Failed to load image for compression.'));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio downscale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to uncompressed data url if canvas context unavailable
          resolve(event.target?.result as string);
          return;
        }

        // Use high quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP if supported, otherwise JPEG
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(event.target?.result as string);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
