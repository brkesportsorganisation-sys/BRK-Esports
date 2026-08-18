import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession, hasVendorPermission, isVendorTournamentAccessible } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

async function getVendorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  return verifyVendorSession(token);
}

export async function GET(request: NextRequest) {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournamentId');

  try {
    let query = supabaseAdmin.from('MatchResult').select('*').order('createdAt', { ascending: false });
    if (tournamentId) {
      query = query.eq('tournamentId', tournamentId);
    }

    const { data: results, error } = await query;
    if (!error && results) {
      return NextResponse.json({ results });
    }

    const local = tournamentId ? db.getMatchResults(tournamentId) : [];
    return NextResponse.json({ results: local });
  } catch (error: any) {
    console.error('[GET /api/vendor/matches]', error);
    const local = tournamentId ? db.getMatchResults(tournamentId) : [];
    return NextResponse.json({ results: local });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tournamentId, playerName, ffUid, kills, placement, points } = body;

    if (!tournamentId || !playerName) {
      return NextResponse.json(
        { message: 'Tournament ID and Player Name are required.' },
        { status: 400 }
      );
    }

    if (!isVendorTournamentAccessible(session, tournamentId)) {
      return NextResponse.json(
        { message: 'You do not have access to this tournament.' },
        { status: 403 }
      );
    }

    if (!hasVendorPermission(session, 'enter_match_results', tournamentId)) {
      return NextResponse.json(
        { message: 'You do not have permission to enter match results.' },
        { status: 403 }
      );
    }

    const numKills = Number(kills) || 0;
    const numPlacement = Number(placement) || 0;
    const numPoints = Number(points) || 0;
    const resultId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newResult = {
      id: resultId,
      tournamentId,
      playerName: playerName.trim(),
      teamOrPlayerName: playerName.trim(),
      ffUid: ffUid?.trim() || null,
      kills: numKills,
      placement: numPlacement,
      points: numPoints,
      createdAt: new Date().toISOString(),
    };

    // Try Supabase insert
    try {
      await supabaseAdmin.from('MatchResult').insert([newResult]);

      if (ffUid || playerName) {
        let userQuery = supabaseAdmin.from('User').select('id, totalKills, totalWins, earnings');
        if (ffUid) {
          userQuery = userQuery.eq('freeFireUid', ffUid.trim());
        } else {
          userQuery = userQuery.eq('inGameName', playerName.trim());
        }

        const { data: matchedUser } = await userQuery.maybeSingle();
        if (matchedUser) {
          const isWin = numPlacement === 1;
          await supabaseAdmin
            .from('User')
            .update({
              totalKills: (matchedUser.totalKills || 0) + numKills,
              totalWins: (matchedUser.totalWins || 0) + (isWin ? 1 : 0),
              updatedAt: new Date().toISOString(),
            })
            .eq('id', matchedUser.id);
        }
      }
    } catch (err) {
      console.warn('Supabase match insert fallback:', err);
    }

    db.addMatchResult(newResult);

    return NextResponse.json(
      { result: newResult, message: 'Match result entered successfully by vendor!' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/vendor/matches]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to record match result.' },
      { status: 500 }
    );
  }
}
