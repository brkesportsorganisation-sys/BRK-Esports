import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin.from('Announcement').select('*').order('createdAt', { ascending: false });
    if (category && category !== 'ALL') {
      query = query.eq('category', category);
    }

    const { data: announcements, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ announcements: announcements || [] });
  } catch (error: any) {
    console.error('[GET /api/announcements]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch announcements.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category = 'GENERAL', isPinned = false } = body;

    if (!title || !content) {
      return NextResponse.json({ message: 'Title and content are required.' }, { status: 400 });
    }

    const newAnnouncement = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      content: content.trim(),
      category,
      isPinned: Boolean(isPinned),
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('Announcement')
      .insert([newAnnouncement])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ announcement: data, message: 'Announcement posted successfully.' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/announcements]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create announcement.' }, { status: 500 });
  }
}
