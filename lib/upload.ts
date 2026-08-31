import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

/**
 * Uploads a base64-encoded image to Supabase Storage.
 * Returns the public URL of the uploaded file.
 * If the input is already a URL (not base64), returns it as-is.
 *
 * NOTE: Requires a Supabase Storage bucket named "tournament-images" to exist
 * with public access enabled.
 */
export async function saveBase64Image(
  base64Data: string | undefined | null,
  prefix: string = 'squad-logos/logo'
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
    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, 'base64');

    // Determine file extension
    let extension = 'webp';
    if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (mimeType.includes('svg')) extension = 'svg';

    // Generate unique filename
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '');
    const filename = cleanPrefix.includes('/')
      ? `${cleanPrefix}_${Date.now()}_${uniqueId}.${extension}`
      : `${cleanPrefix}/${cleanPrefix}_${Date.now()}_${uniqueId}.${extension}`;
    const bucketName = 'tournament-images';

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.warn(`[UPLOAD] Supabase Storage upload error:`, error.message);
      return base64Data; // fallback
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    console.info(`[UPLOAD] Image uploaded successfully: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.warn(`[UPLOAD] Failed to save base64 image:`, err?.message);
    return base64Data;
  }
}
