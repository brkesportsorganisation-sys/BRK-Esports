import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = isNaN(limitParam) ? 50 : Math.min(limitParam, 100);

    // Fetch user notifications (personal + broadcast notifications)
    const { data: notifications, error } = await supabaseAdmin
      .from('Notification')
      .select('*')
      .or(`userId.eq.${userId},userId.eq.ALL,userId.eq.BROADCAST,userId.is.null`)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[GET /api/notifications] Supabase error:', error.message);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const list = notifications || [];
    const unreadCount = list.filter(n => !n.isRead).length;

    return NextResponse.json({
      notifications: list,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[GET /api/notifications] Error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, markAllAsRead, isRead = true } = body;

    if (markAllAsRead && userId) {
      const { error } = await supabaseAdmin
        .from('Notification')
        .update({ isRead: true })
        .eq('userId', userId)
        .eq('isRead', false);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!id) {
      return NextResponse.json({ message: 'Notification ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('Notification')
      .update({ isRead: Boolean(isRead) })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: 'Notification updated.' });
  } catch (error: any) {
    console.error('[PATCH /api/notifications] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to update notification.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const clearRead = searchParams.get('clearRead') === 'true';

    if (clearRead && userId) {
      const { error } = await supabaseAdmin
        .from('Notification')
        .delete()
        .eq('userId', userId)
        .eq('isRead', true);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, message: 'Read notifications cleared.' });
    }

    if (!id) {
      return NextResponse.json({ message: 'Notification ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('Notification')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: 'Notification deleted.' });
  } catch (error: any) {
    console.error('[DELETE /api/notifications] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete notification.' }, { status: 500 });
  }
}
