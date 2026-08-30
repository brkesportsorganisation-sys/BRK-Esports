import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { getWhatsAppSettings, saveWhatsAppSettings } from '@/lib/whatsapp';
import { isMongoConfigured, getWhatsAppDb } from '@/lib/mongodb';

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
    let mongoOk = isMongoConfigured();
    if (mongoOk) {
      const db = await getWhatsAppDb();
      mongoOk = Boolean(db);
    }

    return NextResponse.json({
      success: true,
      isMongoConnected: mongoOk,
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

    const saved = await saveWhatsAppSettings({
      greenApiUrl: greenApiUrl?.trim(),
      greenApiInstanceId: greenApiInstanceId?.trim(),
      greenApiToken: greenApiToken?.trim(),
      waapiApiKey: waapiApiKey?.trim(),
      waapiInstanceId: waapiInstanceId?.trim(),
      zavuApiKey: zavuApiKey?.trim(),
      provider,
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
      defaultTemplate: defaultTemplate?.trim(),
    });

    if (!saved) {
      return NextResponse.json({ success: false, message: 'Failed to save settings to database' }, { status: 500 });
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
