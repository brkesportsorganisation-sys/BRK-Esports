import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: settings, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('*');

    if (error) {
      throw new Error(error.message);
    }
    
    // Convert array to object { key: value }
    const settingsMap = (settings || []).reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    console.error('[GET /api/admin/settings]', error);
    return NextResponse.json({ message: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Support batch update { settings: { key1: val1, key2: val2, ... } }
    if (body.settings && typeof body.settings === 'object') {
      const entries = Object.entries(body.settings);
      const upserts = entries.map(([key, value]) => ({
        id: `setting_${key}`,
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        updatedAt: new Date().toISOString(),
      }));

      const { error } = await supabaseAdmin
        .from('SiteSetting')
        .upsert(upserts, { onConflict: 'key' });

      if (error) throw new Error(error.message);

      return NextResponse.json({ message: 'Settings batch updated successfully' });
    }

    const { key, value } = body;
    if (!key) {
      return NextResponse.json({ message: 'Key is required' }, { status: 400 });
    }

    const { data: setting, error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: `setting_${key}`,
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        updatedAt: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ message: 'Setting updated successfully', setting });
  } catch (error: any) {
    console.error('[POST /api/admin/settings]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update setting' }, { status: 500 });
  }
}
