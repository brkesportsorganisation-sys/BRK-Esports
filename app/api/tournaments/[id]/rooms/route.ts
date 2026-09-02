import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms, saveTournamentRooms, getRoomQualifiers, getTournamentRoadmap, getTournamentParticipantRooms, saveTournamentParticipantRooms } from '@/lib/tournament-rooms';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { cookies } from 'next/headers';
import { TournamentRoom } from '@/lib/types';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// 1. GET Public/Redacted Rooms List with Participants roster and Roadmap
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  if (!tournamentId) {
    return NextResponse.json({ message: 'Tournament ID is required' }, { status: 400 });
  }

  try {
    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    const [rooms, persistentParticipantRooms] = await Promise.all([
      getTournamentRooms(tournamentId, tournament),
      getTournamentParticipantRooms(tournamentId),
    ]);

    // Fetch participants for this tournament
    const { data: participants } = await supabaseAdmin
      .from('Participant')
      .select('*')
      .eq('tournamentId', tournamentId)
      .order('joinedAt', { ascending: true });

    const rawParticipants = Array.isArray(participants) ? participants : [];

    // Overlay persistent room assignments
    const allParticipants = rawParticipants.map((p) => {
      const savedAssign = persistentParticipantRooms[p.id];
      return {
        ...p,
        roomId: savedAssign?.roomId || p.roomId,
        roomLabel: savedAssign?.roomLabel || p.roomLabel,
        slotNumberInRoom: savedAssign?.slotNumber || p.slotNumberInRoom,
      };
    });

    // Map participants to rooms
    // If a participant has no explicit roomId, distribute them sequentially into rooms based on capacity
    const defaultCapacity = tournament.roomCapacity || 12;
    const roomParticipantMap: Record<string, any[]> = {};
    rooms.forEach((r) => {
      roomParticipantMap[r.id] = [];
    });

    const unassigned: any[] = [];
    allParticipants.forEach((p) => {
      if (p.roomId && roomParticipantMap[p.roomId]) {
        roomParticipantMap[p.roomId].push(p);
      } else {
        unassigned.push(p);
      }
    });

    // Distribute unassigned participants into rooms sequentially
    let currRoomIdx = 0;
    allParticipants.forEach((p) => {
      if (!p.roomId || !roomParticipantMap[p.roomId]) {
        while (currRoomIdx < rooms.length && (roomParticipantMap[rooms[currRoomIdx].id]?.length || 0) >= (rooms[currRoomIdx].capacity || defaultCapacity)) {
          currRoomIdx++;
        }
        if (currRoomIdx < rooms.length) {
          roomParticipantMap[rooms[currRoomIdx].id].push(p);
        }
      }
    });

    // Check if requester is an admin (to reveal credentials)
    const session = await getAdminSession();
    const isAdmin = requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']);

    // Redact credentials for public viewers!
    const publicRooms = rooms.map((room) => {
      const roomParticipants = roomParticipantMap[room.id] || [];
      const isRoomFull = roomParticipants.length >= (room.capacity || defaultCapacity);

      return {
        id: room.id,
        tournamentId: room.tournamentId,
        stageId: room.stageId,
        stageName: room.stageName,
        roomLabel: room.roomLabel,
        roomType: room.roomType,
        capacity: room.capacity || defaultCapacity,
        currentCount: roomParticipants.length,
        isPublished: room.isPublished,
        status: isRoomFull ? 'FULL' : room.status,
        prizePool: room.prizePool,
        advancementCount: room.advancementCount,
        matchTime: room.matchTime || tournament.matchTime,
        mapName: room.mapName || 'Bermuda',
        streamUrl: room.streamUrl,
        roomNotes: room.roomNotes,
        revealAt: room.revealAt,
        // STRICT SECURITY REDACTION: Never reveal room credentials to public!
        roomIdCredential: isAdmin ? room.roomIdCredential : (room.isPublished ? undefined : undefined),
        roomPassword: isAdmin ? room.roomPassword : undefined,
        participants: roomParticipants.map((p, idx) => ({
          id: p.id,
          squadName: p.squadName,
          iglName: p.iglName,
          player1Name: p.player1Name,
          player2Name: p.player2Name,
          player3Name: p.player3Name,
          player4Name: p.player4Name,
          slotNumber: p.slotNumberInRoom || idx + 1,
          joinedAt: p.joinedAt,
        })),
      };
    });

    const [qualifiers, roadmap] = await Promise.all([
      getRoomQualifiers(tournamentId),
      getTournamentRoadmap(tournamentId, tournament, rooms),
    ]);

    return NextResponse.json({
      tournamentId,
      tournamentTitle: tournament.title,
      tournamentFormat: tournament.tournamentBatchFormat || 'SINGLE_ROOM',
      roomCapacity: defaultCapacity,
      totalRooms: rooms.length,
      rooms: publicRooms,
      allParticipants: allParticipants.map((p, idx) => ({
        id: p.id,
        squadName: p.squadName,
        iglName: p.iglName,
        captainWhatsApp: isAdmin ? p.captainWhatsApp : undefined,
        player1Name: p.player1Name,
        player2Name: p.player2Name,
        player3Name: p.player3Name,
        player4Name: p.player4Name,
        roomId: p.roomId,
        roomLabel: p.roomLabel,
        slotNumber: p.slotNumberInRoom || idx + 1,
        status: p.status,
        joinedAt: p.joinedAt,
      })),
      qualifiers: qualifiers || [],
      roadmap: roadmap || null,
    });
  } catch (error: any) {
    console.error('[GET /api/tournaments/[id]/rooms] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch rooms' }, { status: 500 });
  }
}

