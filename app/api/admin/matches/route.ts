import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    let query = supabaseAdmin.from('MatchResult').select('*').order('createdAt', { ascending: false });
    if (tournamentId) {
      query = query.eq('tournamentId', tournamentId);
    }

    const { data: results, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ results: results || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/matches]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch match results.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tournamentId, playerName, ffUid, kills, placement, points } = body;

    if (!tournamentId || !playerName) {
      return NextResponse.json({ message: 'Tournament ID and Player Name are required.' }, { status: 400 });
    }

    const numKills = Number(kills) || 0;
    const numPlacement = Number(placement) || 0;
    const numPoints = Number(points) || 0;

    const resultId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newResult = {
      id: resultId,
      tournamentId,
      playerName: playerName.trim(),
      ffUid: ffUid?.trim() || null,
      kills: numKills,
      placement: numPlacement,
      points: numPoints,
      createdAt: new Date().toISOString(),
    };

    const { data: created, error } = await supabaseAdmin
      .from('MatchResult')
      .insert([newResult])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // If matching user exists by inGameName or freeFireUid, update their stats
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

    logAdminAction(session!.email, 'MATCH_RESULT_ADD', `Added match result for ${playerName} in tournament ${tournamentId}`);

    return NextResponse.json({ result: created, message: 'Match result saved successfully.' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/matches]', error);
    return NextResponse.json({ message: error?.message || 'Failed to save match result.' }, { status: 500 });
  }
}
