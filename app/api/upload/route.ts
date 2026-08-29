import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/upload
 * Accepts a multipart/form-data file upload, stores it in Supabase Storage,
 * and returns a public HTTPS URL suitable for use with Green-API / WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are allowed.' }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size must be under 5MB.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const safeExt = allowedExts.includes(ext) ? ext : 'jpg';

    // Unique filename to prevent collisions
    const fileName = `whatsapp-banners/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from('tournament-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[Upload API] Supabase Storage error:', error);
      return NextResponse.json(
        { message: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: publicData } = supabaseAdmin.storage
      .from('tournament-images')
      .getPublicUrl(data.path);

    const publicUrl = publicData?.publicUrl;

    if (!publicUrl || !publicUrl.startsWith('http')) {
      return NextResponse.json({ message: 'Could not generate public URL.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      publicUrl,
      path: publicUrl,
      fileName: data.path,
    });
  } catch (err: any) {
    console.error('[Upload API] Unexpected error:', err);
    return NextResponse.json(
      { message: err?.message || 'Internal server error during upload.' },
      { status: 500 }
    );
  }
}
