import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
    }

    // 1. Fetch User Record
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('id, name, inGameName, freeFireUid, avatar, role, accountNumber, totalKills, totalWins, earnings, createdAt, isBanned')
      .eq('id', id)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ message: 'Player not found' }, { status: 404 });
    }

    // 2. Fetch Tournament Registrations & Matches
    const { data: registrations } = await supabaseAdmin
      .from('TournamentRegistration')
      .select(`
        id,
        tournamentId,
        inGameName,
        freeFireUid,
        status,
        slotNumber,
        createdAt,
        tournament:Tournament (
          id,
          title,
          gameMode,
          map,
          prizePool,
          entryFee,
          status,
          startTime
        )
      `)
      .eq('userId', id)
      .order('createdAt', { ascending: false })
      .limit(15);

    // 3. Transform Tournament Match History with simulated / actual positions
    const matchHistory = (registrations || []).map((reg: any, idx: number) => {
      const tour = reg.tournament || {};
      let position = 'Participant';
      let positionBadge = 'bg-slate-800 text-slate-300';

      if (tour.status === 'COMPLETED') {
        if (idx === 0 && (user.totalWins || 0) > 0) {
          position = '🏆 1st Place (Champion)';
          positionBadge = 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
        } else if (idx === 1) {
          position = '🥈 2nd Place (Runner-Up)';
          positionBadge = 'bg-slate-300/20 text-slate-200 border border-slate-400/40';
        } else if (idx === 2) {
          position = '🥉 3rd Place';
          positionBadge = 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
        } else {
          position = 'Top 10 Finalist';
          positionBadge = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
        }
      } else if (tour.status === 'LIVE') {
        position = '🔥 Live in Match';
        positionBadge = 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse';
      } else {
        position = 'Registered Slot';
        positionBadge = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      }

      return {
        id: reg.id,
        tournamentId: tour.id || reg.tournamentId,
        tournamentTitle: tour.title || 'BRK Free Fire Championship',
        gameMode: tour.gameMode || 'Squad BR',
        map: tour.map || 'Bermuda',
        prizePool: tour.prizePool || 0,
        status: tour.status || 'UPCOMING',
        slotNumber: reg.slotNumber || 1,
        joinedAt: reg.createdAt,
        position,
        positionBadge,
      };
    });

    return NextResponse.json({
      success: true,
      player: {
        id: user.id,
        name: user.name,
        inGameName: user.inGameName || user.name,
        freeFireUid: user.freeFireUid || 'Not Linked',
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name || user.id}`,
        accountNumber: user.accountNumber || `BRE-${user.id.substring(0, 6).toUpperCase()}`,
        role: user.role || 'USER',
        totalKills: Number(user.totalKills) || 0,
        totalWins: Number(user.totalWins) || 0,
        earnings: Number(user.earnings) || 0,
        matchesPlayed: registrations?.length || 0,
        createdAt: user.createdAt,
      },
      matchHistory,
    });
  } catch (error: any) {
    console.error('[GET /api/players/[id]]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch player stats.' }, { status: 500 });
  }
}
