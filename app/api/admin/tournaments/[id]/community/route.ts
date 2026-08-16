import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';

async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

function getCsrfToken(request: NextRequest) {
  return request.headers.get('x-csrf-token') || request.headers.get('x-admin-csrf');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const payments = db.getTournamentCommunityUsers(id);
  const users = payments.map((payment) => {
    const user = db.getUsers().find((entry) => entry.id === payment.userId);
    return {
      id: payment.id,
      userId: payment.userId,
      userName: user?.name || payment.userName,
      userEmail: user?.email || payment.userEmail,
      status: payment.status,
      unlockedAt: payment.createdAt,
    };
  });

  return NextResponse.json({ count: users.length, users });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const csrfToken = getCsrfToken(request);
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('admin_csrf')?.value;
  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    return NextResponse.json({ message: 'Invalid CSRF token' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action as 'revoke' | 'grant';
  const userId = body.userId as string | undefined;

  if (!userId || !['revoke', 'grant'].includes(action || '')) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }

  if (action === 'grant') {
    const payment = db.grantCommunityAccess(id, userId);
    if (!payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }
    logAdminAction(session!.email, 'COMMUNITY_ACCESS_GRANT', `Granted community access for ${userId}`);
    return NextResponse.json({ ok: true, payment });
  }

  const payment = db.revokeCommunityAccess(id, userId);
  if (!payment) {
    return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
  }
  logAdminAction(session!.email, 'COMMUNITY_ACCESS_REVOKE', `Revoked community access for ${userId}`);
  return NextResponse.json({ ok: true, payment });
}
