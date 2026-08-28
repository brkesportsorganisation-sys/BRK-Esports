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
    const config = await getWhatsAppForwarderConfig();
    const groups = await getWhatsAppTargetGroups();

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

// POST save/update forwarder config
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { config } = body as { config: Partial<WhatsAppForwarderConfig> };

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
