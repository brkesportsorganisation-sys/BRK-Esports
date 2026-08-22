import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getWhatsAppSettings, getZavuClient } from '@/lib/whatsapp';

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

    // 1. WaAPI Status Check
    if (settings.provider === 'WAAPI' && settings.waapiApiKey) {
      const instId = settings.waapiInstanceId || '102791';
      try {
        const res = await fetch(`https://waapi.app/api/v1/instances/${instId}`, {
          headers: {
            'Authorization': `Bearer ${settings.waapiApiKey}`,
            'Accept': 'application/json',
          },
        });
        const json = await res.json().catch(() => ({}));

        if (res.ok) {
          const inst = json.instance || json.data || json;
          const statusStr = inst.status || 'ready';
          const isConnected = statusStr === 'ready' || statusStr === 'authenticated' || statusStr === 'CONNECTED';

          return NextResponse.json({
            connected: isConnected,
            provider: 'WAAPI',
            statusText: statusStr.toUpperCase(),
            account: {
              projectName: 'BRK ESPORTS ORG (WaAPI)',
              teamName: inst.name || 'Esports Manager',
              instanceId: instId,
            },
            senders: [
              {
                id: `waapi_${instId}`,
                name: inst.name || 'Esports Manager',
                phoneNumber: inst.owner || '+880 1846-587311',
                isDefault: true,
              },
            ],
            activeSender: {
              id: `waapi_${instId}`,
              name: inst.name || 'Esports Manager',
              phoneNumber: inst.owner || '+880 1846-587311',
            },
          });
        }
      } catch (err: any) {
        console.warn('[WaAPI Status Check Error]', err?.message);
      }
    }

    // 2. Zavu Status Check
    const { client, error } = await getZavuClient();
    if (!client) {
      return NextResponse.json({
        connected: false,
        provider: settings.provider,
        error: error || 'WhatsApp client could not be initialized.',
      });
    }

    // Fetch Account Info
    const me = await client.me.retrieve().catch(err => {
      console.warn('[Zavu Me]', err?.message);
      return null;
    });

    // Fetch Live Senders
    const senders: any[] = [];
    try {
      const seenPhoneNumberIds = new Set<string>();
      for await (const s of client.senders.list()) {
        const phoneNumId = (s as any).whatsapp?.phoneNumberId || s.id;
        if (phoneNumId && seenPhoneNumberIds.has(phoneNumId)) continue;
        if (phoneNumId) seenPhoneNumberIds.add(phoneNumId);

        const phoneNumber =
          (s as any).phoneNumber ||
          (s as any).whatsapp?.displayPhoneNumber ||
          '';

        senders.push({
          id: s.id,
          name: s.name,
          phoneNumber,
          isDefault: s.isDefault,
          channels: s.channels,
          whatsapp: (s as any).whatsapp || null,
          createdAt: s.createdAt,
        });
      }
    } catch (sErr: any) {
      console.warn('[Zavu Senders List]', sErr?.message);
    }

    // Fetch Balance
    let balanceData = null;
    try {
      const b = await client.balance.retrieve();
      balanceData = {
        balanceUsd: (b.balance / 100).toFixed(2),
        currency: b.currency || 'USD',
      };
    } catch {}

    return NextResponse.json({
      connected: true,
      provider: 'ZAVU',
      account: {
        projectName: me?.project?.name || 'BRK ESPORTS ORG',
        teamName: me?.team?.name || 'BRK ESPORTS ORG',
        isTestMode: me?.isTestMode || false,
      },
      balance: balanceData,
      senders,
      activeSender:
        senders.find(s => s.phoneNumber?.includes('880') || s.whatsapp?.displayPhoneNumber?.includes('880')) ||
        senders.find(s => s.isDefault) ||
        senders[0] ||
        null,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/status]', error);
    return NextResponse.json(
      { connected: false, message: error?.message || 'Failed to fetch WhatsApp status.' },
      { status: 500 }
    );
  }
}
