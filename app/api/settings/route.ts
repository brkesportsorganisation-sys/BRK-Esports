import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 60;

const EXCLUDED_HEAVY_KEYS = [
  'WHATSAPP_MESSAGE_LOGS',
  'WHATSAPP_AUTOMATION_SCHEDULES',
  'WHATSAPP_TARGET_GROUPS',
  'WHATSAPP_FORWARDER_CONFIG',
  'PUSH_SUBSCRIPTIONS',
  'ARENA_DUELS',
  'SQUADS',
  'CHAMPIONS',
  'SHOP_ORDERS',
];

export async function GET() {
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
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json(
      { settings: settingsMap },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ settings: {} });
  }
}
