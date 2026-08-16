import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const [playersRes, teamsRes] = await Promise.all([
      supabaseAdmin
        .from('User')
        .select('id, name, avatar, freeFireUid, inGameName, totalKills, totalWins, earnings')
        .eq('isBanned', false)
        .order('earnings', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('Team')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(20),
    ]);

    const players = (playersRes.data || []).map((u, index) => ({
      rank: index + 1,
      id: u.id,
      name: u.inGameName || u.name,
      avatar: u.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
      ffUid: u.freeFireUid || 'N/A',
      kills: u.totalKills || 0,
      wins: u.totalWins || 0,
      earnings: u.earnings || 0,
    }));

    const teams = (teamsRes.data || []).map((t, index) => ({
      rank: index + 1,
      id: t.id,
      name: t.name,
      tag: t.tag,
      logo: t.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      captainId: t.captainId,
      inviteCode: t.inviteCode,
      membersCount: 4,
      wins: 0,
    }));

    return NextResponse.json({ players, teams });
  } catch (error: any) {
    console.error('[GET /api/leaderboard]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch leaderboard.' }, { status: 500 });
  }
}
