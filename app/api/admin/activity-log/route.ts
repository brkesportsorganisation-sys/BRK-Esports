import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, isOwner, adminAuditLog } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!session || !isOwner(session)) {
    return NextResponse.json({ message: 'Only Platform Owner can view the activity audit log.' }, { status: 403 });
  }

  try {
    const { data: logs, error } = await supabaseAdmin
      .from('AdminActivityLog')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error || !logs || logs.length === 0) {
      return NextResponse.json({ logs: adminAuditLog });
    }

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.warn('[GET /api/admin/activity-log]', error);
    return NextResponse.json({ logs: adminAuditLog });
  }
}
