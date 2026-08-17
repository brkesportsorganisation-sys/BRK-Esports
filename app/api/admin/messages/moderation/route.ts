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
  if (!session || (!hasPermission(session, 'moderate_messages') && session.role !== 'OWNER' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: flaggedMessages, error } = await supabaseAdmin
      .from('Message')
      .select('*')
      .eq('isFlagged', true)
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/messages/moderation] Supabase warning:', error.message);
      return NextResponse.json({ flaggedMessages: [] });
    }

    return NextResponse.json({ flaggedMessages: flaggedMessages || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/messages/moderation]', error);
    return NextResponse.json({ flaggedMessages: [] }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || (!hasPermission(session, 'moderate_messages') && session.role !== 'OWNER' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json({ message: 'Message ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('Message')
      .delete()
      .eq('id', messageId);

    if (error) throw new Error(error.message);

    logAdminAction(
      session.username || session.email,
      'FLAGGED_MESSAGE_DELETED',
      `Deleted flagged violation message ID: ${messageId}`,
      'Message',
      messageId
    );

    return NextResponse.json({ message: 'Flagged message removed successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/messages/moderation]', error);
    return NextResponse.json({ message: error?.message || 'Failed to remove message.' }, { status: 500 });
  }
}
