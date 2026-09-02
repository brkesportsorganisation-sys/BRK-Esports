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
    const { data: dbLogs, error } = await supabaseAdmin
      .from('AdminActivityLog')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(1000);

    const logMap = new Map<string, any>();

    // 1. Add in-memory latest logs
    if (Array.isArray(adminAuditLog)) {
      adminAuditLog.forEach(l => {
        logMap.set(l.id, l);
      });
    }

    // 2. Add database logs
    if (!error && Array.isArray(dbLogs)) {
      dbLogs.forEach(l => {
        logMap.set(l.id, l);
      });
    }

    const mergedLogs = Array.from(logMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ logs: mergedLogs });
  } catch (error: any) {
    console.warn('[GET /api/admin/activity-log]', error);
    return NextResponse.json({ logs: adminAuditLog });
  }
}
