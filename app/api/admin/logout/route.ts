import { NextResponse } from 'next/server';
import { clearAdminCookies, logAdminAction } from '@/lib/admin-auth';

export async function POST() {
  logAdminAction('admin', 'AUTH_LOGOUT', 'Admin session terminated');
  const response = NextResponse.json({ ok: true });
  for (const cookie of clearAdminCookies()) {
    response.cookies.set(cookie);
  }
  return response;
}
