import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const logoUrl = 'https://i.postimg.cc/52gXtdH4/Gemini-Generated-Image-yzddgbyzddgbyzdd.jpg';
const publicDir = path.resolve('public');
const appDir = path.resolve('app');

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // image count

  const directoryEntries = [];
  let currentOffset = 6 + (16 * count);

  for (let i = 0; i < count; i++) {
    const { buffer, size } = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image data size
    entry.writeUInt32LE(currentOffset, 12); // offset of image data
    directoryEntries.push(entry);
    currentOffset += buffer.length;
  }

  const allBuffers = [header, ...directoryEntries, ...pngBuffers.map(p => p.buffer)];
  return Buffer.concat(allBuffers);
}

async function main() {
  console.log('Fetching new logo from URL:', logoUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  const res = await fetch(logoUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  console.log(`Downloaded image size: ${inputBuffer.length} bytes`);

  const metadata = await sharp(inputBuffer).metadata();
  console.log(`Image format: ${metadata.format}, Dimensions: ${metadata.width}x${metadata.height}`);

  // 1. Generate master logo.png (True PNG format)
  const masterLogoBuffer = await sharp(inputBuffer)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'logo.png'), masterLogoBuffer);
  console.log('Saved public/logo.png');

  // 2. Generate PNG favicon variants
  const icon16 = await sharp(inputBuffer).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const icon32 = await sharp(inputBuffer).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const icon48 = await sharp(inputBuffer).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const icon192 = await sharp(inputBuffer).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const icon512 = await sharp(inputBuffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const appleTouchIcon = await sharp(inputBuffer).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon32);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), appleTouchIcon);

  // App router icons
  if (fs.existsSync(appDir)) {
    fs.writeFileSync(path.join(appDir, 'icon.png'), icon32);
    fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleTouchIcon);
  }

  // 3. Generate true multi-resolution binary ICO files
  const icoBuffer = createIco([
    { buffer: icon16, size: 16 },
    { buffer: icon32, size: 32 },
    { buffer: icon48, size: 48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  if (fs.existsSync(appDir)) {
    fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  }

  console.log('All logo and favicon assets updated successfully!');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
