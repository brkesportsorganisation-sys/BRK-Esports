import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

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

    let users = [];

    if (targetGroup === 'ALL') {
      users = await prisma.user.findMany({ select: { id: true } });
    } else if (targetGroup === 'TOURNAMENT_PLAYERS') {
      const participants = await prisma.participant.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      users = participants.map(p => ({ id: p.userId }));
    } else {
      return NextResponse.json({ message: 'Invalid target group' }, { status: 400 });
    }

    if (users.length === 0) {
      return NextResponse.json({ message: 'No users found for target group' }, { status: 404 });
    }

    const notificationsData = users.map(user => ({
      userId: user.id,
      title,
      message,
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    return NextResponse.json({ success: true, count: users.length });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
