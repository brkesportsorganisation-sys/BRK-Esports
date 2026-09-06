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

async function main() {
  const publicDir = path.resolve('public');
  const iconsDir = path.join(publicDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sourcePath = path.join(publicDir, 'ez_logo.jpg');
  console.log('Reading master source from:', sourcePath);
  const sourceBuffer = fs.readFileSync(sourcePath);

  // 1. Standard full-bleed 512x512
  const standard512 = await sharp(sourceBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  // 2. Standard full-bleed 192x192
  const standard192 = await sharp(sourceBuffer)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  // 3. Maskable 512x512 (scaled down to 82% inside a seamless dark metallic background #121320)
  // This guarantees the emblem sits 100% inside the circular / squircle safe zone on Android
  const innerSize512 = Math.round(512 * 0.82); // 420px
  const scaledEmblem512 = await sharp(sourceBuffer)
    .resize(innerSize512, innerSize512, { fit: 'cover' })
    .toBuffer();

  const maskable512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 18, g: 19, b: 32, alpha: 1 },
    },
  })
    .composite([
      {
        input: scaledEmblem512,
        top: Math.round((512 - innerSize512) / 2),
        left: Math.round((512 - innerSize512) / 2),
      },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  // 4. Maskable 192x192
  const innerSize192 = Math.round(192 * 0.82); // 157px
  const scaledEmblem192 = await sharp(sourceBuffer)
    .resize(innerSize192, innerSize192, { fit: 'cover' })
    .toBuffer();

  const maskable192 = await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 18, g: 19, b: 32, alpha: 1 },
    },
  })
    .composite([
      {
        input: scaledEmblem192,
        top: Math.round((192 - innerSize192) / 2),
        left: Math.round((192 - innerSize192) / 2),
      },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  // 5. Apple Touch Icon 180x180
  const appleTouch180 = await sharp(sourceBuffer)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toBuffer();

  // 6. Favicons
  const ico16 = await sharp(sourceBuffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(sourceBuffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(sourceBuffer).resize(48, 48).png().toBuffer();

  const faviconIco = await createIco([
    { width: 16, height: 16, buffer: ico16 },
    { width: 32, height: 32, buffer: ico32 },
    { width: 48, height: 48, buffer: ico48 },
  ]);

  // Write new dedicated icons directory
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), standard192);
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), standard512);
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-192x192.png'), maskable192);
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), maskable512);
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouch180);

  // Write root icons to ensure backward compatibility
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), standard192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), standard512);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), standard512);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch180);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), appleTouch180);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIco);

  console.log('All icons generated successfully in /public/icons/ and /public/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
