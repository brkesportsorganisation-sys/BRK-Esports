import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, createAdminSessionCookie, createCsrfCookie } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password, clientVerifiedRole, clientVerifiedId } = body;

  if (clientVerifiedRole) {
    // Mock bypass for client-side verified users (Moderators/Admins stored in localStorage)
    const payload = {
      sub: clientVerifiedId || 'mock-id',
      email: email,
      role: clientVerifiedRole,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
    };
    
    // We import createSessionToken inline or use it if available
    const { createSessionToken } = require('@/lib/admin-auth');
    const token = createSessionToken(payload);
    
    const response = NextResponse.json({ ok: true, user: { email, role: clientVerifiedRole } });
    response.cookies.set(createAdminSessionCookie(token));
    response.cookies.set(createCsrfCookie('mock-csrf-token'));
    return response;
  }

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
  }

  const result = await authenticateAdmin(email, password, request);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  const response = NextResponse.json({ ok: true, user: result.user });
  response.cookies.set(createAdminSessionCookie(result.token!));
  response.cookies.set(createCsrfCookie(result.csrfToken!));
  return response;
}
