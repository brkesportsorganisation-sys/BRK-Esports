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
    // 1. Fetch recent notifications
    const { data: notifications, error } = await supabaseAdmin
      .from('Notification')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[GET /api/admin/notifications] Supabase warning:', error.message);
      return NextResponse.json({ notifications: [] });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ notifications: [] });
    }

    // 2. Fetch user information for recipients to enrich list
    const userIds = [...new Set(notifications.map(n => n.userId).filter(Boolean))];
    let usersMap: Record<string, { id: string; name: string; email: string; inGameName?: string; freeFireUid?: string; accountNumber?: string }> = {};

    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('User')
        .select('id, name, email, inGameName, freeFireUid, accountNumber')
        .in('id', userIds);

      if (usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    const enrichedNotifications = notifications.map(notif => ({
      ...notif,
      user: usersMap[notif.userId] || {
        id: notif.userId,
        name: 'User ' + notif.userId.slice(-4),
        email: '',
      }
    }));

    return NextResponse.json({ notifications: enrichedNotifications });
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
    const body = await req.json();
    const { title, message, targetGroup, userIds: explicitUserIds, tournamentId, type = 'GENERAL', link = '' } = body;

    if (!title || !message) {
      return NextResponse.json({ message: 'Title and message are required' }, { status: 400 });
    }

    let targetUserIds: string[] = [];

    // Target Audience Resolution
    if (targetGroup === 'SPECIFIC' || targetGroup === 'SINGLE' || targetGroup === 'MULTIPLE' || targetGroup === 'CUSTOM') {
      if (Array.isArray(explicitUserIds) && explicitUserIds.length > 0) {
        targetUserIds = [...new Set(explicitUserIds.filter(Boolean))];
      } else if (typeof explicitUserIds === 'string' && explicitUserIds.trim()) {
        targetUserIds = [explicitUserIds.trim()];
      } else {
        return NextResponse.json({ message: 'No target users specified for direct notification.' }, { status: 400 });
      }
    } else if (targetGroup === 'TOURNAMENT' && tournamentId) {
      const { data: participants, error: pErr } = await supabaseAdmin
        .from('Participant')
        .select('userId')
        .eq('tournamentId', tournamentId);
      
      if (pErr) console.warn('Error fetching tournament participants:', pErr);
      targetUserIds = [...new Set((participants || []).map(p => p.userId).filter(Boolean))];
    } else if (targetGroup === 'TOURNAMENT_PLAYERS') {
      const { data: participants } = await supabaseAdmin
        .from('Participant')
        .select('userId');
      targetUserIds = [...new Set((participants || []).map(p => p.userId).filter(Boolean))];
    } else {
      // Default: ALL users
      const { data: users, error: uErr } = await supabaseAdmin.from('User').select('id');
      if (uErr) throw new Error(uErr.message);
      targetUserIds = (users || []).map(u => u.id).filter(Boolean);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: 'No matching recipient users found in database.' }, { status: 404 });
    }

    // Build notifications records
    const now = new Date().toISOString();
    const fullRecords = targetUserIds.map(uid => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: uid,
      title: title.trim(),
      message: message.trim(),
      type: type || 'GENERAL',
      link: (link || '').trim(),
      isRead: false,
      createdAt: now
    }));

    // Insert in chunks of 150 to avoid payload size limit
    const chunkSize = 150;
    let hasColumnError = false;

    for (let i = 0; i < fullRecords.length; i += chunkSize) {
      const chunk = fullRecords.slice(i, i + chunkSize);
      
      if (!hasColumnError) {
        const { error: insertErr } = await supabaseAdmin.from('Notification').insert(chunk);
        if (insertErr) {
          // If custom column type/link is not yet in Supabase schema, fallback to core columns
          if (insertErr.message?.toLowerCase().includes('column') || insertErr.message?.includes('type') || insertErr.message?.includes('link')) {
            hasColumnError = true;
            const basicChunk = chunk.map(({ type: _, link: __, ...basic }) => basic);
            const { error: basicErr } = await supabaseAdmin.from('Notification').insert(basicChunk);
            if (basicErr) throw new Error(basicErr.message);
          } else {
            throw new Error(insertErr.message);
          }
        }
      } else {
        const basicChunk = chunk.map(({ type: _, link: __, ...basic }) => basic);
        const { error: basicErr } = await supabaseAdmin.from('Notification').insert(basicChunk);
        if (basicErr) throw new Error(basicErr.message);
      }
    }

    logAdminAction(
      session!.email,
      'SEND_NOTIFICATION',
      `Sent notification '${title.trim()}' to ${targetUserIds.length} users (${targetGroup || 'ALL'})`,
      'Notification'
    );

    return NextResponse.json({
      success: true,
      count: targetUserIds.length,
      message: `Notification successfully sent to ${targetUserIds.length} recipient${targetUserIds.length > 1 ? 's' : ''}!`,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/notifications]', error);
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
    
    // Check if JSON body with ids array was passed
    let idsToDelete: string[] = [];
    if (id) {
      idsToDelete = [id];
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body.ids) && body.ids.length > 0) {
          idsToDelete = body.ids;
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ message: 'Notification ID(s) required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('Notification')
      .delete()
      .in('id', idsToDelete);

    if (error) throw new Error(error.message);

    logAdminAction(
      session!.email,
      'DELETE_NOTIFICATION',
      `Deleted ${idsToDelete.length} notification record(s)`,
      'Notification'
    );

    return NextResponse.json({ success: true, message: `Successfully deleted ${idsToDelete.length} notification(s).` });
  } catch (error: any) {
    console.error('[DELETE /api/admin/notifications]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete notification.' }, { status: 500 });
  }
}
