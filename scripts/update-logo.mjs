import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function downloadAndOptimizeLogo() {
  const url = 'https://i.postimg.cc/DfHLr4Tb/Gemini-Generated-Image-yzddgbyzddgbyzdd.jpg';
  console.log('Downloading logo from:', url);
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download logo: ${res.statusText}`);
  }
  
  const buffer = Buffer.from(await res.arrayBuffer());
  const publicDir = path.resolve('public');
  
  // 1. Generate 512x512 PNG for logo.png, icon-512.png, and app/icon.png
  const logo512 = await sharp(buffer)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
  
  fs.writeFileSync(path.join(publicDir, 'logo.png'), logo512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), logo512);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), logo512);
  
  const appDir = path.resolve('app');
  fs.writeFileSync(path.join(appDir, 'icon.png'), logo512);
  
  // 2. Generate 192x192 PNG for PWA icon-192.png
  const icon192 = await sharp(buffer)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
    
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

  // 3. Generate 64x64 favicon
  const favicon64 = await sharp(buffer)
    .resize(64, 64, { fit: 'cover' })
    .png({ quality: 95 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon64);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), favicon64);
  
  console.log('Successfully updated logo.png, app/icon.png, app/favicon.ico, public/favicon.ico, and PWA icons!');
}

downloadAndOptimizeLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
