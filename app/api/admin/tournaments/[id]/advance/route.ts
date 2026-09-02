import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms, saveTournamentRooms, getRoomQualifiers, saveRoomQualifiers } from '@/lib/tournament-rooms';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { cookies } from 'next/headers';
import { RoomQualifier, TournamentRoom } from '@/lib/types';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

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
    const {
      advancingParticipants,
      targetRoomId,
      targetRoomLabel,
      targetStageId,
      targetStageName,
      customNote,
    } = body;

    if (!Array.isArray(advancingParticipants) || advancingParticipants.length === 0) {
      return NextResponse.json({ message: 'Please select at least one squad to advance.' }, { status: 400 });
    }

    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    const rooms = await getTournamentRooms(tournamentId, tournament);

    // Locate or create target room
    let targetRoom: TournamentRoom | undefined;
    if (targetRoomId) {
      targetRoom = rooms.find(r => r.id === targetRoomId);
    } else if (targetRoomLabel) {
      targetRoom = rooms.find(r => r.roomLabel.toLowerCase() === targetRoomLabel.toLowerCase());
    }

    if (!targetRoom) {
      // Find final room or create target room
      const label = targetRoomLabel || (targetStageName?.toLowerCase().includes('final') ? 'Final' : `Round-${rooms.length + 1}`);
      const isFinal = label.toLowerCase().includes('final');
      targetRoom = {
        id: `room_${tournamentId}_${label.replace(/\s+/g, '_')}_${Date.now()}`,
        tournamentId,
        roomLabel: label,
        roomType: isFinal ? 'FINAL' : 'QUALIFIER',
        capacity: tournament.roomCapacity || 12,
        currentCount: 0,
        roomIdCredential: '',
        roomPassword: '',
        status: 'OPEN',
        isPublished: true,
        stageId: targetStageId,
        stageName: targetStageName || label,
        mapName: 'Bermuda',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      rooms.push(targetRoom);
    }

    const assignedTargetRoom: TournamentRoom = targetRoom;

    // Update target stage name if provided
    if (targetStageName && !assignedTargetRoom.stageName) {
      assignedTargetRoom.stageName = targetStageName;
    }
    if (targetStageId && !assignedTargetRoom.stageId) {
      assignedTargetRoom.stageId = targetStageId;
    }

    const currentQualifiers = await getRoomQualifiers(tournamentId);
    const destStageTitle = targetStageName || (assignedTargetRoom.roomType === 'FINAL' ? 'Grand Finals' : `Group ${assignedTargetRoom.roomLabel}`);

    let slotCounter = (assignedTargetRoom.currentCount || 0) + 1;
    let advancedCount = 0;

    for (const adv of advancingParticipants) {
      // 1. Update Participant in Supabase database
      const assignedSlot = adv.slotNumber || slotCounter;
      await supabaseAdmin
        .from('Participant')
        .update({
          roomId: assignedTargetRoom.id,
          roomLabel: assignedTargetRoom.roomLabel,
          slotNumberInRoom: assignedSlot,
          status: 'QUALIFIED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', adv.participantId || adv.id);

      slotCounter++;

      // 2. Add / Update RoomQualifier record
      const existingIdx = currentQualifiers.findIndex((q) => q.participantId === (adv.participantId || adv.id));
      const qualRecord: RoomQualifier = {
        id: `qual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tournamentId,
        roomId: adv.sourceRoomId || '',
        participantId: adv.participantId || adv.id,
        squadName: adv.squadName,
        iglName: adv.iglName,
        captainWhatsApp: adv.captainWhatsApp,
        userId: adv.userId,
        rankInRoom: adv.rankInRoom,
        advancedToFinal: Boolean(assignedTargetRoom.roomType === 'FINAL' || targetStageName?.toLowerCase().includes('final')),
        finalRoomId: assignedTargetRoom.id,
        advancedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        currentQualifiers[existingIdx] = qualRecord;
      } else {
        currentQualifiers.push(qualRecord);
      }

      // 3. Send in-app Notification to the advancing squad's captain
      if (adv.userId) {
        try {
          await supabaseAdmin.from('Notification').insert([{
            id: `notif_adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: adv.userId,
            title: `🏆 Congratulations! Qualified for ${destStageTitle}!`,
            message: `Squad "${adv.squadName}" has advanced to ${destStageTitle} (Room ${assignedTargetRoom.roomLabel}, Slot #${assignedSlot})! Check your tournament Match Hub for schedules and credentials. ${customNote ? `\n\nAdmin Note: ${customNote}` : ''}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }]);
        } catch {}
      }

      advancedCount++;
    }

    assignedTargetRoom.currentCount = Math.min(assignedTargetRoom.capacity || 12, (assignedTargetRoom.currentCount || 0) + advancedCount);
    assignedTargetRoom.updatedAt = new Date().toISOString();

    await saveTournamentRooms(tournamentId, rooms);
    await saveRoomQualifiers(tournamentId, currentQualifiers);

    await logAdminAction(
      session?.sub || session?.email || 'admin',
      'ADVANCE_SQUADS_STAGE',
      `Advanced ${advancedCount} squads to "${destStageTitle}" (Room ${assignedTargetRoom.roomLabel}) for "${tournament.title}"`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully advanced ${advancedCount} squad(s) to ${destStageTitle} (Room ${assignedTargetRoom.roomLabel})!`,
      targetRoom: assignedTargetRoom,
      rooms,
      advancedCount,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/tournaments/[id]/advance] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to advance squads' }, { status: 500 });
  }
}
