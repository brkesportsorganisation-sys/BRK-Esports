import { supabaseAdmin, supabase } from '@/lib/supabase';
import type { Tournament, TournamentCommunityConfig, TournamentStatus, CommunityAccessType, CommunityUnlockMode, PrizeTier } from '@/lib/types';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';

function parsePrizeDistribution(value: unknown, fallbackRules?: string): PrizeTier[] {
  if (Array.isArray(value) && value.length > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      let parsed = JSON.parse(value);
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {}
      }
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  if (typeof fallbackRules === 'string' && fallbackRules.includes('<!-- PRIZES:')) {
    try {
      const match = fallbackRules.match(/<!-- PRIZES:([\s\S]*?)-->/);
      if (match && match[1]) {
        let parsed = JSON.parse(match[1]);
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}

function parseGalleryImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildCommunityConfig(record: Record<string, unknown>): TournamentCommunityConfig {
  return {
    enabled: Boolean(record.communityEnabled),
    accessType: (record.communityAccessType as CommunityAccessType) || 'WHATSAPP',
    inviteLink: String(record.communityInviteLink || ''),
    communityName: String(record.communityName || ''),
    communityDescription: String(record.communityDescription || ''),
    hideInviteLinkFromPublic: Boolean(record.hideInviteLinkFromPublic),
    unlockMode: (record.communityUnlockMode as CommunityUnlockMode) || 'SLOT_PURCHASE_ONLY',
    isDisabled: Boolean(record.communityIsDisabled),
  };
}

function serializeTournament(record: Record<string, any>): Tournament {
  const rules = String(record.rules || '');
  const prizeDist = parsePrizeDistribution(record.prizeDistribution, rules);

  return {
    id: String(record.id),
    title: String(record.title || ''),
    description: String(record.description || ''),
    banner: String(record.banner || ''),
    game: record.game ? String(record.game) : 'FREE_FIRE',
    gameName: record.gameName ? String(record.gameName) : (
      record.game === 'EFOOTBALL' ? 'eFootball' :
      record.game === 'PUBG_MOBILE' ? 'PUBG Mobile' :
      record.game === 'VALORANT' ? 'Valorant' :
      record.game === 'MLBB' ? 'Mobile Legends' :
      record.game === 'COD_MOBILE' ? 'COD Mobile' :
      record.game === 'LUDO_KING' ? 'Ludo King' :
      'Free Fire'
    ),
    mode: (record.mode as Tournament['mode']) || 'SQUAD',
    format: (record.format as Tournament['format']) || 'BR_RANKED',
    tournamentBatchFormat: (record.tournamentBatchFormat as Tournament['tournamentBatchFormat']) || 'SINGLE_ROOM',
    roomCapacity: record.roomCapacity ? Number(record.roomCapacity) : 12,
    maxRooms: record.maxRooms ? Number(record.maxRooms) : undefined,
    defaultAdvancementCount: record.defaultAdvancementCount ? Number(record.defaultAdvancementCount) : 3,
    entryFee: Number(record.entryFee || 0),
    prizePool: Number(record.prizePool || 0),
    firstPrize: Number(record.firstPrize || 0),
    secondPrize: Number(record.secondPrize || 0),
    thirdPrize: Number(record.thirdPrize || 0),
    perKillPrize: Number(record.perKillPrize || 0),
    prizeDistribution: prizeDist,
    maxTeams: Number(record.maxTeams || 0),
    registeredCount: Number(record.registeredCount || 0),
    matchTime: new Date(record.matchTime).toISOString(),
    registrationDeadline: new Date(record.registrationDeadline).toISOString(),
    tournamentStart: record.tournamentStart ? new Date(record.tournamentStart).toISOString() : undefined,
    tournamentEnd: record.tournamentEnd ? new Date(record.tournamentEnd).toISOString() : undefined,
    registrationStart: record.registrationStart ? new Date(record.registrationStart).toISOString() : undefined,
    registrationEnd: record.registrationEnd ? new Date(record.registrationEnd).toISOString() : undefined,
    timeZone: String(record.timeZone || 'Asia/Dhaka'),
    isPaused: Boolean(record.isPaused),
    status: getDynamicTournamentStatus({
      status: (record.status as TournamentStatus) || 'DRAFT',
      tournamentStart: record.tournamentStart ? new Date(record.tournamentStart).toISOString() : undefined,
      tournamentEnd: record.tournamentEnd ? new Date(record.tournamentEnd).toISOString() : undefined,
      matchTime: new Date(record.matchTime).toISOString(),
      isPaused: Boolean(record.isPaused),
    }),
    roomId: record.roomId ? String(record.roomId) : undefined,
    roomPassword: record.roomPassword ? String(record.roomPassword) : undefined,
    roomEnabled: Boolean(record.roomEnabled),
    roomReleaseTime: record.roomReleaseTime ? new Date(record.roomReleaseTime).toISOString() : undefined,
    rules: String(record.rules || ''),
    isPublished: Boolean(record.isPublished),
    isFeatured: Boolean(record.isFeatured),
    showOnHomepage: Boolean(record.showOnHomepage),
    registrationOpen: Boolean(record.registrationOpen),
    liveMatchToggle: Boolean(record.liveMatchToggle),
    allowCoinEntry: record.allowCoinEntry !== undefined ? Boolean(record.allowCoinEntry) : true,
    coinEntryFee: record.coinEntryFee !== undefined && record.coinEntryFee !== null && record.coinEntryFee !== '' ? Number(record.coinEntryFee) : undefined,
    entryFeeType: record.entryFeeType || (record.allowCoinEntry === false ? 'CASH' : (Number(record.entryFee || 0) === 0 ? 'FREE' : 'BOTH')),
    isGiveaway: Boolean(record.isGiveaway || record.requiresFullSquad || (typeof record.title === 'string' && record.title.toLowerCase().includes('giveaway'))),
    requiresFullSquad: Boolean(record.requiresFullSquad || record.isGiveaway || (typeof record.title === 'string' && record.title.toLowerCase().includes('giveaway'))),
    minSquadMembers: record.minSquadMembers ? Number(record.minSquadMembers) : 4,
    bannerImage: record.bannerImage ? String(record.bannerImage) : undefined,
    thumbnailImage: record.thumbnailImage ? String(record.thumbnailImage) : undefined,
    logoImage: record.logoImage ? String(record.logoImage) : undefined,
    galleryImages: parseGalleryImages(record.galleryImages),
    community: buildCommunityConfig(record),
  };
}

export async function listTournamentsFromDb() {
  const { data, error } = await supabaseAdmin
    .from('Tournament')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching tournaments from Supabase:', error);
    return [];
  }

  // Calculate 100% REAL verified participant counts directly from Participant table
  let realCounts: Record<string, number> = {};
  try {
    const { data: participants } = await supabaseAdmin
      .from('Participant')
      .select('tournamentId, status');

    if (participants && Array.isArray(participants)) {
      participants.forEach((p: any) => {
        if (p.tournamentId && p.status !== 'REJECTED' && p.status !== 'CANCELLED') {
          realCounts[p.tournamentId] = (realCounts[p.tournamentId] || 0) + 1;
        }
      });
    }
  } catch (err) {
    console.warn('Failed to query live participant counts:', err);
  }

  return (data || []).map((record: any) => {
    const realJoined = realCounts[record.id] !== undefined ? realCounts[record.id] : (Number(record.registeredCount) || 0);
    return serializeTournament({
      ...record,
      registeredCount: realJoined,
    });
  });
}

export async function getTournamentByIdFromDb(id: string) {
  const { data, error } = await supabaseAdmin
    .from('Tournament')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  // Get 100% REAL count from Participant table
  let realJoined = 0;
  try {
    const { count } = await supabaseAdmin
      .from('Participant')
      .select('*', { count: 'exact', head: true })
      .eq('tournamentId', id);
    realJoined = count || 0;
  } catch {
    realJoined = Number(data.registeredCount) || 0;
  }

  return serializeTournament({
    ...data,
    registeredCount: realJoined,
  });
}

export async function createTournamentInDb(input: Record<string, any>) {
  const id = input.id || `tour_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = {
    id,
    title: String(input.title || ''),
    description: String(input.description || ''),
    banner: input.banner ? String(input.banner) : null,
    game: input.game ? String(input.game) : 'FREE_FIRE',
    gameName: input.gameName ? String(input.gameName) : (
      input.game === 'EFOOTBALL' ? 'eFootball' :
      input.game === 'PUBG_MOBILE' ? 'PUBG Mobile' :
      input.game === 'VALORANT' ? 'Valorant' :
      input.game === 'MLBB' ? 'Mobile Legends' :
      input.game === 'COD_MOBILE' ? 'COD Mobile' :
      input.game === 'LUDO_KING' ? 'Ludo King' :
      'Free Fire'
    ),
    bannerImage: input.bannerImage ? String(input.bannerImage) : null,
    thumbnailImage: input.thumbnailImage ? String(input.thumbnailImage) : null,
    logoImage: input.logoImage ? String(input.logoImage) : null,
    galleryImages: JSON.stringify(parseGalleryImages(input.galleryImages)),
    mode: input.mode || 'SQUAD',
    format: input.format || 'BR_RANKED',
    tournamentBatchFormat: input.tournamentBatchFormat || 'SINGLE_ROOM',
    roomCapacity: input.roomCapacity ? Number(input.roomCapacity) : 12,
    maxRooms: input.maxRooms ? Number(input.maxRooms) : null,
    defaultAdvancementCount: input.defaultAdvancementCount ? Number(input.defaultAdvancementCount) : 3,
    entryFee: Number(input.entryFee || 0),
    prizePool: Number(input.prizePool || 0),
    firstPrize: Number(input.firstPrize || 0),
    secondPrize: Number(input.secondPrize || 0),
    thirdPrize: Number(input.thirdPrize || 0),
    perKillPrize: Number(input.perKillPrize || 0),
    prizeDistribution: input.prizeDistribution ? JSON.stringify(input.prizeDistribution) : null,
    maxTeams: Number(input.maxTeams || 0),
    registeredCount: 0,
    matchTime: new Date(input.matchTime || new Date()).toISOString(),
    registrationDeadline: new Date(input.registrationDeadline || new Date()).toISOString(),
    tournamentStart: input.tournamentStart ? new Date(input.tournamentStart).toISOString() : null,
    tournamentEnd: input.tournamentEnd ? new Date(input.tournamentEnd).toISOString() : null,
    registrationStart: input.registrationStart ? new Date(input.registrationStart).toISOString() : null,
    registrationEnd: input.registrationEnd ? new Date(input.registrationEnd).toISOString() : null,
    timeZone: input.timeZone ? String(input.timeZone) : 'Asia/Dhaka',
    isPaused: Boolean(input.isPaused),
    status: input.status || 'DRAFT',
    roomId: input.roomId ? String(input.roomId) : null,
    rules: input.prizeDistribution && input.prizeDistribution.length > 0
      ? `${(input.rules ? String(input.rules).replace(/<!-- PRIZES:[\s\S]*?-->/g, '').trim() : 'Standard tournament rules apply.')}\n<!-- PRIZES:${JSON.stringify(input.prizeDistribution)} -->`
      : (input.rules ? String(input.rules) : 'Standard tournament rules apply.'),
    isPublished: Boolean(input.isPublished),
    isFeatured: Boolean(input.isFeatured),
    showOnHomepage: Boolean(input.showOnHomepage),
    registrationOpen: Boolean(input.registrationOpen),
    liveMatchToggle: Boolean(input.liveMatchToggle),
    allowCoinEntry: input.allowCoinEntry !== undefined ? Boolean(input.allowCoinEntry) : true,
    coinEntryFee: input.coinEntryFee !== undefined && input.coinEntryFee !== null && input.coinEntryFee !== '' ? Number(input.coinEntryFee) : null,
    entryFeeType: input.entryFeeType || 'BOTH',
    isGiveaway: Boolean(input.isGiveaway || input.requiresFullSquad),
    requiresFullSquad: Boolean(input.requiresFullSquad || input.isGiveaway),
    communityEnabled: Boolean(input.community?.enabled ?? input.communityEnabled),
    communityAccessType: String(input.community?.accessType || input.communityAccessType || 'WHATSAPP'),
    communityInviteLink: input.community?.inviteLink || input.communityInviteLink || null,
    communityName: input.community?.communityName || input.communityName || null,
    communityDescription: input.community?.communityDescription || input.communityDescription || null,
    hideInviteLinkFromPublic: Boolean(input.community?.hideInviteLinkFromPublic ?? input.hideInviteLinkFromPublic ?? true),
    communityUnlockMode: String(input.community?.unlockMode || input.communityUnlockMode || 'SLOT_PURCHASE_ONLY'),
    communityIsDisabled: Boolean(input.community?.isDisabled ?? input.communityIsDisabled),
  };

  // Resilient insert with auto-column-stripping fallback if columns don't exist yet in Supabase
  let data: any = null;
  let currentPayload = { ...payload };
  let attempts = 0;

  while (attempts < 8) {
    attempts++;
    const res = await supabaseAdmin
      .from('Tournament')
      .insert([currentPayload])
      .select()
      .single();

    if (!res.error) {
      data = res.data;
      break;
    }

    const missingColMatch =
      res.error.message?.match(/Could not find the '([^']+)' column/i) ||
      res.error.message?.match(/column "([^"]+)" of relation "Tournament" does not exist/i) ||
      res.error.message?.match(/column "([^"]+)" does not exist/i);

    if (missingColMatch && missingColMatch[1] && currentPayload[missingColMatch[1]] !== undefined) {
      console.warn(`[Tournament insert fallback] Column '${missingColMatch[1]}' not in schema cache. Removing and retrying...`);
      delete currentPayload[missingColMatch[1]];
      continue;
    }

    let stripped = false;
    const knownOptional = [
      'defaultAdvancementCount',
      'tournamentBatchFormat',
      'roomCapacity',
      'maxRooms',
      'prizeDistribution',
      'isGiveaway',
      'requiresFullSquad',
      'allowCoinEntry',
      'coinEntryFee',
      'entryFeeType'
    ];
    for (const key of knownOptional) {
      if (currentPayload[key] !== undefined && (res.error.message?.includes(key) || res.error.message?.includes('schema cache'))) {
        delete currentPayload[key];
        stripped = true;
      }
    }

    if (stripped) continue;

    throw new Error(res.error.message);
  }

  return serializeTournament(data);
}

export async function updateTournamentInDb(id: string, input: Record<string, any>) {
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = String(input.title);
  if (input.description !== undefined) updateData.description = String(input.description);
  if (input.banner !== undefined) updateData.banner = String(input.banner);
  if (input.game !== undefined) updateData.game = String(input.game);
  if (input.gameName !== undefined) updateData.gameName = String(input.gameName);
  if (input.bannerImage !== undefined) updateData.bannerImage = input.bannerImage ? String(input.bannerImage) : null;
  if (input.thumbnailImage !== undefined) updateData.thumbnailImage = input.thumbnailImage ? String(input.thumbnailImage) : null;
  if (input.logoImage !== undefined) updateData.logoImage = input.logoImage ? String(input.logoImage) : null;
  if (input.galleryImages !== undefined) updateData.galleryImages = JSON.stringify(parseGalleryImages(input.galleryImages));
  if (input.mode !== undefined) updateData.mode = input.mode;
  if (input.format !== undefined) updateData.format = input.format;
  if (input.tournamentBatchFormat !== undefined) updateData.tournamentBatchFormat = input.tournamentBatchFormat;
  if (input.roomCapacity !== undefined) updateData.roomCapacity = Number(input.roomCapacity);
  if (input.maxRooms !== undefined) updateData.maxRooms = input.maxRooms !== null && input.maxRooms !== '' ? Number(input.maxRooms) : null;
  if (input.defaultAdvancementCount !== undefined) updateData.defaultAdvancementCount = Number(input.defaultAdvancementCount);
  if (input.entryFee !== undefined) updateData.entryFee = Number(input.entryFee);
  if (input.prizePool !== undefined) updateData.prizePool = Number(input.prizePool);
  if (input.firstPrize !== undefined) updateData.firstPrize = Number(input.firstPrize);
  if (input.secondPrize !== undefined) updateData.secondPrize = Number(input.secondPrize);
  if (input.thirdPrize !== undefined) updateData.thirdPrize = Number(input.thirdPrize);
  if (input.perKillPrize !== undefined) updateData.perKillPrize = Number(input.perKillPrize);
  if (input.prizeDistribution !== undefined) updateData.prizeDistribution = input.prizeDistribution ? JSON.stringify(input.prizeDistribution) : null;
  if (input.maxTeams !== undefined) updateData.maxTeams = Number(input.maxTeams);
  if (input.registeredCount !== undefined) updateData.registeredCount = Number(input.registeredCount);
  if (input.matchTime !== undefined) updateData.matchTime = new Date(input.matchTime).toISOString();
  if (input.registrationDeadline !== undefined) updateData.registrationDeadline = new Date(input.registrationDeadline).toISOString();
  if (input.tournamentStart !== undefined) updateData.tournamentStart = input.tournamentStart ? new Date(input.tournamentStart).toISOString() : null;
  if (input.tournamentEnd !== undefined) updateData.tournamentEnd = input.tournamentEnd ? new Date(input.tournamentEnd).toISOString() : null;
  if (input.registrationStart !== undefined) updateData.registrationStart = input.registrationStart ? new Date(input.registrationStart).toISOString() : null;
  if (input.registrationEnd !== undefined) updateData.registrationEnd = input.registrationEnd ? new Date(input.registrationEnd).toISOString() : null;
  if (input.timeZone !== undefined) updateData.timeZone = String(input.timeZone);
  if (input.isPaused !== undefined) updateData.isPaused = Boolean(input.isPaused);
  if (input.status !== undefined) updateData.status = input.status;
  if (input.roomId !== undefined) updateData.roomId = input.roomId ? String(input.roomId) : null;
  if (input.roomPassword !== undefined) updateData.roomPassword = input.roomPassword ? String(input.roomPassword) : null;
  if (input.roomEnabled !== undefined) updateData.roomEnabled = Boolean(input.roomEnabled);
  if (input.roomReleaseTime !== undefined) updateData.roomReleaseTime = input.roomReleaseTime ? new Date(input.roomReleaseTime).toISOString() : null;
  if (input.rules !== undefined || input.prizeDistribution !== undefined) {
    const rawRules = input.rules !== undefined ? String(input.rules) : '';
    const cleanRules = rawRules.replace(/<!-- PRIZES:[\s\S]*?-->/g, '').trim();
    if (input.prizeDistribution && input.prizeDistribution.length > 0) {
      updateData.rules = `${cleanRules || 'Standard tournament rules apply.'}\n<!-- PRIZES:${JSON.stringify(input.prizeDistribution)} -->`;
    } else if (input.rules !== undefined) {
      updateData.rules = cleanRules || 'Standard tournament rules apply.';
    }
  }
  if (input.isPublished !== undefined) updateData.isPublished = Boolean(input.isPublished);
  if (input.isFeatured !== undefined) updateData.isFeatured = Boolean(input.isFeatured);
  if (input.showOnHomepage !== undefined) updateData.showOnHomepage = Boolean(input.showOnHomepage);
  if (input.registrationOpen !== undefined) updateData.registrationOpen = Boolean(input.registrationOpen);
  if (input.liveMatchToggle !== undefined) updateData.liveMatchToggle = Boolean(input.liveMatchToggle);
  if (input.allowCoinEntry !== undefined) updateData.allowCoinEntry = Boolean(input.allowCoinEntry);
  if (input.coinEntryFee !== undefined) updateData.coinEntryFee = input.coinEntryFee !== null && input.coinEntryFee !== '' ? Number(input.coinEntryFee) : null;
  if (input.entryFeeType !== undefined) updateData.entryFeeType = input.entryFeeType;
  if (input.isGiveaway !== undefined || input.requiresFullSquad !== undefined) {
    updateData.isGiveaway = Boolean(input.isGiveaway || input.requiresFullSquad);
    updateData.requiresFullSquad = Boolean(input.requiresFullSquad || input.isGiveaway);
  }

  if (input.community !== undefined || input.communityEnabled !== undefined) {
    updateData.communityEnabled = Boolean(input.community?.enabled ?? input.communityEnabled);
  }
  if (input.community !== undefined || input.communityAccessType !== undefined) {
    updateData.communityAccessType = String(input.community?.accessType || input.communityAccessType || 'WHATSAPP');
  }
  if (input.community !== undefined || input.communityInviteLink !== undefined) {
    updateData.communityInviteLink = input.community?.inviteLink || input.communityInviteLink || null;
  }
  if (input.community !== undefined || input.communityName !== undefined) {
    updateData.communityName = input.community?.communityName || input.communityName || null;
  }
  if (input.community !== undefined || input.communityDescription !== undefined) {
    updateData.communityDescription = input.community?.communityDescription || input.communityDescription || null;
  }
  if (input.community !== undefined || input.hideInviteLinkFromPublic !== undefined) {
    updateData.hideInviteLinkFromPublic = Boolean(input.community?.hideInviteLinkFromPublic ?? input.hideInviteLinkFromPublic ?? true);
  }
  if (input.community !== undefined || input.communityUnlockMode !== undefined) {
    updateData.communityUnlockMode = String(input.community?.unlockMode || input.communityUnlockMode || 'SLOT_PURCHASE_ONLY');
  }
  if (input.community !== undefined || input.communityIsDisabled !== undefined) {
    updateData.communityIsDisabled = Boolean(input.community?.isDisabled ?? input.communityIsDisabled);
  }

  // Resilient update with auto-column-stripping fallback if columns don't exist yet in Supabase
  let data: any = null;
  let currentUpdate = { ...updateData };
  let attempts = 0;

  while (attempts < 8) {
    attempts++;
    const res = await supabaseAdmin
      .from('Tournament')
      .update(currentUpdate)
      .eq('id', id)
      .select()
      .single();

    if (!res.error) {
      data = res.data;
      break;
    }

    const missingColMatch =
      res.error.message?.match(/Could not find the '([^']+)' column/i) ||
      res.error.message?.match(/column "([^"]+)" of relation "Tournament" does not exist/i) ||
      res.error.message?.match(/column "([^"]+)" does not exist/i);

    if (missingColMatch && missingColMatch[1] && currentUpdate[missingColMatch[1]] !== undefined) {
      console.warn(`[Tournament update fallback] Column '${missingColMatch[1]}' not in schema cache. Removing and retrying...`);
      delete currentUpdate[missingColMatch[1]];
      continue;
    }

    let stripped = false;
    const knownOptional = [
      'defaultAdvancementCount',
      'tournamentBatchFormat',
      'roomCapacity',
      'maxRooms',
      'prizeDistribution',
      'isGiveaway',
      'requiresFullSquad',
      'allowCoinEntry',
      'coinEntryFee',
      'entryFeeType'
    ];
    for (const key of knownOptional) {
      if (currentUpdate[key] !== undefined && (res.error.message?.includes(key) || res.error.message?.includes('schema cache'))) {
        delete currentUpdate[key];
        stripped = true;
      }
    }

    if (stripped) continue;

    throw new Error(res.error.message);
  }

  return serializeTournament(data);
}

export async function deleteTournamentInDb(id: string) {
  const { error } = await supabaseAdmin
    .from('Tournament')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}
