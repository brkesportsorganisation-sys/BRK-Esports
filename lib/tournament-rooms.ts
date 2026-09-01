import { supabaseAdmin } from '@/lib/supabase';
import { Tournament, TournamentRoom, RoomQualifier, Participant } from '@/lib/types';
import { getMongoClient } from '@/lib/mongodb';

/**
 * Returns game-specific default custom room capacities.
 */
export function getDefaultRoomCapacity(game?: string): number {
  if (!game) return 12;
  const g = game.toUpperCase();
  if (g.includes('FREE_FIRE') || g.includes('FREEFIRE')) return 12; // 12 Squads / 48 Players
  if (g.includes('PUBG') || g.includes('BGMI')) return 20; // 20 Squads / 80 Players
  if (g.includes('VALORANT') || g.includes('MLBB') || g.includes('COD')) return 2; // 2 Teams
  if (g.includes('EFOOTBALL') || g.includes('PES') || g.includes('CHESS')) return 2; // 1v1
  if (g.includes('LUDO')) return 4; // 4 Players
  return 12;
}

/**
 * Generates the next sequential room label ('A' -> 'B' -> ... -> 'Z' -> 'AA')
 */
export function getNextRoomLabel(existingLabels: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    const char = letters[i];
    if (!existingLabels.includes(char)) return char;
  }
  return `Room-${existingLabels.length + 1}`;
}

/**
 * Fetch all rooms for a tournament from Supabase SiteSetting / MongoDB.
 */
