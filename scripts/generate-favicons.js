const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
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
  const sourcePath = path.join(__dirname, '../public/logo.png');
  const publicDir = path.join(__dirname, '../public');
  const appDir = path.join(__dirname, '../app');

  console.log('Reading source image from:', sourcePath);
  const sourceBuffer = fs.readFileSync(sourcePath);

  // 1. Generate full-res PNG logo
  const logoPng = await sharp(sourceBuffer).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'logo.png'), logoPng);
  console.log('Generated public/logo.png (genuine PNG)');

  // 2. Generate 192x192 & 512x512 icons
  const icon192 = await sharp(sourceBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  console.log('Generated public/icon-192.png');

  const icon512 = await sharp(sourceBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon512);
  fs.writeFileSync(path.join(appDir, 'icon.png'), icon512);
  console.log('Generated public/icon-512.png, public/icon.png, app/icon.png');

  // 3. Generate Apple Touch Icon (180x180)
  const appleIcon = await sharp(sourceBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleIcon);
  console.log('Generated apple touch icons');

  // 4. Generate Multi-size favicon.ico (16, 32, 48)
  const ico16 = await sharp(sourceBuffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(sourceBuffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(sourceBuffer).resize(48, 48).png().toBuffer();

  const icoBuffer = await createIco([
    { width: 16, height: 16, buffer: ico16 },
    { width: 32, height: 32, buffer: ico32 },
    { width: 48, height: 48, buffer: ico48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('Generated genuine public/favicon.ico and app/favicon.ico');

  console.log('All icons generated successfully!');
}

main().catch(console.error);
