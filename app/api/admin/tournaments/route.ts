import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction, validateAdminInput, validateNumberInput } from '@/lib/admin-auth';
import { createTournamentInDb, listTournamentsFromDb } from '@/lib/tournament-store';
import { saveBase64Image } from '@/lib/upload';

async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

function getCsrfToken(request: NextRequest) {
  return request.headers.get('x-csrf-token') || request.headers.get('x-admin-csrf');
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const tournaments = await listTournamentsFromDb();
    return NextResponse.json({ tournaments });
  } catch (error: any) {
    console.error('[GET /api/admin/tournaments] Error:', error?.message || error);
    return NextResponse.json({ message: 'Failed to load tournaments', error: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const csrfToken = getCsrfToken(request);
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('admin_csrf')?.value;
  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    return NextResponse.json({ message: 'Invalid CSRF token' }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const title = validateAdminInput(body.title, 3, 120);
  const description = validateAdminInput(body.description, 10, 4000);
  const mode = body.mode;
  const format = body.format;
  const entryFee = validateNumberInput(body.entryFee);
  const prizePool = validateNumberInput(body.prizePool);
  const firstPrize = validateNumberInput(body.firstPrize ?? 0);
  const secondPrize = validateNumberInput(body.secondPrize ?? 0);
  const thirdPrize = validateNumberInput(body.thirdPrize ?? 0);
  const maxTeams = validateNumberInput(body.maxTeams);
  const perKillPrize = validateNumberInput(body.perKillPrize ?? 0);

  if (!title || !description || !mode || !format || entryFee === null || prizePool === null || firstPrize === null || secondPrize === null || thirdPrize === null || maxTeams === null || perKillPrize === null) {
    return NextResponse.json({ message: 'Missing or invalid required fields: title, description, mode, format, entryFee, prizePool, maxTeams are required.' }, { status: 400 });
  }

  try {
    console.info('[POST /api/admin/tournaments] Uploading images...');
    const bannerImageUrl = await saveBase64Image(body.bannerImage, 'banner');
    const thumbnailImageUrl = await saveBase64Image(body.thumbnailImage, 'thumbnail');
    const logoImageUrl = await saveBase64Image(body.logoImage, 'logo');

    const galleryImageUrls: string[] = [];
    if (Array.isArray(body.galleryImages)) {
      for (let i = 0; i < body.galleryImages.length; i++) {
        const url = await saveBase64Image(body.galleryImages[i], `gallery_${i}`);
        if (url) galleryImageUrls.push(url);
      }
    }

    const bannerUrl = bannerImageUrl || body.banner || null;

    console.info(`[POST /api/admin/tournaments] Creating tournament: "${title}"`);
    const tournament = await createTournamentInDb({
      title,
      description,
      banner: bannerUrl,
      game: body.game || 'FREE_FIRE',
      gameName: body.gameName || undefined,
      mode,
      format,
      tournamentBatchFormat: body.tournamentBatchFormat || 'SINGLE_ROOM',
      roomCapacity: body.roomCapacity ? Number(body.roomCapacity) : 12,
      maxRooms: body.maxRooms ? Number(body.maxRooms) : undefined,
      defaultAdvancementCount: body.defaultAdvancementCount ? Number(body.defaultAdvancementCount) : 3,
      entryFee,
      prizePool,
      firstPrize,
      secondPrize,
      thirdPrize,
      perKillPrize,
      prizeDistribution: body.prizeDistribution || undefined,
      maxTeams,
      matchTime: new Date(body.matchTime || Date.now() + 86400000).toISOString(),
      registrationDeadline: new Date(body.registrationDeadline || Date.now() + 80000000).toISOString(),
      tournamentStart: body.tournamentStart || undefined,
      tournamentEnd: body.tournamentEnd || undefined,
      registrationStart: body.registrationStart || undefined,
      registrationEnd: body.registrationEnd || undefined,
      timeZone: body.timeZone || 'Asia/Dhaka',
      isPaused: Boolean(body.isPaused),
      status: body.status || 'DRAFT',
      roomId: body.roomId || undefined,
      roomPassword: body.roomPassword || undefined,
      roomEnabled: Boolean(body.roomEnabled),
      roomReleaseTime: body.roomReleaseTime ? new Date(body.roomReleaseTime).toISOString() : undefined,
      rules: body.rules || 'Standard tournament rules apply.',
      bannerImage: bannerImageUrl || undefined,
      thumbnailImage: thumbnailImageUrl || undefined,
      logoImage: logoImageUrl || undefined,
      galleryImages: galleryImageUrls,
      isFeatured: Boolean(body.isFeatured),
      isPublished: Boolean(body.isPublished),
      showOnHomepage: body.showOnHomepage !== false,
      registrationOpen: body.registrationOpen !== false,
      liveMatchToggle: Boolean(body.liveMatchToggle),
      allowCoinEntry: body.allowCoinEntry !== false,
      coinEntryFee: body.coinEntryFee !== undefined && body.coinEntryFee !== '' ? Number(body.coinEntryFee) : undefined,
      entryFeeType: body.entryFeeType || 'BOTH',
      isGiveaway: Boolean(body.isGiveaway || body.requiresFullSquad),
      requiresFullSquad: Boolean(body.requiresFullSquad || body.isGiveaway),
      community: body.community || undefined,
      communityEnabled: Boolean(body.community?.enabled),
      communityAccessType: body.community?.accessType || 'WHATSAPP',
      communityInviteLink: body.community?.inviteLink || undefined,
      communityName: body.community?.communityName || undefined,
      communityDescription: body.community?.communityDescription || undefined,
      hideInviteLinkFromPublic: Boolean(body.community?.hideInviteLinkFromPublic ?? true),
      communityUnlockMode: body.community?.unlockMode || 'SLOT_PURCHASE_ONLY',
      communityIsDisabled: Boolean(body.community?.isDisabled),
    });

    logAdminAction(session!.email, 'TOURNAMENT_CREATE', `Created tournament "${title}" (id: ${tournament.id})`);
    console.info(`[POST /api/admin/tournaments] Success: tournament "${title}" created with id ${tournament.id}`);
    return NextResponse.json({ tournament, message: 'Tournament created successfully.' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/tournaments] Error creating tournament:', error?.message || error);
    return NextResponse.json({ message: error?.message || 'Failed to save tournament. Please try again.' }, { status: 500 });
  }
}