export async function getTournamentRooms(tournamentId: string, defaultTour?: Tournament | null): Promise<TournamentRoom[]> {
  try {
    const settingKey = `TOURNAMENT_ROOMS_${tournamentId}`;
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle();

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[getTournamentRooms] Error loading rooms for ${tournamentId}:`, err);
  }

  // Fallback: Initialize default Room A if none exist
  const defaultCapacity = defaultTour?.roomCapacity || getDefaultRoomCapacity(defaultTour?.game);
  const isQualifier = defaultTour?.tournamentBatchFormat === 'QUALIFIER_FINAL';

  const initialRoomA: TournamentRoom = {
    id: `room_${tournamentId}_A`,
    tournamentId,
    roomLabel: 'A',
    roomType: isQualifier ? 'QUALIFIER' : 'STANDALONE',
    capacity: defaultCapacity,
    currentCount: defaultTour?.registeredCount || 0,
    roomIdCredential: defaultTour?.roomId || undefined,
    roomPassword: defaultTour?.roomPassword || undefined,
    revealAt: defaultTour?.matchTime ? new Date(new Date(defaultTour.matchTime).getTime() - 15 * 60 * 1000).toISOString() : undefined,
    isPublished: Boolean(defaultTour?.roomId || defaultTour?.roomEnabled),
    status: (defaultTour?.registeredCount || 0) >= defaultCapacity ? 'FULL' : 'OPEN',
    prizePool: defaultTour?.tournamentBatchFormat === 'INDEPENDENT_ROOMS' ? (defaultTour.prizePool || 0) : undefined,
    matchTime: defaultTour?.matchTime,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [initialRoomA];
}

/**
 * Persist rooms for a tournament.
 */
export async function saveTournamentRooms(tournamentId: string, rooms: TournamentRoom[]): Promise<boolean> {
  try {
    const settingKey = `TOURNAMENT_ROOMS_${tournamentId}`;
    await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: `setting_${settingKey}`,
        key: settingKey,
        value: JSON.stringify(rooms),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    // Sync to MongoDB if connected
    try {
      const mongo = await getMongoClient();
      if (mongo) {
        await mongo.db('whatsapp_automation').collection('tournament_rooms').updateOne(
          { _id: tournamentId as any },
          { $set: { tournamentId, rooms, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } catch {}

    return true;
  } catch (err) {
    console.error(`[saveTournamentRooms] Failed to save rooms for ${tournamentId}:`, err);
    return false;
  }
}

/**
 * Fetch qualifier advancement data (Format A)
 */
export async function getRoomQualifiers(tournamentId: string): Promise<RoomQualifier[]> {
  try {
    const settingKey = `ROOM_QUALIFIERS_${tournamentId}`;
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle();

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Save qualifier advancement records
 */
export async function saveRoomQualifiers(tournamentId: string, qualifiers: RoomQualifier[]): Promise<boolean> {
  try {
    const settingKey = `ROOM_QUALIFIERS_${tournamentId}`;
    await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: `setting_${settingKey}`,
        key: settingKey,
        value: JSON.stringify(qualifiers),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomic Auto-Room Assignment Logic
 * Assigns registrant to the first open room with capacity or creates Room B, C, etc.
 */
export async function assignParticipantToRoom(
  tournament: Tournament,
  participantData: {
    id: string;
    userId: string;
    squadName: string;
    iglName: string;
    captainWhatsApp?: string | null;
  }
): Promise<{
  roomId: string;
  roomLabel: string;
  slotNumberInRoom: number;
  isNewRoomCreated: boolean;
}> {
  const rooms = await getTournamentRooms(tournament.id, tournament);
  const defaultCapacity = tournament.roomCapacity || getDefaultRoomCapacity(tournament.game);
  const maxRooms = tournament.maxRooms && tournament.maxRooms > 0 ? tournament.maxRooms : 100;
  const isQualifierFormat = tournament.tournamentBatchFormat === 'QUALIFIER_FINAL';
  const isIndependentFormat = tournament.tournamentBatchFormat === 'INDEPENDENT_ROOMS';

  // 1. Find the first open room with space (excluding Final Room from initial registration)
  let targetRoom = rooms.find(
    (r) => r.roomType !== 'FINAL' && r.status === 'OPEN' && r.currentCount < (r.capacity || defaultCapacity)
  );

  let isNewRoomCreated = false;

  // 2. If all existing rooms are full, auto-create the next sequential room
  if (!targetRoom) {
    const nonFinalRooms = rooms.filter((r) => r.roomType !== 'FINAL');
    if (nonFinalRooms.length >= maxRooms) {
      throw new Error(`Tournament capacity reached. Maximum of ${maxRooms} rooms are full.`);
    }

    const existingLabels = nonFinalRooms.map((r) => r.roomLabel);
    const nextLabel = getNextRoomLabel(existingLabels);
    const newRoomId = `room_${tournament.id}_${nextLabel}`;

    const defaultRevealAt = tournament.matchTime
      ? new Date(new Date(tournament.matchTime).getTime() - 15 * 60 * 1000).toISOString()
      : undefined;

    targetRoom = {
      id: newRoomId,
      tournamentId: tournament.id,
      roomLabel: nextLabel,
      roomType: isQualifierFormat ? 'QUALIFIER' : (isIndependentFormat ? 'STANDALONE' : 'STANDALONE'),
      capacity: defaultCapacity,
      currentCount: 0,
      revealAt: defaultRevealAt,
      isPublished: false,
      status: 'OPEN',
      prizePool: isIndependentFormat ? tournament.prizePool : undefined,
      matchTime: tournament.matchTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rooms.push(targetRoom);
    isNewRoomCreated = true;
  }

  // 3. Assign slot and increment room count
  const slotNumberInRoom = targetRoom.currentCount + 1;
  targetRoom.currentCount = slotNumberInRoom;

  if (targetRoom.currentCount >= (targetRoom.capacity || defaultCapacity)) {
    targetRoom.status = 'FULL';
  }
  targetRoom.updatedAt = new Date().toISOString();

  // 4. Save updated rooms
  await saveTournamentRooms(tournament.id, rooms);

  return {
    roomId: targetRoom.id,
    roomLabel: targetRoom.roomLabel,
    slotNumberInRoom,
    isNewRoomCreated,
  };
}

/**
 * Format A: Advance squads to the Final Room
 */
export async function advanceSquadsToFinalRoom(
  tournamentId: string,
  advancingParticipants: Array<{
    participantId: string;
    userId: string;
    squadName: string;
    iglName?: string;
    captainWhatsApp?: string;
    rankInRoom?: number;
    sourceRoomId: string;
  }>,
  finalRoomCustomConfig?: Partial<TournamentRoom>
): Promise<{ success: boolean; finalRoom: TournamentRoom; advancedCount: number }> {
  const rooms = await getTournamentRooms(tournamentId);

  // 1. Find or create Final Room
  let finalRoom = rooms.find((r) => r.roomType === 'FINAL' || r.roomLabel === 'Final');
  if (!finalRoom) {
    finalRoom = {
      id: `room_${tournamentId}_FINAL`,
      tournamentId,
      roomLabel: 'Final',
      roomType: 'FINAL',
      capacity: advancingParticipants.length || 12,
      currentCount: 0,
      roomIdCredential: finalRoomCustomConfig?.roomIdCredential || '',
      roomPassword: finalRoomCustomConfig?.roomPassword || '',
      revealAt: finalRoomCustomConfig?.revealAt,
      isPublished: Boolean(finalRoomCustomConfig?.isPublished),
      status: 'OPEN',
      matchTime: finalRoomCustomConfig?.matchTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rooms.push(finalRoom);
  }

  // 2. Populate qualifiers
  const currentQualifiers = await getRoomQualifiers(tournamentId);
  let advancedCount = 0;

  for (const adv of advancingParticipants) {
    const existingIdx = currentQualifiers.findIndex((q) => q.participantId === adv.participantId);
    const qualRecord: RoomQualifier = {
      id: `qual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tournamentId,
      roomId: adv.sourceRoomId,
      participantId: adv.participantId,
      squadName: adv.squadName,
      iglName: adv.iglName,
      captainWhatsApp: adv.captainWhatsApp,
      userId: adv.userId,
      rankInRoom: adv.rankInRoom,
      advancedToFinal: true,
      finalRoomId: finalRoom.id,
      advancedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      currentQualifiers[existingIdx] = qualRecord;
    } else {
      currentQualifiers.push(qualRecord);
    }
    advancedCount++;
  }

  finalRoom.currentCount = currentQualifiers.filter((q) => q.advancedToFinal && q.finalRoomId === finalRoom.id).length;
  finalRoom.updatedAt = new Date().toISOString();

  await saveTournamentRooms(tournamentId, rooms);
  await saveRoomQualifiers(tournamentId, currentQualifiers);

  return {
    success: true,
    finalRoom,
    advancedCount,
  };
}
