import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

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

  const { data: payments, error } = await supabaseAdmin
    .from('Payment')
    .select('*')
    .eq('tournamentId', id)
    .eq('communityAccessUnlocked', true)
    .neq('communityAccessRevoked', true);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const users = (payments || []).map((payment: any) => ({
    id: payment.id,
    userId: payment.userId,
    userName: payment.userName,
    userEmail: payment.userEmail,
    status: payment.status,
    unlockedAt: payment.createdAt,
  }));

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

  const isGrant = action === 'grant';

  const { data: payment, error } = await supabaseAdmin
    .from('Payment')
    .update({
      communityAccessUnlocked: isGrant,
      communityAccessRevoked: !isGrant,
      updatedAt: new Date().toISOString(),
    })
    .eq('tournamentId', id)
    .eq('userId', userId)
    .select()
    .single();

  if (error || !payment) {
    return NextResponse.json({ message: error?.message || 'Payment not found' }, { status: error ? 500 : 404 });
  }

  logAdminAction(
    session!.email,
    isGrant ? 'COMMUNITY_ACCESS_GRANT' : 'COMMUNITY_ACCESS_REVOKE',
    `${isGrant ? 'Granted' : 'Revoked'} community access for user ${userId} in tournament ${id}`
  );

  return NextResponse.json({ ok: true, payment });
}
