import { NextResponse } from 'next/server';
import { clearVendorCookies } from '@/lib/vendor-auth';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  const expiredCookies = clearVendorCookies();
  for (const cookie of expiredCookies) {
    response.cookies.set(cookie);
  }
  return response;
}
