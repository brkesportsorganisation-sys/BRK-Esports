import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSquads } from '@/lib/squads';

export async function GET() {
  try {
    const [playersRes, squads] = await Promise.all([
      supabaseAdmin
        .from('User')
        .select('id, name, avatar, freeFireUid, inGameName, totalKills, totalWins, earnings')
        .eq('isBanned', false)
        .order('earnings', { ascending: false })
        .limit(30),
      getSquads(),
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

    return NextResponse.json({ success: true, players, teams });
  } catch (error: any) {
    console.error('[GET /api/leaderboard]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to fetch leaderboard.' }, { status: 500 });
  }
}

