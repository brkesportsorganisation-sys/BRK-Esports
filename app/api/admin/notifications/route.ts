import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
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

    if (targetGroup === 'ALL') {
      const { data: users } = await supabaseAdmin.from('User').select('id');
      userIds = (users || []).map(u => u.id);
    } else if (targetGroup === 'TOURNAMENT_PLAYERS') {
      const { data: participants } = await supabaseAdmin.from('Participant').select('userId');
      userIds = [...new Set((participants || []).map(p => p.userId).filter(Boolean))];
    } else {
      return NextResponse.json({ message: 'Invalid target group' }, { status: 400 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users found for target group' }, { status: 404 });
    }

    const notificationsData = userIds.map(uid => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: uid,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin.from('Notification').insert(notificationsData);
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, count: userIds.length });
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
