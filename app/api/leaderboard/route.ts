import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSquads } from '@/lib/squads';
import { serverCache, CACHE_TTL } from '@/lib/server-cache';

const LEADERBOARD_CACHE_KEY = 'api:leaderboard';

export async function GET() {
  try {
    // 1. Serve from cache if available (reduces DB egress dramatically)
    const cached = serverCache.get<{ players: any[]; teams: any[]; referrals: any[] }>(LEADERBOARD_CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { success: true, ...cached },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300', 'X-Cache': 'HIT' } }
      );
    }

    // 2. Fetch from DB
    const [playersRes, squads, referralsRes] = await Promise.all([
      supabaseAdmin
        .from('User')
        .select('id, name, avatar, freeFireUid, inGameName, totalKills, totalWins, earnings')
        .eq('isBanned', false)
        .order('earnings', { ascending: false })
        .limit(30),
      getSquads(),
      supabaseAdmin
        .from('User')
        .select('id, name, avatar, freeFireUid, inGameName, referralCode, totalReferrals, claimedMilestones, coinBalance, promoBalance, earnings, createdAt')
        .eq('isBanned', false)
        .order('totalReferrals', { ascending: false })
        .order('createdAt', { ascending: true })
        .limit(50),
    ]);

    const players = (playersRes.data || []).map((u, index) => ({
      rank: index + 1,
      id: u.id,
      name: u.inGameName || u.name || 'Player',
      avatar: u.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      ffUid: u.freeFireUid || 'N/A',
      kills: Number(u.totalKills) || 0,
      wins: Number(u.totalWins) || 0,
      earnings: Number(u.earnings) || 0,
    }));

    // Sort squads by earnings (desc), then matchesWon (desc), then totalKills (desc)
    const sortedSquads = [...squads].sort((a, b) => {
      const earnDiff = (b.totalEarnings || 0) - (a.totalEarnings || 0);
      if (earnDiff !== 0) return earnDiff;
      const winDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
      if (winDiff !== 0) return winDiff;
      return (b.totalKills || 0) - (a.totalKills || 0);
    });

    const teams = sortedSquads.map((sq, index) => ({
      rank: index + 1,
      id: sq.id,
      name: sq.name,
      tag: sq.tag,
      avatar: sq.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      logo: sq.logoUrl,
      captainName: sq.leaderName,
      captainId: sq.leaderId,
      membersCount: (sq.members || []).filter(m => m.status === 'ACTIVE').length || 1,
      game: sq.game || 'FREE_FIRE',
      kills: Number(sq.totalKills) || 0,
      wins: Number(sq.matchesWon) || 0,
      earnings: Number(sq.totalEarnings) || 0,
    }));

    const getReferralTierBadge = (count: number) => {
      if (count >= 300) return 'Diamond Jackpot 💎';
      if (count >= 100) return 'Gold Pass 👑';
      if (count >= 50) return 'Silver Pass ⚔️';
      if (count >= 10) return 'Bronze Pass 🥉';
      if (count >= 1) return 'Rising Star 🌟';
      return 'Starter 🌱';
    };

    const referrals = (referralsRes.data || []).map((u, index) => {
      const totalReferrals = Number(u.totalReferrals) || 0;
      return {
        rank: index + 1,
        id: u.id,
        name: u.inGameName || u.name || 'Player',
        inGameName: u.inGameName,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
        referralCode: u.referralCode || `REF_${(u.id || '').slice(-4).toUpperCase()}`,
        ffUid: u.freeFireUid || undefined,
        totalReferrals,
        claimedMilestones: Array.isArray(u.claimedMilestones) ? u.claimedMilestones : [],
        tierBadge: getReferralTierBadge(totalReferrals),
        coinBalance: Number(u.coinBalance) || 0,
        promoBalance: Number(u.promoBalance) || 0,
        earnings: Number(u.earnings) || 0,
        createdAt: u.createdAt,
      };
    });

    const payload = { players, teams, referrals };

    // 3. Store in cache for next requests
    serverCache.set(LEADERBOARD_CACHE_KEY, payload, CACHE_TTL.LEADERBOARD);

    return NextResponse.json(
      { success: true, ...payload },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/leaderboard]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to fetch leaderboard.' }, { status: 500 });
  }
}

