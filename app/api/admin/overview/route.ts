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
    const [tournamentsRes, usersCountRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from('Tournament')
        .select('id, title, game, mode, format, entryFee, prizePool, maxTeams, registeredCount, matchTime, status, createdAt')
        .order('createdAt', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('User')
        .select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('Payment')
        .select('id, amount, status, trxId, tournamentTitle, userName, method, createdAt')
        .order('createdAt', { ascending: false })
        .limit(200),
    ]);

    const tournaments = tournamentsRes.data || [];
    const totalUsersCount = usersCountRes.count || 0;
    const payments = paymentsRes.data || [];

    const activeTournaments = tournaments.filter(t => t.status === 'UPCOMING' || t.status === 'LIVE').length;
    const pendingPayments = payments.filter(p => p.status === 'PENDING' && !p.trxId?.startsWith('WTH-')).length;
    const verifiedPayments = payments.filter(p => p.status === 'VERIFIED');
    const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Aggregate monthly sales for the last 6 months from real verified payments
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const last6Months: Array<{ month: string; sales: number; monthIdx: number; year: number }> = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: months[d.getMonth()],
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        sales: 0,
      });
    }

    verifiedPayments.forEach(p => {
      if (!p.createdAt) return;
      const pDate = new Date(p.createdAt);
      const match = last6Months.find(m => m.monthIdx === pDate.getMonth() && m.year === pDate.getFullYear());
      if (match) {
        match.sales += Number(p.amount) || 0;
      }
    });

    const monthlySales = last6Months.map(({ month, sales }) => ({ month, sales }));

    // Aggregate real game mode / category distribution from tournaments
    const formatCounts: Record<string, number> = {
      'BR Squad 4v4': 0,
      'BR Duo Battle': 0,
      'CS 4v4 Clash': 0,
      'Solo Survival': 0,
    };

    tournaments.forEach(t => {
      const mode = (t.mode || '').toUpperCase();
      const format = (t.format || '').toUpperCase();
      if (mode === 'SQUAD' && (format.includes('CS') || format.includes('CLASH'))) {
        formatCounts['CS 4v4 Clash'] += 1;
      } else if (mode === 'SQUAD') {
        formatCounts['BR Squad 4v4'] += 1;
      } else if (mode === 'DUO') {
        formatCounts['BR Duo Battle'] += 1;
      } else if (mode === 'SOLO') {
        formatCounts['Solo Survival'] += 1;
      } else {
        formatCounts['BR Squad 4v4'] += 1;
      }
    });

    const donutColors: Record<string, string> = {
      'BR Squad 4v4': '#2563EB',
      'BR Duo Battle': '#10B981',
      'CS 4v4 Clash': '#8B5CF6',
      'Solo Survival': '#EA580C',
    };

    const categoryStats = Object.keys(formatCounts).map(name => ({
      name,
      count: formatCounts[name],
      color: donutColors[name] || '#2563EB',
    }));

    return NextResponse.json({
      totalTournaments: tournaments.length,
      activeTournaments,
      totalUsers: totalUsersCount,
      pendingPayments,
      totalRevenue,
      monthlySales,
      categoryStats,
      recentTournaments: tournaments.slice(0, 6),
      recentPayments: payments.slice(0, 10),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/overview]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch overview metrics.' }, { status: 500 });
  }
}
