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
        provider: settings.provider || 'NODE_BOT',
        nodeBotUrl: settings.nodeBotUrl || 'https://your-render-app.onrender.com',
        nodeBotSecret: settings.nodeBotSecret || 'super_secret_key_here',
        isEnabled: settings.isEnabled ?? true,
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
      nodeBotUrl, 
      nodeBotSecret, 
      provider, 
      isEnabled, 
      defaultTemplate 
    } = body;

    const saved = await saveWhatsAppSettings({
      nodeBotUrl: nodeBotUrl?.trim(),
      nodeBotSecret: nodeBotSecret?.trim(),
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

