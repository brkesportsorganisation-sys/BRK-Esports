import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('Notification')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[GET /api/admin/notifications] Supabase warning:', error.message);
      return NextResponse.json({ notifications: [] });
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ notifications: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, message, targetGroup } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ message: 'Missing title or message' }, { status: 400 });
    }

    let userIds: string[] = [];

    if (targetGroup === 'ALL' || !targetGroup) {
      const { data: users } = await supabaseAdmin.from('User').select('id');
      userIds = (users || []).map(u => u.id);
    } else if (targetGroup === 'TOURNAMENT_PLAYERS') {
      const { data: participants } = await supabaseAdmin.from('Participant').select('userId');
      userIds = [...new Set((participants || []).map(p => p.userId).filter(Boolean))];
    } else {
      const { data: users } = await supabaseAdmin.from('User').select('id');
      userIds = (users || []).map(u => u.id);
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users found for target group' }, { status: 404 });
    }

    const notificationsData = userIds.map(uid => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: uid,
      title: title.trim(),
      message: message.trim(),
      isRead: false,
      createdAt: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin.from('Notification').insert(notificationsData);
    if (error) {
      throw new Error(error.message);
    }

    logAdminAction(
      session!.email,
      'BROADCAST_NOTIFICATION',
      `Sent notification '${title}' to ${userIds.length} users`,
      'Notification'
    );

    return NextResponse.json({ success: true, count: userIds.length, message: `Notification broadcast to ${userIds.length} players!` });
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Notification ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('Notification')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ message: 'Notification deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete notification.' }, { status: 500 });
  }
}
