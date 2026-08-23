import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized access.' }, { status: 401 });
  }

  try {
    // 1. Fetch explicit logs from UserActivityLog table
    const { data: dbLogs } = await supabaseAdmin
      .from('UserActivityLog')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    let logs: any[] = dbLogs || [];

    // 2. Synthesize logs from Payments, Participants, Users, SpinHistory if UserActivityLog is empty or needs aggregation
    if (logs.length < 20) {
      const [usersRes, paymentsRes, participantsRes, spinsRes] = await Promise.all([
        supabaseAdmin.from('User').select('id, name, email, accountNumber, createdAt, isBanned').order('createdAt', { ascending: false }).limit(20),
        supabaseAdmin.from('Payment').select('id, userId, userName, userEmail, method, amount, status, trxId, createdAt').order('createdAt', { ascending: false }).limit(30),
        supabaseAdmin.from('Participant').select('id, userId, squadName, iglName, status, joinedAt').order('joinedAt', { ascending: false }).limit(30),
        supabaseAdmin.from('SpinHistory').select('id, userId, reward, amount, createdAt').order('createdAt', { ascending: false }).limit(20),
      ]);

      const syntheticLogs: any[] = [];

      (usersRes.data || []).forEach(u => {
        syntheticLogs.push({
          id: `log_usr_${u.id}`,
          userId: u.id,
          userName: u.name || 'Player',
          userEmail: u.email || 'N/A',
          accountNumber: u.accountNumber || 'EZBD-USER',
          action: 'SIGNUP',
          details: `New player registered account (${u.email})`,
          createdAt: u.createdAt
        });
      });

      (paymentsRes.data || []).forEach(p => {
        syntheticLogs.push({
          id: `log_pay_${p.id}`,
          userId: p.userId,
          userName: p.userName || 'Player',
          userEmail: p.userEmail || 'N/A',
          accountNumber: 'WALLET',
          action: p.status === 'APPROVED' ? 'DEPOSIT_APPROVED' : 'DEPOSIT_REQUEST',
          details: `${p.method} deposit of ৳${p.amount} (TrxID: ${p.trxId}) - Status: ${p.status}`,
          createdAt: p.createdAt
        });
      });

      (participantsRes.data || []).forEach(pt => {
        syntheticLogs.push({
          id: `log_pt_${pt.id}`,
          userId: pt.userId,
          userName: pt.iglName || pt.squadName || 'Player',
          userEmail: 'REGISTRATION',
          accountNumber: 'SLOT',
          action: 'TOURNAMENT_SLOT_REGISTER',
          details: `Registered squad '${pt.squadName || 'Squad'}' (IGL: ${pt.iglName}) - Status: ${pt.status}`,
          createdAt: pt.joinedAt
        });
      });

      (spinsRes.data || []).forEach(sp => {
        syntheticLogs.push({
          id: `log_sp_${sp.id}`,
          userId: sp.userId,
          userName: 'Player',
          userEmail: 'SPIN_WHEEL',
          accountNumber: 'REWARD',
          action: 'SPIN_WHEEL_CLAIM',
          details: `Claimed lucky spin reward '${sp.reward}' (Amount: ${sp.amount})`,
          createdAt: sp.createdAt
        });
      });

      // Merge and sort by createdAt DESC
      const allMerged = [...logs, ...syntheticLogs];
      const uniqueMap = new Map();
      allMerged.forEach(item => uniqueMap.set(item.id, item));
      logs = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({ logs: logs.slice(0, 100) });
  } catch (error: any) {
    console.warn('[GET /api/admin/user-logs] Error:', error);
    return NextResponse.json({ logs: [] });
  }
}
