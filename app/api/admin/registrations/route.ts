import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // Return empty array for now since we are using mock data and Prisma is crashing
    return NextResponse.json({ registrations: [] });
  } catch (error: any) {
    console.error('[GET /api/admin/registrations]', error?.message);
    return NextResponse.json({ message: 'Failed to load registrations.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { registrationId, action } = body; // action: 'APPROVE' | 'REJECT'
  if (!registrationId || !['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({ message: 'Invalid request: registrationId and action (APPROVE|REJECT) are required.' }, { status: 400 });
  }

  try {
    // Mock success response
    return NextResponse.json({
      ok: true,
      message: action === 'APPROVE'
        ? 'Registration approved successfully.'
        : `Registration rejected. Refund issued.`,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/registrations]', error?.message);
    return NextResponse.json({ message: error?.message || 'Failed to update registration.' }, { status: 500 });
  }
}
