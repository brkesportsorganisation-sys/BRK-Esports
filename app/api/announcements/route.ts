import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, hasPermission } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('Announcement')
      .select('*')
      .order('isPinned', { ascending: false })
      .order('createdAt', { ascending: false });

    if (category && category !== 'ALL') {
      query = query.eq('category', category);
    }

    const { data: announcements, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { announcements: announcements || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
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

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    const session = await verifyAdminSession(token);

    if (!session || (!hasPermission(session, 'send_notifications') && session.role !== 'OWNER' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Announcement ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('Announcement')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: 'Announcement deleted successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/announcements]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete announcement.' }, { status: 500 });
  }
}
