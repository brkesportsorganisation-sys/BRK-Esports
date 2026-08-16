import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, hasPermission, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_watch_earn')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: setting, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ad_settings')
      .maybeSingle();

    if (error) {
      console.warn('[GET /api/admin/ads] Supabase warning:', error.message);
    }

    let adSettings = {
      isActive: true,
      ads: [
        { id: 'ad_default_1', videoId: 'dQw4w9WgXcQ', rewardAmount: 5, isActive: true }
      ]
    };

    if (setting?.value) {
      try {
        adSettings = JSON.parse(setting.value);
      } catch {}
    }

    return NextResponse.json({ adSettings });
  } catch (error: any) {
    console.error('[GET /api/admin/ads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to load ad settings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_watch_earn')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { adSettings } = body;

    if (!adSettings) {
      return NextResponse.json({ message: 'adSettings is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_ad_settings',
        key: 'ad_settings',
        value: JSON.stringify(adSettings),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw new Error(error.message);

    logAdminAction(
      session.username || session.email,
      'AD_SETTINGS_UPDATE',
      `Updated Watch & Earn video ads (${adSettings.ads?.length || 0} ads, Active: ${adSettings.isActive})`,
      'SiteSetting',
      'setting_ad_settings'
    );

    return NextResponse.json({ message: 'Ad settings saved successfully to database!' });
  } catch (error: any) {
    console.error('[POST /api/admin/ads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to save ad settings.' }, { status: 500 });
  }
}
