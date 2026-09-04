import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import sharp from 'sharp';

/**
 * Uploads a base64-encoded image to Supabase Storage with automated WebP compression.
 * Returns the public CDN URL of the uploaded file.
 * If Supabase Storage upload fails, returns a highly compressed lightweight WebP data URI.
 */
export async function saveBase64Image(
  base64Data: string | undefined | null,
  prefix: string = 'squad-logos/logo',
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string | null> {
  if (!base64Data) return null;

  // If it's already a URL or path, return it unchanged
  if (!base64Data.startsWith('data:image/')) {
    return base64Data;
  }

  // Parse the base64 string
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64Data;
  }

  try {
    const rawBase64 = matches[2];
    const rawBuffer = Buffer.from(rawBase64, 'base64');

    const isAvatarOrLogo = prefix.includes('avatar') || prefix.includes('logo');
    const maxWidth = options.maxWidth || (isAvatarOrLogo ? 250 : 1280);
    const maxHeight = options.maxHeight || (isAvatarOrLogo ? 250 : 720);
    const quality = options.quality || 80;

    // Compress to WebP using sharp
    let compressedBuffer: Buffer;
    try {
      compressedBuffer = await sharp(rawBuffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    } catch {
      compressedBuffer = rawBuffer;
    }

    // Generate unique filename
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
    const filename = cleanPrefix.includes('/')
      ? `${cleanPrefix}_${Date.now()}_${uniqueId}.webp`
      : `${cleanPrefix}/${cleanPrefix}_${Date.now()}_${uniqueId}.webp`;
    const bucketName = 'tournament-images';

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filename, compressedBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      if (publicUrlData?.publicUrl) {
        console.info(`[UPLOAD] Image uploaded successfully: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;
      }
    }

    console.warn(`[UPLOAD] Supabase Storage upload note: ${error?.message || 'Fallback to compressed WebP'}`);
    return `data:image/webp;base64,${compressedBuffer.toString('base64')}`;
  } catch (err: any) {
    console.warn(`[UPLOAD] Failed to save base64 image:`, err?.message);
    return base64Data;
  }
}

