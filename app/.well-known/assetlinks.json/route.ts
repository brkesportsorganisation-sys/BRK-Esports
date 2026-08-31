import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      });
    }

    // Default fallback
    const fallback = [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.ezbd.app',
          sha256_cert_fingerprints: [
            '14:6D:E9:7D:0F:52:AB:6C:AE:34:F8:8C:7C:F4:14:8B:6C:5B:3C:D3:5F:8C:BE:3D:4E:9F:8A:2C:1B:3D:4E:5F',
          ],
        },
      },
    ];

    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
