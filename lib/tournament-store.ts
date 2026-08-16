import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
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
      isPaused: Boolean(record.isPaused)
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
  const records = await prisma.tournament.findMany({ orderBy: { createdAt: 'desc' } });
  return records.map(serializeTournament);
}

export async function getTournamentByIdFromDb(id: string) {
  const record = await prisma.tournament.findUnique({ where: { id } });
  return record ? serializeTournament(record) : null;
}

export async function createTournamentInDb(input: Record<string, any>) {
  const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return tx.tournament.create({
      data: {
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
        matchTime: new Date(input.matchTime || new Date()),
        registrationDeadline: new Date(input.registrationDeadline || new Date()),
        tournamentStart: input.tournamentStart ? new Date(input.tournamentStart) : null,
        tournamentEnd: input.tournamentEnd ? new Date(input.tournamentEnd) : null,
        registrationStart: input.registrationStart ? new Date(input.registrationStart) : null,
        registrationEnd: input.registrationEnd ? new Date(input.registrationEnd) : null,
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
      },
    });
  });

  return serializeTournament(record as Record<string, any>);
}

export async function updateTournamentInDb(id: string, input: Record<string, any>) {
  const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return tx.tournament.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: String(input.title) } : {}),
        ...(input.description !== undefined ? { description: String(input.description) } : {}),
        ...(input.banner !== undefined ? { banner: String(input.banner) } : {}),
        ...(input.bannerImage !== undefined ? { bannerImage: input.bannerImage ? String(input.bannerImage) : null } : {}),
        ...(input.thumbnailImage !== undefined ? { thumbnailImage: input.thumbnailImage ? String(input.thumbnailImage) : null } : {}),
        ...(input.logoImage !== undefined ? { logoImage: input.logoImage ? String(input.logoImage) : null } : {}),
        ...(input.galleryImages !== undefined ? { galleryImages: JSON.stringify(parseGalleryImages(input.galleryImages)) } : {}),
        ...(input.mode !== undefined ? { mode: input.mode } : {}),
        ...(input.format !== undefined ? { format: input.format } : {}),
        ...(input.entryFee !== undefined ? { entryFee: Number(input.entryFee) } : {}),
        ...(input.prizePool !== undefined ? { prizePool: Number(input.prizePool) } : {}),
        ...(input.firstPrize !== undefined ? { firstPrize: Number(input.firstPrize) } : {}),
        ...(input.secondPrize !== undefined ? { secondPrize: Number(input.secondPrize) } : {}),
        ...(input.thirdPrize !== undefined ? { thirdPrize: Number(input.thirdPrize) } : {}),
        ...(input.perKillPrize !== undefined ? { perKillPrize: Number(input.perKillPrize) } : {}),
        ...(input.maxTeams !== undefined ? { maxTeams: Number(input.maxTeams) } : {}),
        ...(input.matchTime !== undefined ? { matchTime: new Date(input.matchTime) } : {}),
        ...(input.registrationDeadline !== undefined ? { registrationDeadline: new Date(input.registrationDeadline) } : {}),
        ...(input.tournamentStart !== undefined ? { tournamentStart: input.tournamentStart ? new Date(input.tournamentStart) : null } : {}),
        ...(input.tournamentEnd !== undefined ? { tournamentEnd: input.tournamentEnd ? new Date(input.tournamentEnd) : null } : {}),
        ...(input.registrationStart !== undefined ? { registrationStart: input.registrationStart ? new Date(input.registrationStart) : null } : {}),
        ...(input.registrationEnd !== undefined ? { registrationEnd: input.registrationEnd ? new Date(input.registrationEnd) : null } : {}),
        ...(input.timeZone !== undefined ? { timeZone: String(input.timeZone) } : {}),
        ...(input.isPaused !== undefined ? { isPaused: Boolean(input.isPaused) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.roomId !== undefined ? { roomId: input.roomId ? String(input.roomId) : null } : {}),
        ...(input.roomPassword !== undefined ? { roomPassword: input.roomPassword ? String(input.roomPassword) : null } : {}),
        ...(input.roomEnabled !== undefined ? { roomEnabled: Boolean(input.roomEnabled) } : {}),
        ...(input.roomReleaseTime !== undefined ? { roomReleaseTime: input.roomReleaseTime ? new Date(input.roomReleaseTime) : null } : {}),
        ...(input.rules !== undefined ? { rules: String(input.rules) } : {}),
        ...(input.isPublished !== undefined ? { isPublished: Boolean(input.isPublished) } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: Boolean(input.isFeatured) } : {}),
        ...(input.showOnHomepage !== undefined ? { showOnHomepage: Boolean(input.showOnHomepage) } : {}),
        ...(input.registrationOpen !== undefined ? { registrationOpen: Boolean(input.registrationOpen) } : {}),
        ...(input.liveMatchToggle !== undefined ? { liveMatchToggle: Boolean(input.liveMatchToggle) } : {}),
        ...(input.community !== undefined || input.communityEnabled !== undefined ? { communityEnabled: Boolean(input.community?.enabled ?? input.communityEnabled) } : {}),
        ...(input.community !== undefined || input.communityAccessType !== undefined ? { communityAccessType: String(input.community?.accessType || input.communityAccessType || 'WHATSAPP') } : {}),
        ...(input.community !== undefined || input.communityInviteLink !== undefined ? { communityInviteLink: input.community?.inviteLink || input.communityInviteLink || null } : {}),
        ...(input.community !== undefined || input.communityName !== undefined ? { communityName: input.community?.communityName || input.communityName || null } : {}),
        ...(input.community !== undefined || input.communityDescription !== undefined ? { communityDescription: input.community?.communityDescription || input.communityDescription || null } : {}),
        ...(input.community !== undefined || input.hideInviteLinkFromPublic !== undefined ? { hideInviteLinkFromPublic: Boolean(input.community?.hideInviteLinkFromPublic ?? input.hideInviteLinkFromPublic ?? true) } : {}),
        ...(input.community !== undefined || input.communityUnlockMode !== undefined ? { communityUnlockMode: String(input.community?.unlockMode || input.communityUnlockMode || 'SLOT_PURCHASE_ONLY') } : {}),
        ...(input.community !== undefined || input.communityIsDisabled !== undefined ? { communityIsDisabled: Boolean(input.community?.isDisabled ?? input.communityIsDisabled) } : {}),
      },
    });
  });

  return serializeTournament(record as Record<string, any>);
}

export async function deleteTournamentInDb(id: string) {
  await prisma.tournament.delete({ where: { id } });
  return true;
}
