import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction, validateAdminInput, validateNumberInput } from '@/lib/admin-auth';
import { deleteTournamentInDb, getTournamentByIdFromDb, updateTournamentInDb } from '@/lib/tournament-store';
import { saveBase64Image } from '@/lib/upload';

async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

function getCsrfToken(request: NextRequest) {
  return request.headers.get('x-csrf-token') || request.headers.get('x-admin-csrf');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const existing = await getTournamentByIdFromDb(id);
    if (!existing) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    // Upload images only if new base64 was sent
    const bannerImageUrl = body.bannerImage
      ? await saveBase64Image(body.bannerImage, 'banner')
      : undefined;
    const thumbnailImageUrl = body.thumbnailImage
      ? await saveBase64Image(body.thumbnailImage, 'thumbnail')
      : undefined;
    const logoImageUrl = body.logoImage
      ? await saveBase64Image(body.logoImage, 'logo')
      : undefined;

    let galleryImageUrls: string[] | undefined = undefined;
    if (Array.isArray(body.galleryImages)) {
      galleryImageUrls = [];
      for (let i = 0; i < body.galleryImages.length; i++) {
        const url = await saveBase64Image(body.galleryImages[i], `gallery_${i}`);
        if (url) galleryImageUrls.push(url);
      }
    }

    const updates: Record<string, any> = {
      ...(body.title !== undefined ? { title: validateAdminInput(body.title, 3, 120) || undefined } : {}),
      ...(body.description !== undefined ? { description: validateAdminInput(body.description, 10, 4000) || undefined } : {}),
      ...(body.banner !== undefined || bannerImageUrl !== undefined ? { banner: bannerImageUrl || body.banner || undefined } : {}),
      ...(body.game !== undefined ? { game: String(body.game) } : {}),
      ...(body.gameName !== undefined ? { gameName: String(body.gameName) } : {}),
      ...(body.mode !== undefined ? { mode: body.mode } : {}),
      ...(body.format !== undefined ? { format: body.format } : {}),
      ...(body.entryFee !== undefined ? { entryFee: validateNumberInput(body.entryFee) ?? undefined } : {}),
      ...(body.prizePool !== undefined ? { prizePool: validateNumberInput(body.prizePool) ?? undefined } : {}),
      ...(body.firstPrize !== undefined ? { firstPrize: validateNumberInput(body.firstPrize) ?? undefined } : {}),
      ...(body.secondPrize !== undefined ? { secondPrize: validateNumberInput(body.secondPrize) ?? undefined } : {}),
      ...(body.thirdPrize !== undefined ? { thirdPrize: validateNumberInput(body.thirdPrize) ?? undefined } : {}),
      ...(body.perKillPrize !== undefined ? { perKillPrize: validateNumberInput(body.perKillPrize) ?? undefined } : {}),
      ...(body.maxTeams !== undefined ? { maxTeams: validateNumberInput(body.maxTeams) ?? undefined } : {}),
      ...(body.matchTime !== undefined ? { matchTime: body.matchTime } : {}),
      ...(body.registrationDeadline !== undefined ? { registrationDeadline: body.registrationDeadline } : {}),
      ...(body.tournamentStart !== undefined ? { tournamentStart: body.tournamentStart || undefined } : {}),
      ...(body.tournamentEnd !== undefined ? { tournamentEnd: body.tournamentEnd || undefined } : {}),
      ...(body.registrationStart !== undefined ? { registrationStart: body.registrationStart || undefined } : {}),
      ...(body.registrationEnd !== undefined ? { registrationEnd: body.registrationEnd || undefined } : {}),
      ...(body.timeZone !== undefined ? { timeZone: body.timeZone || 'Asia/Dhaka' } : {}),
      ...(body.isPaused !== undefined ? { isPaused: Boolean(body.isPaused) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.roomId !== undefined ? { roomId: body.roomId || undefined } : {}),
      ...(body.roomPassword !== undefined ? { roomPassword: body.roomPassword || undefined } : {}),
      ...(body.roomEnabled !== undefined ? { roomEnabled: Boolean(body.roomEnabled) } : {}),
      ...(body.roomReleaseTime !== undefined ? { roomReleaseTime: body.roomReleaseTime ? new Date(body.roomReleaseTime).toISOString() : undefined } : {}),
      ...(body.rules !== undefined ? { rules: body.rules } : {}),
      ...(bannerImageUrl !== undefined ? { bannerImage: bannerImageUrl } : {}),
      ...(thumbnailImageUrl !== undefined ? { thumbnailImage: thumbnailImageUrl } : {}),
      ...(logoImageUrl !== undefined ? { logoImage: logoImageUrl } : {}),
      ...(galleryImageUrls !== undefined ? { galleryImages: galleryImageUrls } : {}),
      ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {}),
      ...(body.isPublished !== undefined ? { isPublished: Boolean(body.isPublished) } : {}),
      ...(body.showOnHomepage !== undefined ? { showOnHomepage: Boolean(body.showOnHomepage) } : {}),
      ...(body.registrationOpen !== undefined ? { registrationOpen: Boolean(body.registrationOpen) } : {}),
      ...(body.liveMatchToggle !== undefined ? { liveMatchToggle: Boolean(body.liveMatchToggle) } : {}),
      ...(body.community !== undefined || body.communityEnabled !== undefined ? { communityEnabled: Boolean(body.community?.enabled ?? body.communityEnabled) } : {}),
      ...(body.community !== undefined || body.communityAccessType !== undefined ? { communityAccessType: body.community?.accessType || body.communityAccessType || 'WHATSAPP' } : {}),
      ...(body.community !== undefined || body.communityInviteLink !== undefined ? { communityInviteLink: body.community?.inviteLink || body.communityInviteLink || undefined } : {}),
      ...(body.community !== undefined || body.communityName !== undefined ? { communityName: body.community?.communityName || body.communityName || undefined } : {}),
      ...(body.community !== undefined || body.communityDescription !== undefined ? { communityDescription: body.community?.communityDescription || body.communityDescription || undefined } : {}),
      ...(body.community !== undefined || body.hideInviteLinkFromPublic !== undefined ? { hideInviteLinkFromPublic: Boolean(body.community?.hideInviteLinkFromPublic ?? body.hideInviteLinkFromPublic ?? true) } : {}),
      ...(body.community !== undefined || body.communityUnlockMode !== undefined ? { communityUnlockMode: body.community?.unlockMode || body.communityUnlockMode || 'SLOT_PURCHASE_ONLY' } : {}),
      ...(body.community !== undefined || body.communityIsDisabled !== undefined ? { communityIsDisabled: Boolean(body.community?.isDisabled ?? body.communityIsDisabled) } : {}),
    };

    const updated = await updateTournamentInDb(id, updates);
    logAdminAction(session!.email, 'TOURNAMENT_UPDATE', `Updated tournament "${updated.title}" (id: ${id})`);
    console.info(`[PATCH /api/admin/tournaments/${id}] Success: tournament updated`);
    return NextResponse.json({ tournament: updated, message: 'Tournament updated successfully.' });
  } catch (error: any) {
    console.error(`[PATCH /api/admin/tournaments/${id}] Error:`, error?.message || error);
    return NextResponse.json({ message: error?.message || 'Failed to update tournament.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!requireAdminRole(session, ['SUPER_ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const csrfToken = getCsrfToken(request);
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('admin_csrf')?.value;
  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    return NextResponse.json({ message: 'Invalid CSRF token' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const tournament = await getTournamentByIdFromDb(id);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    await deleteTournamentInDb(id);
    logAdminAction(session!.email, 'TOURNAMENT_DELETE', `Deleted tournament "${tournament.title}" (id: ${id})`);
    console.info(`[DELETE /api/admin/tournaments/${id}] Success: tournament deleted`);
    return NextResponse.json({ ok: true, message: 'Tournament deleted successfully.' });
  } catch (error: any) {
    console.error(`[DELETE /api/admin/tournaments/${id}] Error:`, error?.message || error);
    return NextResponse.json({ message: error?.message || 'Failed to delete tournament.' }, { status: 500 });
  }
}
