import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession, hasVendorPermission, isVendorTournamentAccessible } from '@/lib/vendor-auth';
import { listTournamentsFromDb, updateTournamentInDb, createTournamentInDb } from '@/lib/tournament-store';
import { db } from '@/lib/db';

async function getVendorSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  return verifyVendorSession(token);
}

export async function GET() {
  const session = await getVendorSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated vendor session.' }, { status: 401 });
  }

  try {
    let allTournaments = await listTournamentsFromDb();
    if (!allTournaments || allTournaments.length === 0) {
      allTournaments = db.getTournaments();
    }

    // Filter tournaments based on vendor access level
    const accessibleTournaments =
      session.accessLevel === 'FULL_ACCESS' || session.assignedTournaments.includes('ALL')
        ? allTournaments
        : allTournaments.filter((t) => session.assignedTournaments.includes(t.id));

    return NextResponse.json({
      tournaments: accessibleTournaments,
      vendor: {
        vendorId: session.vendorId,
        accessLevel: session.accessLevel,
        permissions: session.permissions,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/vendor/tournaments]', error);
    const local = db.getTournaments();
    return NextResponse.json({ tournaments: local });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getVendorSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated vendor session.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tournamentId, roomId, roomPassword, roomReleaseTime, roomEnabled } = body;

    if (!tournamentId) {
      return NextResponse.json({ message: 'Tournament ID is required.' }, { status: 400 });
    }

    // Check if tournament is accessible to this vendor
    if (!isVendorTournamentAccessible(session, tournamentId)) {
      return NextResponse.json(
        { message: 'You do not have access to this tournament.' },
        { status: 403 }
      );
    }

    // Check permission to update room details
    if (!hasVendorPermission(session, 'manage_room_details', tournamentId)) {
      return NextResponse.json(
        { message: 'You do not have permission to manage room details.' },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      roomId: roomId !== undefined ? String(roomId).trim() : undefined,
      roomPassword: roomPassword !== undefined ? String(roomPassword).trim() : undefined,
      roomReleaseTime: roomReleaseTime ? new Date(roomReleaseTime).toISOString() : undefined,
      roomEnabled: roomEnabled !== undefined ? Boolean(roomEnabled) : true,
    };

    let updated = null;
    try {
      updated = await updateTournamentInDb(tournamentId, updates);
    } catch (err) {
      console.warn('Supabase tournament update fallback:', err);
    }

    db.updateTournament(tournamentId, updates);

    return NextResponse.json({
      tournament: updated || db.getTournamentById(tournamentId),
      message: 'Tournament room credentials updated successfully!',
    });
  } catch (error: any) {
    console.error('[PATCH /api/vendor/tournaments]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to update tournament credentials.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getVendorSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated vendor session.' }, { status: 401 });
  }

  // Full access or explicit 'manage_tournaments' permission required to create tournaments
  if (!hasVendorPermission(session, 'manage_tournaments')) {
    return NextResponse.json(
      { message: 'You do not have permission to create tournaments.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      mode = 'SQUAD',
      format = 'BR_RANKED',
      entryFee = 0,
      prizePool = 0,
      maxTeams = 12,
      matchTime,
      registrationDeadline,
    } = body;

    if (!title) {
      return NextResponse.json({ message: 'Tournament title is required.' }, { status: 400 });
    }

    const newTournament = await createTournamentInDb({
      title: title.trim(),
      description: description || 'Hosted by Vendor',
      mode,
      format,
      entryFee: Number(entryFee),
      prizePool: Number(prizePool),
      firstPrize: Number(body.firstPrize || 0),
      secondPrize: Number(body.secondPrize || 0),
      thirdPrize: Number(body.thirdPrize || 0),
      perKillPrize: Number(body.perKillPrize || 0),
      maxTeams: Number(maxTeams),
      matchTime: new Date(matchTime || Date.now() + 86400000).toISOString(),
      registrationDeadline: new Date(registrationDeadline || Date.now() + 80000000).toISOString(),
      status: 'UPCOMING',
      rules: body.rules || 'Standard rules apply',
      isPublished: true,
      showOnHomepage: true,
      registrationOpen: true,
    });

    db.createTournament(newTournament);

    return NextResponse.json({
      tournament: newTournament,
      message: 'Tournament created successfully by vendor!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/vendor/tournaments]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to create tournament.' },
      { status: 500 }
    );
  }
}
