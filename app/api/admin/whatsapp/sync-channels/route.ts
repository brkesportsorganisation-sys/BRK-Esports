import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { 
  fetchWaapiChats, 
  fetchGreenApiChats, 
  getWhatsAppSettings, 
  getWhatsAppForwarderConfig, 
  saveWhatsAppForwarderConfig 
} from '@/lib/whatsapp';
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
    const body = await req.json().catch(() => ({}));
    const settings = await getWhatsAppSettings();
    const activeProvider = body.provider || settings.provider;

    let res: any;
    if (activeProvider === 'GREEN_API' || activeProvider === 'DIRECT_QR') {
      res = await fetchGreenApiChats(
        body.apiUrl || settings.greenApiUrl,
        body.instanceId || settings.greenApiInstanceId,
        body.apiKey || settings.greenApiToken
      );
    } else if (activeProvider === 'WAAPI') {
      res = await fetchWaapiChats(
        body.instanceId || settings.waapiInstanceId,
        body.apiKey || settings.waapiApiKey
      );
    } else {
      res = await fetchGreenApiChats(
        body.apiUrl || settings.greenApiUrl,
        body.instanceId || settings.greenApiInstanceId,
        body.apiKey || settings.greenApiToken
      );
    }

    if (!res.success) {
      return NextResponse.json({
        success: false,
        message: res.message || 'Failed to sync channels from WhatsApp.',
      }, { status: 400 });
    }

    const fetchedChannels: WhatsAppSourceChannel[] = res.channels || [];
    const currentConfig = await getWhatsAppForwarderConfig();
    const existingChannels = currentConfig.savedChannels || [];
    const existingIds = new Set(existingChannels.map(c => c.channelId.toLowerCase()));

    let newlyAddedCount = 0;
    const merged: WhatsAppSourceChannel[] = [...existingChannels];

    for (const fc of fetchedChannels) {
      const cleanId = fc.channelId.toLowerCase();
      if (!existingIds.has(cleanId)) {
        existingIds.add(cleanId);
        merged.push(fc);
        newlyAddedCount++;
      } else {
        const idx = merged.findIndex(c => c.channelId.toLowerCase() === cleanId);
        if (idx !== -1) {
          merged[idx] = {
            ...merged[idx],
            name: fc.name || merged[idx].name,
          };
        }
      }
    }

    // If active channel wasn't set or was empty, auto-select the first synced channel
    let newSourceChannelId = currentConfig.sourceChannelId;
    let newSourceChannelName = currentConfig.sourceChannelName;
    if ((!newSourceChannelId || newSourceChannelId === '') && merged.length > 0) {
      newSourceChannelId = merged[0].channelId;
      newSourceChannelName = merged[0].name;
    }

    const updatedConfig = {
      ...currentConfig,
      savedChannels: merged,
      sourceChannelId: newSourceChannelId,
      sourceChannelName: newSourceChannelName,
    };

    await saveWhatsAppForwarderConfig(updatedConfig);

    return NextResponse.json({
      success: true,
      message: fetchedChannels.length > 0
        ? `Successfully synced ${fetchedChannels.length} followed channels (${newlyAddedCount} newly added)!`
        : `Connected to WhatsApp (${res.totalChats} chats found), but no followed @newsletter channels found.`,
      channels: merged,
      syncedCount: fetchedChannels.length,
      newlyAddedCount,
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/sync-channels]', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error syncing channels.',
    }, { status: 500 });
  }
}
