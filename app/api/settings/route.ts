import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { serverCache, CACHE_TTL } from '@/lib/server-cache';

export const revalidate = 300;

const EXCLUDED_HEAVY_KEYS = [
  'EZBD_ESPORTS_SQUADS',
  'BRK_ESPORTS_SQUADS',
  'SQUADS',
  'WHATSAPP_MESSAGE_LOGS',
  'WHATSAPP_AUTOMATION_SCHEDULES',
  'WHATSAPP_TARGET_GROUPS',
  'WHATSAPP_FORWARDER_CONFIG',
  'PUSH_SUBSCRIPTIONS',
  'ARENA_DUELS',
  'CHAMPIONS',
  'SHOP_ORDERS',
  // Private API secrets that should never be sent to public client
  'RESEND_API_KEY',
  'WAAPI_API_KEY',
  'ZAVU_API_KEY',
  'GREEN_API_TOKEN',
  'SMTP_PASS',
  'SMTP_USER',
  'WHATSAPP_BOT_SECRET',
];

export async function GET() {
  // 1. Check in-memory server cache first
  const cached = serverCache.get<Record<string, string>>('site_settings_map');
  if (cached) {
    return NextResponse.json(
      { settings: cached },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  }

  try {
    const { data: settings, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('key, value')
      .not('key', 'in', `(${EXCLUDED_HEAVY_KEYS.join(',')})`);

    if (error) {
      console.warn('[GET /api/settings] Supabase warning:', error.message);
      return NextResponse.json({ settings: {} });
    }


    const settingsMap = (settings || []).reduce((acc: Record<string, string>, setting: any) => {
      const k = setting.key || '';
      // Safeguard against any heavy or private keys that might slip past the SQL 'in' filter
      if (
        !k ||
        EXCLUDED_HEAVY_KEYS.includes(k) ||
        k.startsWith('push_subscription_') ||
        k.startsWith('TOURNAMENT_ROADMAP_') ||
        k.startsWith('WHATSAPP_MESSAGE_')
      ) {
        return acc;
      }
      acc[k] = setting.value;
      return acc;
    }, {});

    // Save in server cache for CACHE_TTL.SITE_SETTINGS (5 minutes)
    serverCache.set('site_settings_map', settingsMap, CACHE_TTL.SITE_SETTINGS);

    return NextResponse.json(
      { settings: settingsMap },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ settings: {} });
  }
}

