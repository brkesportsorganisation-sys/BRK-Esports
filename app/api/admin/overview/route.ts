import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

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
    const [tournamentsRes, usersRes, paymentsRes] = await Promise.all([
      supabaseAdmin.from('Tournament').select('id, status, registeredCount, maxTeams, prizePool'),
      supabaseAdmin.from('User').select('id, isBanned, role'),
      supabaseAdmin.from('Payment').select('*').order('createdAt', { ascending: false }),
    ]);

    const tournaments = tournamentsRes.data || [];
    const users = usersRes.data || [];
    const payments = paymentsRes.data || [];

    const activeTournaments = tournaments.filter(t => t.status === 'UPCOMING' || t.status === 'LIVE').length;
    const pendingPayments = payments.filter(p => p.status === 'PENDING').length;
    const verifiedPayments = payments.filter(p => p.status === 'VERIFIED');
    const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return NextResponse.json({
      totalTournaments: tournaments.length,
      activeTournaments,
      totalUsers: users.length,
      pendingPayments,
      totalRevenue,
      recentPayments: payments.slice(0, 10),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/overview]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch overview metrics.' }, { status: 500 });
  }
}
