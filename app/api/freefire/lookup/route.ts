import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid')?.trim();

    if (!uid || uid.length < 6) {
      return NextResponse.json({ success: false, message: 'Valid Free Fire UID is required.' }, { status: 400 });
    }

    let foundNickname: string | null = null;
    let playerRegion: string | null = null;

    // 1. Official Garena TopUp Gateway API (shop.garena.sg / shop.garena.my / shop2game)
    const garenaEndpoints = [
      'https://shop.garena.sg/api/auth/player_id_login',
      'https://shop.garena.my/api/auth/player_id_login',
      'https://kreditgarena.id/api/auth/player_id_login',
    ];

    for (const endpoint of garenaEndpoints) {
      if (foundNickname) break;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://shop.garena.sg',
            'Referer': 'https://shop.garena.sg/app/100067/id/buy',
          },
          body: JSON.stringify({
            app_id: 100067,
            login_id: uid,
            app_server_id: 0,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.nickname && typeof data.nickname === 'string' && data.nickname.trim().length > 0) {
            foundNickname = data.nickname.trim();
            playerRegion = data.region || 'BD';
            break;
          }
        }
      } catch (err) {
        // Try next endpoint
      }
    }

    // 2. Direct Public Free Fire Player Lookup Gateways
    if (!foundNickname) {
      const publicApis = [
        `https://free-fire-api.vercel.app/api/player/${uid}`,
        `https://ff-api-gamma.vercel.app/api/player?uid=${uid}`,
        `https://api-player-info-ff.vercel.app/api/player?uid=${uid}`,
        `https://api.zoneff.com/api/player?uid=${uid}`,
      ];

      for (const api of publicApis) {
        if (foundNickname) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(api, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const nick = data.nickname || data.name || data.ign || data.AccountName || data.player_name || data.PlayerName;
            if (nick && typeof nick === 'string' && nick.trim().length > 0) {
              foundNickname = nick.trim();
              playerRegion = data.region || data.AccountRegion || 'BD';
              break;
            }
          }
        } catch {
          // Try next
        }
      }
    }

    // If live lookup succeeds from Garena / Free Fire Server
    if (foundNickname) {
      return NextResponse.json({
        success: true,
        uid,
        nickname: foundNickname,
        region: playerRegion || 'BD',
        isLive: true,
      });
    }

    // If external Garena gateway is temporarily unreachable / rate-limited
    return NextResponse.json({
      success: false,
      uid,
      message: 'Could not auto-fetch in-game name from Garena server. Please type your In-Game Name manually.',
      isLive: false,
    });
  } catch (error: any) {
    console.warn('[Free Fire UID Lookup Error]', error);
    return NextResponse.json({ success: false, message: 'Free Fire server lookup failed.' }, { status: 500 });
  }
}
