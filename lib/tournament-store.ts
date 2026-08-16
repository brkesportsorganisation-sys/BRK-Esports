import { supabaseAdmin, supabase } from '@/lib/supabase';
import type { Tournament, TournamentCommunityConfig, TournamentStatus, CommunityAccessType, CommunityUnlockMode } from '@/lib/types';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';

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
  return {
    id: String(record.id),
    title: String(record.title || ''),
    description: String(record.description || ''),
    banner: String(record.banner || ''),
    mode: (record.mode as Tournament['mode']) || 'SQUAD',
    format: (record.format as Tournament['format']) || 'BR_RANKED',
    entryFee: Number(record.entryFee || 0),
    prizePool: Number(record.prizePool || 0),
    firstPrize: Number(record.firstPrize || 0),
    secondPrize: Number(record.secondPrize || 0),
    thirdPrize: Number(record.thirdPrize || 0),
    perKillPrize: Number(record.perKillPrize || 0),
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
  return (data || []).map(serializeTournament);
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
  return serializeTournament(data);
}

export async function createTournamentInDb(input: Record<string, any>) {
  const id = input.id || `tour_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = {
    id,
    title: String(input.title || ''),
    description: String(input.description || ''),
    banner: input.banner ? String(input.banner) : null,
    bannerImage: input.bannerImage ? String(input.bannerImage) : null,
    thumbnailImage: input.thumbnailImage ? String(input.thumbnailImage) : null,
    logoImage: input.logoImage ? String(input.logoImage) : null,
    galleryImages: JSON.stringify(parseGalleryImages(input.galleryImages)),
    mode: input.mode || 'SQUAD',
    format: input.format || 'BR_RANKED',
    entryFee: Number(input.entryFee || 0),
    prizePool: Number(input.prizePool || 0),
    firstPrize: Number(input.firstPrize || 0),
    secondPrize: Number(input.secondPrize || 0),
    thirdPrize: Number(input.thirdPrize || 0),
    perKillPrize: Number(input.perKillPrize || 0),
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
    roomPassword: input.roomPassword ? String(input.roomPassword) : null,
    rules: input.rules ? String(input.rules) : 'Standard tournament rules apply.',
    isPublished: Boolean(input.isPublished),
    isFeatured: Boolean(input.isFeatured),
    showOnHomepage: Boolean(input.showOnHomepage),
    registrationOpen: Boolean(input.registrationOpen),
    liveMatchToggle: Boolean(input.liveMatchToggle),
    communityEnabled: Boolean(input.community?.enabled ?? input.communityEnabled),
    communityAccessType: String(input.community?.accessType || input.communityAccessType || 'WHATSAPP'),
    communityInviteLink: input.community?.inviteLink || input.communityInviteLink || null,
    communityName: input.community?.communityName || input.communityName || null,
    communityDescription: input.community?.communityDescription || input.communityDescription || null,
    hideInviteLinkFromPublic: Boolean(input.community?.hideInviteLinkFromPublic ?? input.hideInviteLinkFromPublic ?? true),
    communityUnlockMode: String(input.community?.unlockMode || input.communityUnlockMode || 'SLOT_PURCHASE_ONLY'),
    communityIsDisabled: Boolean(input.community?.isDisabled ?? input.communityIsDisabled),
  };

  const { data, error } = await supabaseAdmin
    .from('Tournament')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
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
  if (input.bannerImage !== undefined) updateData.bannerImage = input.bannerImage ? String(input.bannerImage) : null;
  if (input.thumbnailImage !== undefined) updateData.thumbnailImage = input.thumbnailImage ? String(input.thumbnailImage) : null;
  if (input.logoImage !== undefined) updateData.logoImage = input.logoImage ? String(input.logoImage) : null;
  if (input.galleryImages !== undefined) updateData.galleryImages = JSON.stringify(parseGalleryImages(input.galleryImages));
  if (input.mode !== undefined) updateData.mode = input.mode;
  if (input.format !== undefined) updateData.format = input.format;
  if (input.entryFee !== undefined) updateData.entryFee = Number(input.entryFee);
  if (input.prizePool !== undefined) updateData.prizePool = Number(input.prizePool);
  if (input.firstPrize !== undefined) updateData.firstPrize = Number(input.firstPrize);
  if (input.secondPrize !== undefined) updateData.secondPrize = Number(input.secondPrize);
  if (input.thirdPrize !== undefined) updateData.thirdPrize = Number(input.thirdPrize);
  if (input.perKillPrize !== undefined) updateData.perKillPrize = Number(input.perKillPrize);
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
  if (input.rules !== undefined) updateData.rules = String(input.rules);
  if (input.isPublished !== undefined) updateData.isPublished = Boolean(input.isPublished);
  if (input.isFeatured !== undefined) updateData.isFeatured = Boolean(input.isFeatured);
  if (input.showOnHomepage !== undefined) updateData.showOnHomepage = Boolean(input.showOnHomepage);
  if (input.registrationOpen !== undefined) updateData.registrationOpen = Boolean(input.registrationOpen);
  if (input.liveMatchToggle !== undefined) updateData.liveMatchToggle = Boolean(input.liveMatchToggle);

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

  const { data, error } = await supabaseAdmin
    .from('Tournament')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
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
