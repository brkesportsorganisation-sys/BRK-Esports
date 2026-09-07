import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, hasPermission, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { serverCache } from '@/lib/server-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// Format Date to YYYY-MM-DD (safe UTC/ISO representation)
function toDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function formatReadableDate(dateKey: string): string {
  if (!dateKey) return '';
  try {
    const [year, month, day] = dateKey.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

export async function GET(request: NextRequest) {
  // 1. Authenticate Admin Session
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const isAllowed = 
    requireAdminRole(session, ['OWNER', 'SUPER_ADMIN', 'ADMIN']) || 
    hasPermission(session, 'manage_users') || 
    hasPermission(session, 'view_dashboard');

  if (!isAllowed) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  // 2. Check Server Cache (TTL 60 seconds) to protect database and hosting
  const CACHE_KEY = 'admin_user_analytics_cache';
  if (!forceRefresh) {
    const cachedData = serverCache.get<any>(CACHE_KEY);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }
  }

  try {
    // 3. Query only essential User fields
    const { data: users, error } = await supabaseAdmin
      .from('User')
      .select('id, name, email, avatar, role, freeFireUid, inGameName, isBanned, referralCode, createdAt, isVerified, phone, whatsApp')
      .order('createdAt', { ascending: true });

    if (error) {
      console.error('[GET /api/admin/analytics/users] Database error:', error.message);
      return NextResponse.json({ message: 'Failed to fetch user analytics.' }, { status: 500 });
    }

    const userList = users || [];
    const totalUsers = userList.length;

    // 4. Time calculations
    const now = new Date();
    const todayKey = toDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Grouping maps
    const dayMap: Record<string, any[]> = {};
    const hourlyDistribution: Array<{ hour: number; label: string; count: number }> = Array.from({ length: 24 }, (_, i) => {
      const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
      const ampm = i >= 12 ? 'PM' : 'AM';
      return {
        hour: i,
        label: `${hour12} ${ampm}`,
        count: 0,
      };
    });

    let verifiedCount = 0;
    let uidLinkedCount = 0;
    let phoneLinkedCount = 0;

    let last7DaysCount = 0;
    let last14DaysCount = 0;
    let last30DaysCount = 0;
    let last90DaysCount = 0;

    userList.forEach((u) => {
      if (u.isVerified) verifiedCount++;
      if (u.freeFireUid && String(u.freeFireUid).trim() !== '') uidLinkedCount++;
      if (u.phone || u.whatsApp) phoneLinkedCount++;

      const createdAtDate = new Date(u.createdAt);
      if (isNaN(createdAtDate.getTime())) return;

      const dateKey = toDateKey(createdAtDate);
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = [];
      }
      dayMap[dateKey].push({
        id: u.id,
        name: u.name || 'Anonymous User',
        inGameName: u.inGameName || '',
        email: u.email || '',
        avatar: u.avatar || '',
        freeFireUid: u.freeFireUid || '',
        role: u.role || 'USER',
        isVerified: Boolean(u.isVerified),
        createdAt: u.createdAt,
      });

      // Hour distribution
      const hour = createdAtDate.getHours();
      if (hourlyDistribution[hour]) {
        hourlyDistribution[hour].count++;
      }

      // Range totals
      if (createdAtDate >= sevenDaysAgo) last7DaysCount++;
      if (createdAtDate >= fourteenDaysAgo) last14DaysCount++;
      if (createdAtDate >= thirtyDaysAgo) last30DaysCount++;
      if (createdAtDate >= ninetyDaysAgo) last90DaysCount++;
    });

    const todayCount = (dayMap[todayKey] || []).length;
    const yesterdayCount = (dayMap[yesterdayKey] || []).length;

    // Earliest recorded user date
    const earliestDateKey = userList.length > 0 && userList[0].createdAt
      ? toDateKey(userList[0].createdAt)
      : todayKey;

    // Build dense daily series from earliest date to today (filling 0 for days without joins)
    const dailySeries: Array<{
      date: string;
      formattedDate: string;
      count: number;
      cumulativeCount: number;
      users: any[];
    }> = [];

    let currentCursor = new Date(earliestDateKey + 'T00:00:00Z');
    const endCursor = new Date(todayKey + 'T00:00:00Z');
    let runningTotal = 0;

    // Safety limit to avoid runaway loops
    let loopGuard = 0;
    while (currentCursor <= endCursor && loopGuard < 3000) {
      loopGuard++;
      const dKey = toDateKey(currentCursor);
      const joinedOnDay = dayMap[dKey] || [];
      const dayCount = joinedOnDay.length;
      runningTotal += dayCount;

      dailySeries.push({
        date: dKey,
        formattedDate: formatReadableDate(dKey),
        count: dayCount,
        cumulativeCount: runningTotal,
        users: joinedOnDay,
      });

      currentCursor.setUTCDate(currentCursor.getUTCDate() + 1);
    }

    // Determine Peak (Max) Join Day and Minimum Join Day
    let maxJoinDay: { date: string; formattedDate: string; count: number } | null = null;
    let minJoinDay: { date: string; formattedDate: string; count: number } | null = null;

    // We calculate min active day (days with at least 1 join, or minimum of active days)
    const activeDays = Object.entries(dayMap).map(([d, users]) => ({
      date: d,
      formattedDate: formatReadableDate(d),
      count: users.length,
    }));

    if (activeDays.length > 0) {
      // Sort by count descending for max
      activeDays.sort((a, b) => b.count - a.count);
      maxJoinDay = activeDays[0];

      // Sort ascending for min
      activeDays.sort((a, b) => a.count - b.count);
      minJoinDay = activeDays[0];
    }

    const totalDaysCount = dailySeries.length || 1;
    const averageDaily = Number((totalUsers / totalDaysCount).toFixed(2));

    // Recent 20 users
    const recentUsers = [...userList]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((u) => ({
        id: u.id,
        name: u.name || 'Anonymous User',
        inGameName: u.inGameName || '',
        email: u.email || '',
        avatar: u.avatar || '',
        freeFireUid: u.freeFireUid || '',
        role: u.role || 'USER',
        isVerified: Boolean(u.isVerified),
        createdAt: u.createdAt,
      }));

    const payload = {
      success: true,
      summary: {
        totalUsers,
        todayCount,
        yesterdayCount,
        last7DaysCount,
        last14DaysCount,
        last30DaysCount,
        last90DaysCount,
        maxJoinDay: maxJoinDay || { date: todayKey, formattedDate: formatReadableDate(todayKey), count: 0 },
        minJoinDay: minJoinDay || { date: todayKey, formattedDate: formatReadableDate(todayKey), count: 0 },
        averageDaily,
        verifiedCount,
        uidLinkedCount,
        phoneLinkedCount,
        verifiedPercentage: totalUsers > 0 ? Math.round((verifiedCount / totalUsers) * 100) : 0,
        uidLinkedPercentage: totalUsers > 0 ? Math.round((uidLinkedCount / totalUsers) * 100) : 0,
      },
      dailySeries,
      hourlyDistribution,
      recentUsers,
      generatedAt: new Date().toISOString(),
    };

    // Cache for 60 seconds
    serverCache.set(CACHE_KEY, payload, 60);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/analytics/users] Error:', err);
    return NextResponse.json({ message: err?.message || 'Server error computing analytics.' }, { status: 500 });
  }
}
