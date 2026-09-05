import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { listTournamentsFromDb } from '@/lib/tournament-store';

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
    // 1. Fetch all Tournaments
    const tournaments = await listTournamentsFromDb();
    const tournamentMap = new Map<string, any>();
    tournaments.forEach((t) => {
      tournamentMap.set(t.id, t);
    });

    // 2. Fetch recent Participants from Supabase
    const { data: participants, error: partError } = await supabaseAdmin
      .from('Participant')
      .select('id, tournamentId, userId, teamId, registrationId, status, entryFee, squadName, iglName, captainWhatsApp, player1Name, player2Name, player3Name, player4Name, backupPlayerName, joinedAt, createdAt')
      .order('joinedAt', { ascending: false })
      .limit(300);

    if (partError) {
      console.warn('[GET /api/admin/registrations] Supabase Participant error:', partError.message);
    }

    // 3. Fetch user profiles ONLY for the active participant user IDs
    const userIds = Array.from(new Set((participants || []).map((p: any) => p.userId).filter(Boolean)));
    const userMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('User')
        .select('id, name, inGameName, email, phone, whatsapp')
        .in('id', userIds.slice(0, 200));
      (users || []).forEach((u) => userMap.set(u.id, u));
    }

    // Deduplicated list of participants
    const regMap = new Map<string, any>();

    (participants || []).forEach((p: any) => {
      regMap.set(p.id, p);
    });

    // Unique list of raw registrations
    const rawList = Array.from(new Set(regMap.values()));

    // Map each raw registration into a normalized structured item
    const registrations = rawList.map((r: any, idx: number) => {
      const tour = tournamentMap.get(r.tournamentId);
      const user = userMap.get(r.userId);

      const status = (r.status || 'VERIFIED').toUpperCase() as 'PENDING' | 'VERIFIED' | 'REJECTED';
      const entryFee = Number(tour?.entryFee ?? r.entryFee ?? 0);

      return {
        id: r.id || `reg_${idx}`,
        registrationId: r.registrationId || r.id || `REG-${idx + 1}`,
        teamId: r.teamId || '',
        tournamentId: r.tournamentId || '',
        tournamentTitle: tour?.title || r.tournamentTitle || 'Esports Tournament',
        tournamentBanner: tour?.banner || tour?.bannerImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        tournamentGame: tour?.game || 'FREE_FIRE',
        tournamentGameName: tour?.gameName || 'Free Fire',
        entryFee: entryFee,
        coinEntryFee: tour?.coinEntryFee,
        prizePool: Number(tour?.prizePool || 0),
        maxTeams: Number(tour?.maxTeams || 48),
        matchTime: tour?.matchTime || '',
        status: status,
        userId: r.userId || '',
        userName: user?.name || user?.inGameName || r.userName || 'Captain',
        userEmail: user?.email || r.userEmail || '',
        squadName: r.squadName || (r.iglName ? `${r.iglName}'s Squad` : `Squad #${idx + 1}`),
        iglName: r.iglName || r.player1Name || user?.inGameName || user?.name || 'Captain',
        captainWhatsApp: r.captainWhatsApp || user?.whatsapp || user?.phone || '',
        player1Name: r.player1Name || r.iglName || 'Player 1',
        player2Name: r.player2Name || 'Player 2',
        player3Name: r.player3Name || 'Player 3',
        player4Name: r.player4Name || 'Player 4',
        backupPlayerName: r.backupPlayerName || '',
        joinedAt: r.joinedAt || r.createdAt || new Date().toISOString(),
      };
    });

    // Sort by joinedAt descending
    registrations.sort((a, b) => {
      const tA = new Date(a.joinedAt).getTime();
      const tB = new Date(b.joinedAt).getTime();
      if (isNaN(tA)) return 1;
      if (isNaN(tB)) return -1;
      return tB - tA;
    });

    // Build tournament summaries with computed slot counts
    const tournamentSummaries = tournaments.map((t) => {
      const tourRegs = registrations.filter((r) => r.tournamentId === t.id);
      const pendingCount = tourRegs.filter((r) => r.status === 'PENDING').length;
      const verifiedCount = tourRegs.filter((r) => r.status === 'VERIFIED').length;
      const rejectedCount = tourRegs.filter((r) => r.status === 'REJECTED').length;
      const totalCollectedFees = verifiedCount * Number(t.entryFee || 0);

      return {
        id: t.id,
        title: t.title,
        game: t.game,
        gameName: t.gameName,
        banner: t.banner || t.bannerImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        entryFee: Number(t.entryFee || 0),
        coinEntryFee: t.coinEntryFee,
        prizePool: Number(t.prizePool || 0),
        maxTeams: Number(t.maxTeams || 48),
        registeredCount: tourRegs.length,
        pendingCount,
        verifiedCount,
        rejectedCount,
        totalCollectedFees,
        matchTime: t.matchTime,
        status: t.status,
        registrationOpen: t.registrationOpen,
      };
    });

    return NextResponse.json({
      registrations,
      tournaments: tournamentSummaries,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/registrations]', error?.message);
    return NextResponse.json({ message: 'Failed to load registrations.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { registrationId, action } = body; // action: 'APPROVE' | 'REJECT'
  if (!registrationId || !['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json(
      { message: 'Invalid request: registrationId and action (APPROVE|REJECT) are required.' },
      { status: 400 }
    );
  }

  try {
    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    // 1. Update Participant table
    const { data: participant } = await supabaseAdmin
      .from('Participant')
      .update({ status: newStatus })
      .or(`id.eq.${registrationId},registrationId.eq.${registrationId}`)
      .select()
      .maybeSingle();

    // 2. Also update Payment table if matching record exists
    await supabaseAdmin
      .from('Payment')
      .update({ status: newStatus, updatedAt: new Date().toISOString() })
      .or(`id.eq.${registrationId},trxId.ilike.%${registrationId}%`);

    const tournamentId = participant?.tournamentId;
    if (tournamentId) {
      const { count } = await supabaseAdmin
        .from('Participant')
        .select('*', { count: 'exact', head: true })
        .eq('tournamentId', tournamentId)
        .eq('status', 'VERIFIED');

      if (typeof count === 'number') {
        await supabaseAdmin
          .from('Tournament')
          .update({
            registeredCount: count,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', tournamentId);
      }
    }

    return NextResponse.json({
      ok: true,
      message: action === 'APPROVE' ? 'Registration slot approved successfully.' : 'Registration slot rejected.',
      participant,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/registrations]', error?.message);
    return NextResponse.json(
      { message: error?.message || 'Failed to update registration.' },
      { status: 500 }
    );
  }
}
