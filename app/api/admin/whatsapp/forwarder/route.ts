import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { getWhatsAppForwarderConfig, saveWhatsAppForwarderConfig, getWhatsAppTargetGroups } from '@/lib/whatsapp';
import { WhatsAppForwarderConfig } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// GET forwarder config and target groups
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    let config = await getWhatsAppForwarderConfig();
    const groups = await getWhatsAppTargetGroups();

    // Default ensure user's official channel is in savedChannels
    if (!config.savedChannels || config.savedChannels.length === 0 || !config.savedChannels.some(c => c.channelId.includes('0029VbCsgXcGZNCQjSjMOZ0I'))) {
      const defaultChan = {
        id: 'chan_official_ezbd',
        name: 'ESPORTS ZONE BD Official Channel',
        channelId: 'https://whatsapp.com/channel/0029VbCsgXcGZNCQjSjMOZ0I',
        description: 'Official verified tournament notices & announcements channel',
        isDefault: true,
      };
      const updatedSaved = [defaultChan, ...(config.savedChannels || [])];
      config = {
        ...config,
        savedChannels: updatedSaved,
        sourceChannelName: config.sourceChannelName || defaultChan.name,
        sourceChannelId: config.sourceChannelId || defaultChan.channelId,
      };
      await saveWhatsAppForwarderConfig(config);
    }

    return NextResponse.json({
      success: true,
      config,
      groups,
      totalGroups: groups.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/forwarder]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to get forwarder configuration' },
      { status: 500 }
    );
  }
}

// POST save/update forwarder config, resolve channel, or manual forward
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, config, channelUrl, message, targetGroupIds, channelName } = body;

    // Action 1: Resolve Channel Link to Real JID & Title
    if (action === 'RESOLVE_CHANNEL' && channelUrl) {
      const settings = await (await import('@/lib/whatsapp')).getWhatsAppSettings();
      const nodeBotUrl = settings.nodeBotUrl || 'https://ezbd.onrender.com';
      const host = nodeBotUrl.replace(/\/+$/, '');

      try {
        const res = await fetch(`${host}/api/resolve-channel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': settings.nodeBotSecret,
          },
          body: JSON.stringify({ url: channelUrl }),
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const d = await res.json();
          return NextResponse.json({ success: true, channel: d.channel });
        }
      } catch (err: any) {
        console.warn('Resolve channel error:', err.message);
      }

      // Fallback
      let code = channelUrl.trim();
      if (code.includes('whatsapp.com/channel/')) {
        code = code.split('whatsapp.com/channel/')[1]?.split(/[\?\/]/)[0]?.trim();
      }
      return NextResponse.json({
        success: true,
        channel: { id: `${code}@newsletter`, name: 'Official WhatsApp Channel' },
      });
    }

    // Action 2: Manual Forward Channel Post to All Groups
    if (action === 'MANUAL_FORWARD' && message) {
      const settings = await (await import('@/lib/whatsapp')).getWhatsAppSettings();
      const nodeBotUrl = settings.nodeBotUrl || 'https://ezbd.onrender.com';
      const host = nodeBotUrl.replace(/\/+$/, '');

      const res = await fetch(`${host}/api/forward-channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': settings.nodeBotSecret,
        },
        body: JSON.stringify({
          message,
          channelName: channelName || 'ESPORTS ZONE BD Official Channel',
          targetGroupIds: Array.isArray(targetGroupIds) && targetGroupIds.length > 0 ? targetGroupIds : undefined,
        }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return NextResponse.json({
          success: true,
          message: data.message || 'Channel update forwarded to all target groups!',
        });
      } else {
        return NextResponse.json(
          { success: false, message: data.error || 'Failed to forward message.' },
          { status: 400 }
        );
      }
    }

    // Action 3: Save Configuration
    if (!config) {
      return NextResponse.json({ message: 'Configuration payload is required' }, { status: 400 });
    }

    const currentConfig = await getWhatsAppForwarderConfig();
    const mergedConfig: WhatsAppForwarderConfig = {
      ...currentConfig,
      ...config,
      enabled: config.enabled !== undefined ? Boolean(config.enabled) : currentConfig.enabled,
      sourceChannelId: (config.sourceChannelId ?? currentConfig.sourceChannelId ?? '').trim(),
      sourceChannelName: (config.sourceChannelName ?? currentConfig.sourceChannelName ?? 'WhatsApp Channel').trim(),
      targetGroupMode: config.targetGroupMode || currentConfig.targetGroupMode || 'ALL_GROUPS',
      targetGroupIds: Array.isArray(config.targetGroupIds) ? config.targetGroupIds : currentConfig.targetGroupIds,
      prefixHeader: config.prefixHeader !== undefined ? config.prefixHeader : currentConfig.prefixHeader,
      appendFooter: config.appendFooter !== undefined ? config.appendFooter : currentConfig.appendFooter,
      includeMedia: config.includeMedia !== undefined ? Boolean(config.includeMedia) : currentConfig.includeMedia,
      filterKeywords: Array.isArray(config.filterKeywords) ? config.filterKeywords : currentConfig.filterKeywords,
      ignoreKeywords: Array.isArray(config.ignoreKeywords) ? config.ignoreKeywords : currentConfig.ignoreKeywords,
      savedChannels: Array.isArray(config.savedChannels) ? config.savedChannels : currentConfig.savedChannels,
    };

    const saved = await saveWhatsAppForwarderConfig(mergedConfig);
    if (!saved) {
      return NextResponse.json({ success: false, message: 'Failed to save forwarder config to database' }, { status: 500 });
    }

    await logAdminAction(
      session?.sub || session?.email || 'admin',
      'UPDATE_WHATSAPP_FORWARDER',
      'WHATSAPP',
      `Updated Channel Forwarder settings: Enabled=${mergedConfig.enabled}, Mode=${mergedConfig.targetGroupMode}, Channel=${mergedConfig.sourceChannelName}`
    );

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Channel Forwarder settings saved successfully!',
      config: mergedConfig,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/forwarder]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error updating forwarder settings' },
      { status: 500 }
    );
  }
}
