import { supabaseAdmin } from '@/lib/supabase';
import { Tournament, TournamentRoom, RoomQualifier, Participant, TournamentRoadmapConfig, TournamentStage, TournamentRoadmapRuleItem } from '@/lib/types';
import { getMongoClient } from '@/lib/mongodb';
export * from '@/lib/tournament-rooms-utils';
import { getDefaultRoomCapacity, formatRoomLabel, generateDefaultRoadmap, getNextRoomLabel } from '@/lib/tournament-rooms-utils';

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

  // Fallback: Initialize default Group 1 if none exist
  const defaultCapacity = defaultTour?.roomCapacity || getDefaultRoomCapacity(defaultTour?.game);
  const isQualifier = defaultTour?.tournamentBatchFormat === 'QUALIFIER_FINAL';

  const initialRoom1: TournamentRoom = {
    id: `room_${tournamentId}_1`,
    tournamentId,
    roomLabel: '1',
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

  return [initialRoom1];
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

/**
 * Fetch all published points tables for a tournament.
 */
export async function getTournamentPointsTables(tournamentId: string): Promise<any[]> {
  try {
    const settingKey = `TOURNAMENT_POINTS_${tournamentId}`;
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle();

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[getTournamentPointsTables] Error loading points for ${tournamentId}:`, err);
  }

  // MongoDB fallback
  try {
    const client = await getMongoClient();
    if (client) {
      const db = client.db('blackrock');
      const docs = await db.collection('tournament_points_tables').find({ tournamentId }).toArray();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({
          id: d._id?.toString() || d.id,
          tournamentId: d.tournamentId,
          roomId: d.roomId,
          roomLabel: d.roomLabel,
          stage: d.stage,
          matchNumber: d.matchNumber,
          screenshotUrl: d.screenshotUrl,
          publishedAt: d.publishedAt,
          publishedBy: d.publishedBy,
          scores: d.scores,
        }));
      }
    }
  } catch {}

  return [];
}

/**
 * Save points tables for a tournament to Supabase SiteSetting & MongoDB.
 */
export async function saveTournamentPointsTables(tournamentId: string, tables: any[]): Promise<boolean> {
  let saved = false;
  try {
    const settingKey = `TOURNAMENT_POINTS_${tournamentId}`;
    const { error } = await supabaseAdmin.from('SiteSetting').upsert(
      {
        key: settingKey,
        value: JSON.stringify(tables),
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (!error) saved = true;
  } catch (err) {
    console.warn(`[saveTournamentPointsTables] Supabase save error:`, err);
  }

  try {
    const client = await getMongoClient();
    if (client) {
      const db = client.db('blackrock');
      await db.collection('tournament_points_tables').deleteMany({ tournamentId });
      if (tables.length > 0) {
        await db.collection('tournament_points_tables').insertMany(
          tables.map((t) => ({ ...t, updatedAt: new Date() }))
        );
      }
      saved = true;
    }
  } catch {}

  return saved;
}

/**
 * Fetch tournament roadmap configuration from SiteSetting or MongoDB.
 */
export async function getTournamentRoadmap(
  tournamentId: string,
  defaultTour?: Tournament | null,
  rooms: TournamentRoom[] = []
): Promise<TournamentRoadmapConfig> {
  try {
    const settingKey = `TOURNAMENT_ROADMAP_${tournamentId}`;
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle();

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.stages)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[getTournamentRoadmap] Error loading roadmap for ${tournamentId}:`, err);
  }

  // Fallback: Generate smart defaults
  return generateDefaultRoadmap(defaultTour || { id: tournamentId }, rooms);
}

/**
 * Save tournament roadmap configuration to Supabase SiteSetting & MongoDB.
 */
export async function saveTournamentRoadmap(
  tournamentId: string,
  roadmapConfig: TournamentRoadmapConfig
): Promise<boolean> {
  try {
    const settingKey = `TOURNAMENT_ROADMAP_${tournamentId}`;
    await supabaseAdmin.from('SiteSetting').upsert(
      {
        id: `setting_${settingKey}`,
        key: settingKey,
        value: JSON.stringify(roadmapConfig),
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    // Sync to MongoDB if connected
    try {
      const mongo = await getMongoClient();
      if (mongo) {
        await mongo.db('whatsapp_automation').collection('tournament_roadmaps').updateOne(
          { _id: tournamentId as any },
          { $set: { tournamentId, roadmapConfig, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } catch {}

    return true;
  } catch (err) {
    console.error(`[saveTournamentRoadmap] Failed to save roadmap for ${tournamentId}:`, err);
    return false;
  }
}