// 2. POST / PATCH Admin Room & Squad Management
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, roomData, roomId, roomsList, participantId, targetRoomId, targetRoomLabel, slotNumber, squadData } = body;

    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    let rooms = await getTournamentRooms(tournamentId, tournament);

    // Action 1: Bulk update / save all rooms
    if (action === 'BULK_UPDATE' && Array.isArray(roomsList)) {
      await saveTournamentRooms(tournamentId, roomsList);
      await logAdminAction(session?.sub || session?.email || 'admin', 'UPDATE_TOURNAMENT_ROOMS', `Bulk updated ${roomsList.length} rooms for "${tournament.title}"`);
      return NextResponse.json({ success: true, message: 'Rooms saved successfully!', rooms: roomsList });
    }

    // Action 2: Create a new room (e.g. Room B, Room C, or Final Room)
    if (action === 'CREATE_ROOM') {
      const roomLabel = roomData?.roomLabel || `Room-${rooms.length + 1}`;
      const newRoom: TournamentRoom = {
        id: `room_${tournamentId}_${roomLabel.replace(/\s+/g, '_')}_${Date.now()}`,
        tournamentId,
        roomLabel,
        roomType: roomData?.roomType || 'STANDALONE',
        capacity: Number(roomData?.capacity) || tournament.roomCapacity || 12,
        currentCount: 0,
        roomIdCredential: roomData?.roomIdCredential || '',
        roomPassword: roomData?.roomPassword || '',
        revealAt: roomData?.revealAt || (tournament.matchTime ? new Date(new Date(tournament.matchTime).getTime() - 15 * 60 * 1000).toISOString() : undefined),
        isPublished: Boolean(roomData?.isPublished),
        status: 'OPEN',
        prizePool: roomData?.prizePool ? Number(roomData.prizePool) : undefined,
        advancementCount: roomData?.advancementCount ? Number(roomData.advancementCount) : undefined,
        matchTime: roomData?.matchTime || tournament.matchTime,
        stageId: roomData?.stageId || undefined,
        stageName: roomData?.stageName || undefined,
        mapName: roomData?.mapName || 'Bermuda',
        streamUrl: roomData?.streamUrl || undefined,
        roomNotes: roomData?.roomNotes || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rooms.push(newRoom);
      await saveTournamentRooms(tournamentId, rooms);
      await logAdminAction(session?.sub || session?.email || 'admin', 'CREATE_TOURNAMENT_ROOM', `Created room "${roomLabel}" for "${tournament.title}"`);

      return NextResponse.json({ success: true, message: `Room ${roomLabel} created successfully!`, room: newRoom, rooms });
    }

    // Action 3: Update a specific room (Credentials, reveal_at, publish toggle)
    if (action === 'UPDATE_ROOM' && roomId) {
      const idx = rooms.findIndex((r) => r.id === roomId);
      if (idx === -1) {
        return NextResponse.json({ message: 'Room not found' }, { status: 404 });
      }

      rooms[idx] = {
        ...rooms[idx],
        ...roomData,
        updatedAt: new Date().toISOString(),
      };

      await saveTournamentRooms(tournamentId, rooms);
      await logAdminAction(session?.sub || session?.email || 'admin', 'UPDATE_TOURNAMENT_ROOM', `Updated room "${rooms[idx].roomLabel}" credentials/status for "${tournament.title}"`);

      return NextResponse.json({ success: true, message: `Room ${rooms[idx].roomLabel} updated!`, room: rooms[idx], rooms });
    }

    // Action 4: Delete a room
    if (action === 'DELETE_ROOM' && roomId) {
      rooms = rooms.filter((r) => r.id !== roomId);
      await saveTournamentRooms(tournamentId, rooms);
      await logAdminAction(session?.sub || session?.email || 'admin', 'DELETE_TOURNAMENT_ROOM', `Deleted room ID "${roomId}" from "${tournament.title}"`);

      return NextResponse.json({ success: true, message: 'Room deleted successfully!', rooms });
    }

    // Action 5: Reassign Squad to a specific Room and Slot
    if (action === 'ASSIGN_SQUAD_TO_ROOM' && participantId) {
      // 1. Persist to SiteSetting mapping
      const pMap = await getTournamentParticipantRooms(tournamentId);
      pMap[participantId] = {
        roomId: targetRoomId || '',
        roomLabel: targetRoomLabel || '',
        slotNumber: slotNumber ? Number(slotNumber) : undefined,
      };
      await saveTournamentParticipantRooms(tournamentId, pMap);

      // 2. Also try updating Postgres Participant table if columns exist
      try {
        await supabaseAdmin
          .from('Participant')
          .update({
            roomId: targetRoomId || null,
            roomLabel: targetRoomLabel || null,
            slotNumberInRoom: slotNumber ? Number(slotNumber) : null,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', participantId)
          .eq('tournamentId', tournamentId);
      } catch (err) {
        console.warn('[ASSIGN_SQUAD_TO_ROOM] Participant column update skipped:', err);
      }

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'REASSIGN_SQUAD_ROOM',
        `Moved squad participant ${participantId} to Room ${targetRoomLabel || 'Unassigned'} Slot ${slotNumber || 'auto'}`
      );

      return NextResponse.json({ success: true, message: `Squad successfully assigned to Group ${targetRoomLabel || 'Unassigned'}!` });
    }

    // Action 6: Auto-Distribute all squads across available rooms
    if (action === 'AUTO_DISTRIBUTE_SQUADS') {
      const { data: participants } = await supabaseAdmin
        .from('Participant')
        .select('*')
        .eq('tournamentId', tournamentId)
        .order('joinedAt', { ascending: true });

      const allParticipants = Array.isArray(participants) ? participants : [];
      const nonFinalRooms = rooms.filter(r => r.roomType !== 'FINAL');
      const defaultCap = tournament.roomCapacity || 12;

      let roomIdx = 0;
      let slotIdx = 1;
      const newPMap: Record<string, { roomId: string; roomLabel?: string; slotNumber?: number }> = {};

      for (const p of allParticipants) {
        if (roomIdx < nonFinalRooms.length) {
          const targetRoom = nonFinalRooms[roomIdx];
          newPMap[p.id] = {
            roomId: targetRoom.id,
            roomLabel: targetRoom.roomLabel,
            slotNumber: slotIdx,
          };

          slotIdx++;
          if (slotIdx > (targetRoom.capacity || defaultCap)) {
            slotIdx = 1;
            roomIdx++;
          }
        }
      }

      await saveTournamentParticipantRooms(tournamentId, newPMap);

      // Also try to update Postgres in background
      try {
        for (const [pId, assign] of Object.entries(newPMap)) {
          await supabaseAdmin
            .from('Participant')
            .update({
              roomId: assign.roomId,
              roomLabel: assign.roomLabel,
              slotNumberInRoom: assign.slotNumber,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', pId);
        }
      } catch (err) {
        console.warn('[AUTO_DISTRIBUTE_SQUADS] Participant column update skipped:', err);
      }

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'AUTO_DISTRIBUTE_SQUADS',
        `Auto-distributed ${allParticipants.length} squads across ${nonFinalRooms.length} rooms for "${tournament.title}"`
      );

      return NextResponse.json({ success: true, message: `Successfully distributed ${allParticipants.length} squads across ${nonFinalRooms.length} groups!` });
    }

    // Action 7: Add Manual Squad to Room
    if (action === 'ADD_MANUAL_PARTICIPANT' && squadData) {
      const participantId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cleanParticipant: any = {
        id: participantId,
        tournamentId,
        userId: session?.sub || session?.email || 'admin',
        squadName: squadData.squadName || 'Manual Squad',
        iglName: squadData.iglName || 'Captain',
        captainWhatsApp: squadData.captainWhatsApp || null,
        player1Name: squadData.player1Name || squadData.iglName || 'Player 1',
        player2Name: squadData.player2Name || 'Player 2',
        player3Name: squadData.player3Name || 'Player 3',
        player4Name: squadData.player4Name || 'Player 4',
        status: 'VERIFIED',
        joinedAt: new Date().toISOString(),
      };

      // 1. Try inserting with room info, or fallback without room columns
      let { error: insertErr } = await supabaseAdmin.from('Participant').insert({
        ...cleanParticipant,
        roomId: squadData.roomId || null,
        roomLabel: squadData.roomLabel || null,
        slotNumberInRoom: squadData.slotNumber ? Number(squadData.slotNumber) : null,
      });

      if (insertErr) {
        // Fallback without room columns
        const { error: fallbackErr } = await supabaseAdmin.from('Participant').insert(cleanParticipant);
        if (fallbackErr) {
          return NextResponse.json({ message: fallbackErr.message }, { status: 500 });
        }
      }

      // 2. Save room mapping
      if (squadData.roomId) {
        const pMap = await getTournamentParticipantRooms(tournamentId);
        pMap[participantId] = {
          roomId: squadData.roomId,
          roomLabel: squadData.roomLabel,
          slotNumber: squadData.slotNumber ? Number(squadData.slotNumber) : undefined,
        };
        await saveTournamentParticipantRooms(tournamentId, pMap);
      }

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'ADD_MANUAL_SQUAD',
        `Added manual squad "${squadData.squadName}" to Group ${squadData.roomLabel || '1'}`
      );

      return NextResponse.json({ success: true, message: `Squad "${squadData.squadName}" added successfully!` });
    }

    // Action 8: Remove/Delete Participant from Room
    if (action === 'REMOVE_SQUAD_FROM_ROOM' && participantId) {
      // 1. Remove from mapping
      const pMap = await getTournamentParticipantRooms(tournamentId);
      delete pMap[participantId];
      await saveTournamentParticipantRooms(tournamentId, pMap);

      // 2. Remove from Supabase
      const { error: delErr } = await supabaseAdmin
        .from('Participant')
        .delete()
        .eq('id', participantId)
        .eq('tournamentId', tournamentId);

      if (delErr) {
        return NextResponse.json({ message: delErr.message }, { status: 500 });
      }

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'DELETE_SQUAD_PARTICIPANT',
        `Removed squad ${participantId} from "${tournament.title}"`
      );

      return NextResponse.json({ success: true, message: 'Squad removed from tournament successfully.' });
    }

    return NextResponse.json({ message: 'Invalid action provided' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/tournaments/[id]/rooms] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to manage rooms' }, { status: 500 });
  }
}
