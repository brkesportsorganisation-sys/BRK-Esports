import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms } from '@/lib/tournament-rooms';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  if (!tournamentId) {
    return NextResponse.json({ message: 'Tournament ID is required' }, { status: 400 });
  }

  // Identify user from header or query
  const userId = req.headers.get('x-user-id') || req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({
      isRegistered: false,
      isUnlocked: false,
      message: 'Please log in to view your assigned match room.',
    }, { status: 401 });
  }

  try {
    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    // 1. Verify user's registration in this tournament
    const { data: participant } = await supabaseAdmin
      .from('Participant')
      .select('*')
      .eq('tournamentId', tournamentId)
      .eq('userId', userId)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({
        isRegistered: false,
        isUnlocked: false,
        message: 'You are not registered in this tournament.',
      });
    }

    // 2. Locate the assigned room
    const rooms = await getTournamentRooms(tournamentId, tournament);
    let assignedRoom = rooms.find((r) => r.id === participant.roomId);

    // Fallback: If no explicit roomId on legacy record, match by room label or default to Room A
    if (!assignedRoom) {
      assignedRoom = rooms.find((r) => r.roomLabel === participant.roomLabel) || rooms[0];
    }

    if (!assignedRoom) {
      return NextResponse.json({
        isRegistered: true,
        isUnlocked: false,
        message: 'Room allocation is in progress. Please check back shortly.',
      });
    }

    // 3. Security Time-Gate Check (revealAt)
    const now = Date.now();
    let revealAtMs = assignedRoom.revealAt ? new Date(assignedRoom.revealAt).getTime() : 0;

    // Default revealAt to 15 minutes before matchTime if not explicitly set
    if (!revealAtMs && (assignedRoom.matchTime || tournament.matchTime)) {
      const matchMs = new Date(assignedRoom.matchTime || tournament.matchTime).getTime();
      revealAtMs = matchMs - 15 * 60 * 1000;
    }

    const isTimeUnlocked = revealAtMs > 0 ? now >= revealAtMs : false;
    const isPublished = assignedRoom.isPublished !== false;
    const isFullyUnlocked = isTimeUnlocked && isPublished && Boolean(assignedRoom.roomIdCredential);

    // Log credential access event for leak auditing
    if (isFullyUnlocked) {
      try {
        await supabaseAdmin.from('AdminActionLog').insert([{
          id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          adminEmail: participant.squadName || participant.iglName || userId,
          action: 'REVEAL_ROOM_CREDENTIALS',
          target: `Tournament: ${tournament.title} | Room ${assignedRoom.roomLabel} (${assignedRoom.id})`,
          details: JSON.stringify({
            userId,
            participantId: participant.id,
            squadName: participant.squadName,
            revealedAt: new Date().toISOString(),
            ip: req.headers.get('x-forwarded-for') || 'unknown',
          }),
          createdAt: new Date().toISOString(),
        }]);
      } catch {}
    }

    return NextResponse.json({
      isRegistered: true,
      isUnlocked: isFullyUnlocked,
      roomLabel: assignedRoom.roomLabel,
      roomType: assignedRoom.roomType,
      slotNumber: participant.slotNumberInRoom || 1,
      squadName: participant.squadName,
      revealAt: assignedRoom.revealAt || (revealAtMs ? new Date(revealAtMs).toISOString() : null),
      matchTime: assignedRoom.matchTime || tournament.matchTime,
      // Credentials ONLY returned if time unlocked and user is verified!
      roomIdCredential: isFullyUnlocked ? assignedRoom.roomIdCredential : undefined,
      roomPassword: isFullyUnlocked ? (assignedRoom.roomPassword || 'None') : undefined,
      message: isFullyUnlocked
        ? `Room ${assignedRoom.roomLabel} credentials unlocked!`
        : `Room ${assignedRoom.roomLabel} credentials will unlock automatically before match start.`,
    });
  } catch (error: any) {
    console.error('[GET /api/tournaments/[id]/my-room] Error:', error);
    return NextResponse.json({ message: error?.message || 'Error fetching room info' }, { status: 500 });
  }
}
