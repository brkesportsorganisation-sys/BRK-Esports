import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getWhatsAppSettings, getWhatsAppForwarderConfig, saveWhatsAppForwarderConfig } from '@/lib/whatsapp';
import { WhatsAppSourceChannel } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await getWhatsAppSettings();

    // Node Bot mode: fetch channels from Render backend
    if (settings.provider === 'NODE_BOT' && settings.nodeBotUrl && settings.nodeBotSecret) {
      const host = settings.nodeBotUrl.replace(/\/+$/, '');
      const res = await fetch(`${host}/api/get-channels`, {
        headers: { 'x-api-secret': settings.nodeBotSecret },
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (!res || !res.ok) {
        return NextResponse.json({
          success: false,
          message: res
            ? `Node Bot returned ${res.status}. Is the Render app running?`
            : 'Could not reach the Node Bot (Render). Is the server sleeping? Wait 30s and try again.',
          syncedChannels: [],
        }, { status: 503 });
      }

      const data = await res.json().catch(() => ({}));
      const rawChannels: Array<{ id: string; name: string; isSource?: boolean }> = data.channels || [];

      if (rawChannels.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No channels found on the Node Bot. Send a message in a followed channel to detect it, then sync again.',
          syncedChannels: [],
        });
      }

      // Map to WhatsAppSourceChannel format
      const mapped: WhatsAppSourceChannel[] = rawChannels.map((c) => ({
        id: `chan_${c.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: c.name || 'WhatsApp Channel',
        channelId: c.id,
        description: c.isSource ? 'Configured source channel' : 'Detected channel',
        isDefault: c.isSource === true,
      }));

      // Merge into forwarder config's savedChannels
      const forwarderConfig = await getWhatsAppForwarderConfig();
      const existingIds = new Set((forwarderConfig.savedChannels || []).map((c) => c.channelId));
      const toAdd = mapped.filter((c) => !existingIds.has(c.channelId));

      const updatedConfig = {
        ...forwarderConfig,
        savedChannels: [...(forwarderConfig.savedChannels || []), ...toAdd],
      };
      await saveWhatsAppForwarderConfig(updatedConfig);

      return NextResponse.json({
        success: true,
        message: `Synced ${toAdd.length} new channel(s) from Node Bot. Total: ${updatedConfig.savedChannels.length} channel(s).`,
        syncedChannels: mapped,
        totalChannels: updatedConfig.savedChannels.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Channel sync via API is only available in NODE_BOT mode. Current provider: ${settings.provider}. Please add channels manually.`,
      syncedChannels: [],
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/sync-channels]', error);
    return NextResponse.json({ message: 'Failed to sync channels', error: error?.message }, { status: 500 });
  }
}
