import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, hasPermission } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!session || (!hasPermission(session, 'view_financial_reports') && session.role !== 'OWNER' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: unlocks, error } = await supabaseAdmin
      .from('ContactUnlock')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/messages/unlocks] Supabase query warning:', error.message);
      return NextResponse.json({ unlocks: [], totalRevenue: 0, totalCount: 0 });
    }

    const unlockList = unlocks || [];
    const totalRevenue = unlockList.reduce((sum: number, u: any) => sum + (Number(u.amountPaid) || 0), 0);

    return NextResponse.json({
      unlocks: unlockList,
      totalRevenue,
      totalCount: unlockList.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/messages/unlocks]', error);
    return NextResponse.json({ unlocks: [], totalRevenue: 0, totalCount: 0 }, { status: 500 });
  }
}
