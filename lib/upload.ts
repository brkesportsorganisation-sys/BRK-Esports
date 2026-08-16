import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Decodes a base64 image and saves it to the public/uploads directory.
 * Returns the public relative URL of the saved file.
 * If the input is not a base64 string, returns it as-is.
 */
export async function saveBase64Image(base64Data: string | undefined | null, prefix: string): Promise<string | null> {
  if (!base64Data) return null;

  // If it's already a URL or path, just return it
  if (!base64Data.startsWith('data:image/')) {
    return base64Data;
  }

  // Parse the base64 string
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data format');
  }

  const mimeType = matches[1];
  const base64Content = matches[2];
  const buffer = Buffer.from(base64Content, 'base64');

  // Determine file extension
  let extension = 'webp';
  if (mimeType.includes('png')) {
    extension = 'png';
  } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    extension = 'jpg';
  } else if (mimeType.includes('gif')) {
    extension = 'gif';
  }

  // Ensure public/uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Generate unique filename
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const filename = `${prefix}_${uniqueId}.${extension}`;
  const filepath = path.join(uploadsDir, filename);

  // Write file to disk
  fs.writeFileSync(filepath, buffer);

  console.info(`[UPLOAD] Image saved successfully to ${filepath}`);
  return `/uploads/${filename}`;
}
