import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, createAdminSessionCookie, createCsrfCookie } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;

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
