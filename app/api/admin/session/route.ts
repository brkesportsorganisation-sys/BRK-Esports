import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole, verifyAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  const session = verifyAdminSession(token);

  if (!session || !requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: session.email,
      role: session.role,
    },
    exp: session.exp,
  });
}
