import { supabaseAdmin } from '@/lib/supabase';
import { Tournament, TournamentRoom, RoomQualifier, Participant, TournamentRoadmapConfig, TournamentStage, TournamentRoadmapRuleItem } from '@/lib/types';
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
 * Generates smart default stages and roadmap configuration for a tournament
 */
export function generateDefaultRoadmap(
  tournament: Partial<Tournament>,
  rooms: TournamentRoom[] = []
): TournamentRoadmapConfig {
  const isMultiStage = tournament.tournamentBatchFormat === 'QUALIFIER_FINAL';
  const totalSlots = tournament.maxTeams || 48;
  const capacity = tournament.roomCapacity || getDefaultRoomCapacity(tournament.game);

  if (!isMultiStage) {
    const stage1: TournamentStage = {
      id: 'STAGE_1',
      stageNumber: 1,
      name: 'Main Tournament Lobby',
      subtitle: 'Single / Independent Groups • 12 Squads / Room',
      status: tournament.status === 'LIVE' ? 'LIVE' : tournament.status === 'FINISHED' ? 'COMPLETED' : 'UPCOMING',
      matchTime: tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined),
      mapRotation: ['Bermuda', 'Purgatory', 'Kalahari'],
      advancingPerGroup: 0,
      totalAdvancing: 1,
      roomIds: rooms.map((r) => r.id),
      customRules: 'Standard Battle Royale Rules apply.',
    };

    return {
      enabled: true,
      pipelineTitle: 'TOURNAMENT ROADMAP & SCHEDULE',
      pipelineSubtitle: 'Official Match Schedule, Map Rotations & Progression Architecture.',
      pipelineFormat: 'Standard Tournament',
      stages: [stage1],
      rules: [
        {
          stepNumber: 1,
          title: '12 Squads Per Room',
          description: 'Each custom room hosts 12 squads (48 players). Room ID & Password are time-locked and revealed dynamically only to verified captains.',
        },
        {
          stepNumber: 2,
          title: 'Official Placement Points',
          description: '1st (Booyah): 12 pts, 2nd: 9 pts, 3rd: 8 pts, 4th: 7 pts + 1 pt per kill. AI Scoreboard vision scanner calculates standings instantly.',
        },
        {
          stepNumber: 3,
          title: 'Championship Winner',
          description: 'Top performing squad with highest total points (Placement + Kills) takes the championship prize pool.',
        },
      ],
      pointSystem: {
        booyahPoints: 12,
        secondPoints: 9,
        thirdPoints: 8,
        killPoints: 1,
      },
    };
  }

  // Format A: Qualifier -> Final multi-stage progression
  const r1Groups = Math.max(1, Math.ceil(totalSlots / capacity));
  const r1Adv = tournament.defaultAdvancementCount || 3;
  const r2Squads = r1Groups * r1Adv;
  const r2Groups = Math.max(1, Math.ceil(r2Squads / capacity));
  const r3Squads = r2Groups * 4;
  const r3Groups = Math.max(1, Math.ceil(r3Squads / capacity));

  const stages: TournamentStage[] = [
    {
      id: 'STAGE_1',
      stageNumber: 1,
      name: 'Round 1: Qualifiers',
      subtitle: `${r1Groups} Groups • Top ${r1Adv} Advance`,
      status: tournament.status === 'RUNNING' || tournament.status === 'LIVE' ? 'LIVE' : 'UPCOMING',
      matchTime: tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined),
      mapRotation: ['Bermuda', 'Purgatory', 'Kalahari'],
      advancingPerGroup: r1Adv,
      totalAdvancing: r2Squads,
      roomIds: rooms.filter((r) => r.roomType !== 'FINAL').map((r) => r.id),
      customRules: `Top ${r1Adv} squads with highest cumulative match points auto-qualify for next round.`,
    },
  ];

  if (r2Squads > 12) {
    stages.push({
      id: 'STAGE_2',
      stageNumber: 2,
      name: 'Round 2: Quarter-Finals',
      subtitle: `${r2Groups} Groups • Top 4 Advance`,
      status: 'UPCOMING',
      mapRotation: ['Purgatory', 'Kalahari', 'Alpine'],
      advancingPerGroup: 4,
      totalAdvancing: Math.min(24, r3Squads),
      customRules: 'Top 4 squads from each Quarter-Final group advance to Semi-Finals / Finals.',
    });
  }

  if (r2Squads > 12 && r3Squads > 12) {
    stages.push({
      id: 'STAGE_3',
      stageNumber: 3,
      name: 'Round 3: Semi-Finals',
      subtitle: `${r3Groups} Groups • Top 6 Advance`,
      status: 'UPCOMING',
      mapRotation: ['Kalahari', 'Alpine', 'NexTerra'],
      advancingPerGroup: 6,
      totalAdvancing: 12,
      customRules: 'Top 6 squads from each Semi-Final group qualify for Grand Finals.',
    });
  }

  stages.push({
    id: 'FINALS',
    stageNumber: stages.length + 1,
    name: 'Grand Finals 🏆',
    subtitle: '12 Finalist Squads • Championship Match Series',
    status: tournament.status === 'FINISHED' ? 'COMPLETED' : 'UPCOMING',
    mapRotation: ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra'],
    advancingPerGroup: 1,
    totalAdvancing: 1,
    roomIds: rooms.filter((r) => r.roomType === 'FINAL').map((r) => r.id),
    customRules: '3-5 match series. Grand champion takes the 1st Place Trophy & Prize Pool!',
  });

  return {
    enabled: true,
    pipelineTitle: 'TOURNAMENT ROADMAP & SCHEDULE',
    pipelineSubtitle: 'Multi-Stage tournament progression pipeline, group schedules, and map rotations.',
    pipelineFormat: 'Format A: Qualifier → Final',
    stages,
    rules: [
      {
        stepNumber: 1,
        title: '12 Squads Per Room',
        description: 'Each custom room hosts 12 squads (48 players). Room ID & Password are time-locked and revealed dynamically only to assigned captains.',
      },
      {
        stepNumber: 2,
        title: 'Official Placement Points',
        description: '1st (Booyah): 12 pts, 2nd: 9 pts, 3rd: 8 pts, 4th: 7 pts + 1 pt per kill. AI Scoreboard vision scanner calculates standings instantly.',
      },
      {
        stepNumber: 3,
        title: 'Auto-Advancement to Finals',
        description: 'Top qualifying squads from each round auto-advance to the Championship Final Room for the grand prize pool showdown.',
      },
    ],
    pointSystem: {
      booyahPoints: 12,
      secondPoints: 9,
      thirdPoints: 8,
      killPoints: 1,
    },
  };
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


