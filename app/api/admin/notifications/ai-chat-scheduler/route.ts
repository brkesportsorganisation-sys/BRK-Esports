import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { parseConversationalSchedule } from '@/lib/ai-chat-scheduler';

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
    const body = await req.json();
    const { userMessage, timeZone = 'Asia/Dhaka' } = body;

    if (!userMessage || !userMessage.trim()) {
      return NextResponse.json({ message: 'User message is required.' }, { status: 400 });
    }

    const result = await parseConversationalSchedule(userMessage.trim(), timeZone);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[POST /api/admin/notifications/ai-chat-scheduler] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to process AI schedule command.' }, { status: 500 });
  }
}
