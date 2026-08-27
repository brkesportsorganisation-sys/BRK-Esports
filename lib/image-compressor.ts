/**
 * Client-Side Smart Image Compressor
 * - Automatically downsizes high-resolution images (4K, 1080p, heavy mobile camera photos).
 * - Converts heavy PNG/JPG files to ultra-lightweight, high-fidelity WebP (or JPEG fallback).
 * - Drastically reduces image sizes by 80%–95% (e.g., 5 MB -> 80 KB) for instant web loading.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  savedPercent: number;
  width: number;
  height: number;
  mimeType: string;
}

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling preserving aspect ratio
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
          return reject(new Error('Canvas 2D context unavailable.'));
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = '';
        let chosenMime = format;
        try {
          dataUrl = canvas.toDataURL(format, quality);
          // If browser doesn't support webp export, it returns png/blank
          if (!dataUrl.startsWith('data:image/webp') && format === 'image/webp') {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            chosenMime = 'image/jpeg';
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          chosenMime = 'image/jpeg';
        }

        // Estimate compressed size in bytes from base64 length
        const base64Content = dataUrl.split(',')[1] || '';
        const compressedSizeBytes = Math.round((base64Content.length * 3) / 4);
        const originalSizeBytes = file.size;
        const savedPercent = Math.max(
          0,
          Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
        );

        resolve({
          dataUrl,
          originalSizeBytes,
          compressedSizeBytes,
          originalSizeFormatted: formatBytes(originalSizeBytes),
          compressedSizeFormatted: formatBytes(compressedSizeBytes),
          savedPercent,
          width,
          height,
          mimeType: chosenMime,
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
