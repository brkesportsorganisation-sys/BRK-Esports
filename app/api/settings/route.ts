import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('key, value');

    if (error) {
      console.warn('[GET /api/settings] Supabase warning:', error.message);
      return NextResponse.json({ settings: {} });
    }

    const settingsMap = (settings || []).reduce((acc: Record<string, string>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ settings: {} });
  }
}
