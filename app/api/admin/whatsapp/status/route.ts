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

    // 1. Node Bot Status Check
    if (settings.provider === 'NODE_BOT' && settings.nodeBotUrl) {
      try {
        const host = settings.nodeBotUrl.replace(/\/+$/, '');
        const res = await fetch(`${host}/`, {
          signal: AbortSignal.timeout(5000),
        });
        const json = await res.json().catch(() => ({}));
        const isConnected = json.whatsappConnected === true;

        return NextResponse.json({
          connected: isConnected,
          provider: 'NODE_BOT',
          statusText: isConnected ? 'CONNECTED' : 'DISCONNECTED',
          account: {
            projectName: 'ESPORTS ZONE BD (Node Bot)',
            teamName: 'WhatsApp Render Bot',
            instanceId: 'bot_01',
          },
          senders: [
            {
              id: 'node_bot_01',
              name: 'WhatsApp Bot',
              phoneNumber: 'Auto-Forwarder',
              isDefault: true,
            },
          ],
          activeSender: {
            id: 'node_bot_01',
            name: 'WhatsApp Bot',
            phoneNumber: 'Auto-Forwarder',
          },
        });
      } catch (err: any) {
        console.warn('[Node Bot Status Check Error]', err?.message);
        return NextResponse.json({
          connected: false,
          provider: 'NODE_BOT',
          statusText: 'OFFLINE',
          error: 'Could not connect to Node Bot API. Is Render app sleeping?',
        });
      }
    }

    // 2. Direct QR Mode (Default UI mode)
    return NextResponse.json({
      connected: true,
      provider: 'DIRECT_QR',
      statusText: 'MANUAL_MODE',
      account: {
        projectName: 'Direct QR (Manual)',
        teamName: 'Local Phone',
      },
      senders: [
        {
          id: 'direct_qr',
          name: 'Direct WhatsApp Web',
          phoneNumber: 'Your Phone',
          isDefault: true,
        },
      ],
      activeSender: {
        id: 'direct_qr',
        name: 'Direct WhatsApp Web',
        phoneNumber: 'Your Phone',
      },
    });

  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/status]', error);
    return NextResponse.json(
      { connected: false, message: error?.message || 'Failed to fetch WhatsApp status.' },
      { status: 500 }
    );
  }
}

