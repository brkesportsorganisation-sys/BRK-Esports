import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const cleanUid = uid?.trim();

    if (!cleanUid || cleanUid.length < 6) {
      return NextResponse.json({ success: false, message: 'Valid Free Fire UID is required (min 6-8 digits).' }, { status: 400 });
    }

    let foundNickname: string | null = null;
    let foundRegion: string = 'BD';

    // 1. DuniaGames Free Fire Official Inquiry Endpoint (Fastest & No Cloudflare block)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const dgRes = await fetch('https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          productId: 3,
          itemId: 353,
          catalogId: 376,
          paymentId: 752,
          gameId: cleanUid,
        }),
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
    } catch {
      // Continue to next gateway
    }

    // 2. Open Nickname Lookup Gateways
    if (!foundNickname) {
      const publicGateways = [
        `https://api.isan.eu.org/nickname/ff?id=${cleanUid}`,
        `https://api.v2.isan.eu.org/nickname/ff?id=${cleanUid}`,
        `https://api-player-info-ff.vercel.app/api/player?uid=${cleanUid}`,
        `https://free-fire-api.vercel.app/api/player/${cleanUid}`,
        `https://ff-api-gamma.vercel.app/api/player?uid=${cleanUid}`,
      ];

      for (const url of publicGateways) {
        if (foundNickname) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const nick = data.name || data.nickname || data.ign || data.AccountName || data.data?.name || data.data?.nickname || data.userName;
            if (nick && typeof nick === 'string' && nick.trim().length > 0 && nick !== 'null') {
              foundNickname = nick.trim();
              break;
            }
          }
        } catch {
          // Continue
        }
      }
    }

    // 3. Direct Garena Top-up Portal Gateways
    if (!foundNickname) {
      const garenaEndpoints = [
        'https://topup.garena.com/api/auth/player_id_login',
        'https://shop.garena.sg/api/auth/player_id_login',
        'https://shop2game.com/api/auth/player_id_login',
      ];

      for (const url of garenaEndpoints) {
        if (foundNickname) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Origin': 'https://topup.garena.com',
              'Referer': 'https://topup.garena.com/app/100067/id/buy',
              'Accept': 'application/json, text/plain, */*',
            },
            body: JSON.stringify({
              app_id: 100067,
              login_id: cleanUid,
              app_server_id: 0,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.nickname && typeof data.nickname === 'string' && data.nickname.trim().length > 0) {
              foundNickname = data.nickname.trim();
              foundRegion = data.region || 'BD';
              break;
            }
          }
        } catch {
          // Continue
        }
      }
    }

    if (foundNickname) {
      return NextResponse.json({
        success: true,
        uid: cleanUid,
        nickname: foundNickname,
        region: foundRegion,
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Player ID not found or Garena server rate-limited.',
    }, { status: 404 });

  } catch (error: any) {
    console.error('[API /api/get-player-name/:uid]', error);
    return NextResponse.json({ success: false, message: 'Server error fetching player name.' }, { status: 500 });
  }
}
