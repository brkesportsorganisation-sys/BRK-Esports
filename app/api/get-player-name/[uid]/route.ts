import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const cleanUid = uid?.trim();

    if (!cleanUid || cleanUid.length < 6) {
      return NextResponse.json({ success: false, message: 'Valid Free Fire UID is required (min 6 digits).' }, { status: 400 });
    }

    let foundNickname: string | null = null;
    let uidValidated = false;

    // 1. DuniaGames
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const dgRes = await fetch('https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ productId: 3, itemId: 353, catalogId: 376, paymentId: 752, gameId: cleanUid }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (dgRes.ok) {
        const dgData = await dgRes.json();
        const userName = dgData?.data?.userName || dgData?.data?.username || dgData?.data?.name;
        if (userName && typeof userName === 'string' && userName.trim().length > 0) {
          foundNickname = userName.trim();
        }
      }
    } catch {}

    // 2. isan.eu.org - validate UID
    if (!foundNickname) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://api.isan.eu.org/nickname/ff?id=${cleanUid}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const nick = data.name || data.nickname || data.ign;
          if (nick && typeof nick === 'string' && nick.trim().length > 0 && nick !== 'null') {
            foundNickname = nick.trim();
          } else if (data.success === true) {
            uidValidated = true;
          }
        }
      } catch {}
    }

    // 3. Garena Shop SG
    if (!foundNickname && !uidValidated) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch('https://shop.garena.sg/api/auth/player_id_login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://shop.garena.sg', 'Referer': 'https://shop.garena.sg/' },
          body: JSON.stringify({ app_id: 100067, login_id: cleanUid, app_server_id: 0 }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data.nickname && typeof data.nickname === 'string' && data.nickname.trim().length > 0) {
            foundNickname = data.nickname.trim();
          }
        }
      } catch {}
    }

    if (foundNickname) {
      return NextResponse.json({ success: true, uid: cleanUid, nickname: foundNickname, verified: true });
    }

    if (uidValidated) {
      return NextResponse.json({ success: true, uid: cleanUid, nickname: null, verified: true, message: 'UID verified' });
    }

    return NextResponse.json({ success: false, message: 'Player ID not found. Please check your UID.' }, { status: 404 });

  } catch (error: any) {
    console.error('[API /api/get-player-name/:uid]', error);
    return NextResponse.json({ success: false, message: 'Server error fetching player name.' }, { status: 500 });
  }
}