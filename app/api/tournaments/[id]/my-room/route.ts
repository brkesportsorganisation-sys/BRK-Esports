import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms, getRoomQualifiers, getTournamentParticipantRooms } from '@/lib/tournament-rooms';
import { TournamentRoom, RoomQualifier } from '@/lib/types';

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
      message: 'User authentication required',
    });
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

    // 2. Locate the assigned room & check qualification status
    const [rooms, qualifiers, participantRoomMap] = await Promise.all([
      getTournamentRooms(tournamentId, tournament),
      getRoomQualifiers(tournamentId),
      getTournamentParticipantRooms(tournamentId),
    ]);

    const assignedRoomId = participantRoomMap[participant.id]?.roomId || participant.roomId;
    const assignedRoomLabel = participantRoomMap[participant.id]?.roomLabel || participant.roomLabel;

    let assignedRoom = rooms.find((r) => r.id === assignedRoomId);
    if (!assignedRoom) {
      assignedRoom = rooms.find((r) => r.roomLabel === assignedRoomLabel) || rooms[0];
    }

    if (!assignedRoom) {
      return NextResponse.json({
        isRegistered: true,
        isUnlocked: false,
        message: 'Room allocation is in progress. Please check back shortly.',
      });
    }

    const finalRoom = rooms.find(r => r.roomType === 'FINAL' || r.roomLabel.toLowerCase() === 'final');
    const userQualifier = qualifiers.find(q => q.participantId === participant.id);
    const isAssignedFinal = assignedRoom.roomType === 'FINAL' || assignedRoom.roomLabel.toLowerCase() === 'final';

    let qualificationStatus: 'ACTIVE' | 'QUALIFIED' | 'ELIMINATED' = 'ACTIVE';

    if (tournament.tournamentBatchFormat === 'QUALIFIER_FINAL') {
      if (isAssignedFinal || (userQualifier && userQualifier.advancedToFinal)) {
        qualificationStatus = 'QUALIFIED';
        if (finalRoom) {
          assignedRoom = finalRoom; // point to the championship room
        }
      } else if (userQualifier && !userQualifier.advancedToFinal && assignedRoom.status === 'COMPLETED') {
        qualificationStatus = 'ELIMINATED';
      }
    }

    // If eliminated, completely block credentials
    if (qualificationStatus === 'ELIMINATED') {
      return NextResponse.json({
        isRegistered: true,
        isUnlocked: false,
        qualificationStatus: 'ELIMINATED',
        roomLabel: assignedRoom.roomLabel,
        roomType: assignedRoom.roomType,
        slotNumber: participant.slotNumberInRoom || 1,
        squadName: participant.squadName,
        message: 'Match concluded. Your squad did not qualify for the next stage.',
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
            qualificationStatus,
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
      qualificationStatus,
      roomLabel: assignedRoom.roomLabel,
      roomType: assignedRoom.roomType,
      mapName: assignedRoom.mapName || 'Bermuda',
      stageName: assignedRoom.stageName || (qualificationStatus === 'QUALIFIED' ? 'Championship Grand Finals' : 'Qualifiers'),
      slotNumber: participant.slotNumberInRoom || 1,
      squadName: participant.squadName,
      revealAt: assignedRoom.revealAt || (revealAtMs ? new Date(revealAtMs).toISOString() : null),
      matchTime: assignedRoom.matchTime || tournament.matchTime,
      // Credentials ONLY returned if time unlocked and player is active/qualified!
      roomIdCredential: isFullyUnlocked ? assignedRoom.roomIdCredential : undefined,
      roomPassword: isFullyUnlocked ? (assignedRoom.roomPassword || 'None') : undefined,
      message: isFullyUnlocked
        ? (qualificationStatus === 'QUALIFIED'
            ? `🏆 Championship Final Room credentials unlocked!`
            : `Room ${assignedRoom.roomLabel} credentials unlocked!`)
        : `Credentials will unlock automatically before match start.`,
    });
  } catch (error: any) {
    console.error('[GET /api/tournaments/[id]/my-room] Error:', error);
    return NextResponse.json({ message: error?.message || 'Error fetching room info' }, { status: 500 });
  }
}
