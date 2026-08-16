import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, hasPermission, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session, 'moderate_lfg')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: posts, error } = await supabaseAdmin
      .from('LFGPost')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/lfg] Supabase query warning:', error.message);
      return NextResponse.json({ posts: [] });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/lfg]', error);
    return NextResponse.json({ posts: [] });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'moderate_lfg')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { postId, action, userId } = body;

    if (action === 'RESET_PLAYER_STATUS' && userId) {
      await supabaseAdmin
        .from('User')
        .update({
          playerStatus: 'AVAILABLE',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);

      logAdminAction(
        session.username || session.email,
        'LFG_RESET_STATUS',
        `Reset player status to AVAILABLE for user #${userId}`,
        'User',
        userId
      );

      return NextResponse.json({ message: 'Player status reset to AVAILABLE.' });
    }

    if (action === 'CLOSE' && postId) {
      await supabaseAdmin
        .from('LFGPost')
        .update({ status: 'CLOSED' })
        .eq('id', postId);

      logAdminAction(
        session.username || session.email,
        'LFG_CLOSE_POST',
        `Closed LFG post #${postId}`,
        'LFGPost',
        postId
      );

      return NextResponse.json({ message: 'Post marked as CLOSED.' });
    }

    return NextResponse.json({ message: 'Invalid moderation action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/admin/lfg]', error);
    return NextResponse.json({ message: error?.message || 'Moderation action failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'moderate_lfg')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json({ message: 'Post ID is required.' }, { status: 400 });
    }

    await supabaseAdmin.from('LFGPost').delete().eq('id', postId);

    logAdminAction(
      session.username || session.email,
      'LFG_DELETE_POST',
      `Deleted LFG spam post #${postId}`,
      'LFGPost',
      postId
    );

    return NextResponse.json({ message: 'LFG post removed.' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/lfg]', error);
    return NextResponse.json({ message: error?.message || 'Failed to remove post.' }, { status: 500 });
  }
}
