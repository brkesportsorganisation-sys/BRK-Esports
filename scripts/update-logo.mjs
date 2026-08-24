import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Colors
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // BPP
    entry.writeUInt32LE(item.buffer.length, 8); // Size
    entry.writeUInt32LE(offset, 12); // Offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function downloadAndOptimizeLogo() {
  const url = 'https://i.postimg.cc/DfHLr4Tb/Gemini-Generated-Image-yzddgbyzddgbyzdd.jpg';
  console.log('Downloading logo from:', url);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download logo: ${res.statusText}`);
  }
  
  const buffer = Buffer.from(await res.arrayBuffer());
  const publicDir = path.resolve('public');
  const appDir = path.resolve('app');
  
  // 1. Generate 512x512 PNG for logo.png, icon-512.png, and app/icon.png
  const logo512 = await sharp(buffer)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
  
  fs.writeFileSync(path.join(publicDir, 'logo.png'), logo512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), logo512);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), logo512);
  fs.writeFileSync(path.join(appDir, 'icon.png'), logo512);
  
  // 2. Generate 192x192 PNG for PWA icon-192.png
  const icon192 = await sharp(buffer)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
    
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

  // 3. Generate Apple Touch Icon
  const appleIcon = await sharp(buffer)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleIcon);

  // 4. Generate Multi-size Genuine ICO (16, 32, 48)
  const ico16 = await sharp(buffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(buffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(buffer).resize(48, 48).png().toBuffer();

  const icoBuffer = await createIco([
    { width: 16, height: 16, buffer: ico16 },
    { width: 32, height: 32, buffer: ico32 },
    { width: 48, height: 48, buffer: ico48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  
  console.log('Successfully updated logo.png, app/icon.png, app/favicon.ico, public/favicon.ico, and PWA icons!');
}

downloadAndOptimizeLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
