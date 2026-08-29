import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getWhatsAppSettings } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// 1. GET WhatsApp Settings
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await getWhatsAppSettings();
    return NextResponse.json({
      success: true,
      settings: {
        provider: settings.provider,
        greenApiUrl: settings.greenApiUrl || 'https://7107.api.greenapi.com',
        greenApiInstanceId: settings.greenApiInstanceId || '710722716896',
        greenApiToken: settings.greenApiToken || 'ea0c3d51fd1249bca407bb087266747fb099a650643b4d399d',
        greenApiTokenFull: settings.greenApiToken || 'ea0c3d51fd1249bca407bb087266747fb099a650643b4d399d',
        waapiApiKey: settings.waapiApiKey || 'FTjbix0MFIKsJWCiyLGcttqX0y1Hft8hy1abEXmEb33b91dd',
        waapiApiKeyFull: settings.waapiApiKey || 'FTjbix0MFIKsJWCiyLGcttqX0y1Hft8hy1abEXmEb33b91dd',
        waapiInstanceId: settings.waapiInstanceId || '102791',
        zavuApiKey: settings.zavuApiKey || 'zv_live_057a6574405452d25b0141112a8cd4ec8b2401215f9aa27e',
        zavuApiKeyFull: settings.zavuApiKey || 'zv_live_057a6574405452d25b0141112a8cd4ec8b2401215f9aa27e',
        isEnabled: settings.isEnabled,
        defaultTemplate: settings.defaultTemplate,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

// 2. POST Save WhatsApp Settings
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      greenApiUrl, 
      greenApiInstanceId, 
      greenApiToken, 
      waapiApiKey, 
      waapiInstanceId, 
      zavuApiKey, 
      provider, 
      isEnabled, 
      defaultTemplate 
    } = body;

    const upserts = [];

    if (greenApiUrl !== undefined) {
      upserts.push({ id: 'setting_GREEN_API_URL', key: 'GREEN_API_URL', value: greenApiUrl.trim(), updatedAt: new Date().toISOString() });
    }
    if (greenApiInstanceId !== undefined) {
      upserts.push({ id: 'setting_GREEN_API_INSTANCE_ID', key: 'GREEN_API_INSTANCE_ID', value: greenApiInstanceId.trim(), updatedAt: new Date().toISOString() });
    }
    if (greenApiToken !== undefined) {
      upserts.push({ id: 'setting_GREEN_API_TOKEN', key: 'GREEN_API_TOKEN', value: greenApiToken.trim(), updatedAt: new Date().toISOString() });
    }
    if (waapiApiKey !== undefined) {
      upserts.push({ id: 'setting_WAAPI_API_KEY', key: 'WAAPI_API_KEY', value: waapiApiKey.trim(), updatedAt: new Date().toISOString() });
    }
    if (waapiInstanceId !== undefined) {
      upserts.push({ id: 'setting_WAAPI_INSTANCE_ID', key: 'WAAPI_INSTANCE_ID', value: waapiInstanceId.trim(), updatedAt: new Date().toISOString() });
    }
    if (zavuApiKey !== undefined) {
      upserts.push({ id: 'setting_ZAVU_API_KEY', key: 'ZAVU_API_KEY', value: zavuApiKey.trim(), updatedAt: new Date().toISOString() });
    }
    if (provider !== undefined) {
      upserts.push({ id: 'setting_WHATSAPP_PROVIDER', key: 'WHATSAPP_PROVIDER', value: provider, updatedAt: new Date().toISOString() });
    }
    if (isEnabled !== undefined) {
      upserts.push({ id: 'setting_WHATSAPP_ENABLED', key: 'WHATSAPP_ENABLED', value: String(isEnabled), updatedAt: new Date().toISOString() });
    }
    if (defaultTemplate !== undefined) {
      upserts.push({ id: 'setting_WHATSAPP_ROOM_TEMPLATE', key: 'WHATSAPP_ROOM_TEMPLATE', value: defaultTemplate.trim(), updatedAt: new Date().toISOString() });
    }

    if (upserts.length > 0) {
      const { error } = await supabaseAdmin
        .from('SiteSetting')
        .upsert(upserts, { onConflict: 'key' });

      if (error) throw error;
    }

    await logAdminAction(
      session?.email || 'admin',
      'ADMIN_WHATSAPP_SETTINGS_UPDATE',
      'WHATSAPP',
      'Updated WhatsApp Gateway and provider configurations'
    );

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Gateway settings saved successfully!',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/settings]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to save settings' }, { status: 500 });
  }
}
