import { NextResponse, NextRequest } from 'next/server';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pingStart = performance.now();
  try {
    // 1. Verify Authentication
    const token = request.cookies.get('admin_session')?.value;
    const session = verifyAdminSession(token);
    if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'OWNER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Define Table Metadata & Categories
    const tableConfigs = [
      { name: 'User', category: 'USERS', label: 'Registered Players', icon: 'User' },
      { name: 'AdminAccount', category: 'USERS', label: 'Admin Accounts', icon: 'Shield' },
      { name: 'AdminActivityLog', category: 'USERS', label: 'Admin Audit Logs', icon: 'FileText' },
      { name: 'Tournament', category: 'GAMING', label: 'Tournaments', icon: 'Trophy' },
      { name: 'Participant', category: 'GAMING', label: 'Match Registrations', icon: 'Users' },
      { name: 'Match', category: 'GAMING', label: 'Game Matches', icon: 'Gamepad2' },
      { name: 'Team', category: 'GAMING', label: 'Squads & Teams', icon: 'ShieldCheck' },
      { name: 'Duel', category: 'GAMING', label: 'Custom 1v1 Duels', icon: 'Swords' },
      { name: 'Payment', category: 'FINANCE', label: 'Wallet Transactions', icon: 'CreditCard' },
      { name: 'ShopOrder', category: 'FINANCE', label: 'Shop Orders', icon: 'ShoppingBag' },
      { name: 'ShopProduct', category: 'FINANCE', label: 'Shop Inventory Items', icon: 'Package' },
      { name: 'SiteSetting', category: 'CONFIG', label: 'System Configurations', icon: 'Settings' },
      { name: 'Banner', category: 'CONFIG', label: 'Promotional Banners', icon: 'Image' },
      { name: 'Announcement', category: 'COMMUNITY', label: 'Official Notices', icon: 'Bell' },
      { name: 'Message', category: 'COMMUNITY', label: 'Chat Messages', icon: 'MessageSquare' },
      { name: 'LFGPost', category: 'COMMUNITY', label: 'Squad Finder Posts', icon: 'UserPlus' },
      { name: 'LFGComment', category: 'COMMUNITY', label: 'LFG Recruitment Replies', icon: 'MessageCircle' },
      { name: 'DeleteRequest', category: 'USERS', label: 'Account Deletion Requests', icon: 'Trash2' },
    ];

    // 3. Fetch Row Counts & Latest Record Timestamp in parallel
    const promises = tableConfigs.map(async (table) => {
      try {
        const [countRes, latestRes] = await Promise.all([
          supabaseAdmin.from(table.name).select('*', { count: 'exact', head: true }),
          supabaseAdmin.from(table.name).select('createdAt').order('createdAt', { ascending: false }).limit(1).maybeSingle(),
        ]);

        const count = countRes.count || 0;
        const lastUpdated = latestRes.data?.createdAt || null;

        return {
          name: table.name,
          category: table.category,
          label: table.label,
          icon: table.icon,
          count,
          lastUpdated,
          error: Boolean(countRes.error),
        };
      } catch (err) {
        return {
          name: table.name,
          category: table.category,
          label: table.label,
          icon: table.icon,
          count: 0,
          lastUpdated: null,
          error: true,
        };
      }
    });

    // 4. Also fetch Key Performance & Integrity Indicators
    const [tableResults, userStatsRes, paymentStatsRes, tournamentStatsRes] = await Promise.all([
      Promise.all(promises),
      supabaseAdmin.from('User').select('isBanned, isVerified'),
      supabaseAdmin.from('Payment').select('status, amount'),
      supabaseAdmin.from('Tournament').select('status'),
    ]);

    const pingEnd = performance.now();
    const pingLatencyMs = Math.round(pingEnd - pingStart);

    // Active tables and row aggregation
    const validTables = tableResults.filter((t) => !t.error);
    const totalRows = validTables.reduce((sum, t) => sum + t.count, 0);

    // Users Health
    const users = userStatsRes.data || [];
    const bannedUsersCount = users.filter((u) => u.isBanned).length;
    const activeUsersCount = users.length - bannedUsersCount;

    // Payments Health
    const payments = paymentStatsRes.data || [];
    const verifiedPaymentsCount = payments.filter((p) => p.status === 'VERIFIED').length;
    const pendingPaymentsCount = payments.filter((p) => p.status === 'PENDING').length;
    const totalVerifiedVolume = payments
      .filter((p) => p.status === 'VERIFIED')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Tournaments Health
    const tournaments = tournamentStatsRes.data || [];
    const liveTournamentsCount = tournaments.filter((t) => t.status === 'LIVE' || t.status === 'UPCOMING').length;

    // Category Aggregations
    const categories = ['GAMING', 'FINANCE', 'USERS', 'COMMUNITY', 'CONFIG'].map((cat) => {
      const catTables = validTables.filter((t) => t.category === cat);
      const catRows = catTables.reduce((sum, t) => sum + t.count, 0);
      return {
        category: cat,
        totalRows: catRows,
        tablesCount: catTables.length,
        percentage: totalRows > 0 ? ((catRows / totalRows) * 100).toFixed(1) : '0',
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        timestamp: new Date().toISOString(),
        connection: {
          status: 'CONNECTED',
          databaseEngine: 'PostgreSQL 15 (Supabase Cloud)',
          pingLatencyMs,
        },
        summary: {
          totalRows,
          totalTables: validTables.length,
          categories,
        },
        integrity: {
          users: {
            total: users.length,
            active: activeUsersCount,
            banned: bannedUsersCount,
          },
          payments: {
            total: payments.length,
            verified: verifiedPaymentsCount,
            pending: pendingPaymentsCount,
            totalVolume: totalVerifiedVolume,
          },
          tournaments: {
            total: tournaments.length,
            active: liveTournamentsCount,
          },
        },
        tables: validTables.sort((a, b) => b.count - a.count),
      },
    });
  } catch (error) {
    console.error('Database API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
