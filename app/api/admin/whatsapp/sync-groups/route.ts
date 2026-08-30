import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    return NextResponse.json({
      success: true,
      message: 'Node Bot sync not yet implemented. Please add groups manually.',
      syncedGroups: [],
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/sync-groups]', error);
    return NextResponse.json({ message: 'Failed to sync groups', error: error?.message }, { status: 500 });
  }
}
