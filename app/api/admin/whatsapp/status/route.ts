import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getWhatsAppSettings } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await getWhatsAppSettings();

    // 1. Live WhatsApp Bot Status Check (for DIRECT_QR and NODE_BOT)
    const nodeBotUrl = settings.nodeBotUrl || process.env.WHATSAPP_BOT_URL || 'https://ezbd.onrender.com';
    if ((settings.provider === 'NODE_BOT' || settings.provider === 'DIRECT_QR') && nodeBotUrl) {
      try {
        const host = nodeBotUrl.replace(/\/+$/, '');

        const res = await fetch(`${host}/`, {
          signal: AbortSignal.timeout(6000),
        });
        const json = await res.json().catch(() => ({}));
        const isConnected = json.whatsappConnected === true;

        return NextResponse.json({
          connected: isConnected,
          provider: settings.provider,
          statusText: isConnected ? 'CONNECTED' : 'DISCONNECTED',
          groupsCount: json.groupsCached || 0,
          channelsCount: json.channelsCached || 0,
          account: {
            projectName: 'ESPORTS ZONE BD (WhatsApp Bot)',
            teamName: isConnected ? 'Live Connected' : 'Waiting for QR Scan',
            instanceId: 'bot_01',
          },
          senders: [
            {
              id: 'node_bot_01',
              name: 'WhatsApp Account',
              phoneNumber: isConnected ? 'Linked Device Active' : 'Disconnected',
              isDefault: true,
            },
          ],
          activeSender: {
            id: 'node_bot_01',
            name: 'WhatsApp Account',
            phoneNumber: isConnected ? 'Linked Device Active' : 'Disconnected',
          },
        });
      } catch (err: any) {
        console.warn('[WhatsApp Bot Status Check Error]', err?.message);
        return NextResponse.json({
          connected: false,
          provider: settings.provider,
          statusText: 'OFFLINE',
          error: 'Could not connect to WhatsApp Bot server. Is Render app starting up?',
        });
      }
    }

  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/status]', error);
    return NextResponse.json(
      { connected: false, message: error?.message || 'Failed to fetch WhatsApp status.' },
      { status: 500 }
    );
  }
}

