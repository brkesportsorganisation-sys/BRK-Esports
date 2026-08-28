import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { forwardChannelMessageToGroups } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

/**
 * POST /api/admin/whatsapp/forwarder/relay
 * 
 * Manually relays/forwards a channel post or message to all target WhatsApp groups.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { message, imageUrl, sourceChannelName, forceTargetGroups } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ message: 'Message content is required to relay.' }, { status: 400 });
    }

    const relayResult = await forwardChannelMessageToGroups({
      message: message.trim(),
      imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : undefined,
      sourceChannelName: sourceChannelName || 'Admin Channel Relay',
      forceTargetGroups: Array.isArray(forceTargetGroups) ? forceTargetGroups : undefined,
    });

    await logAdminAction(
      session?.sub || session?.email || 'admin',
      'CHANNEL_MESSAGE_RELAY',
      'WHATSAPP',
      `Forwarded message to ${relayResult.deliveredCount}/${relayResult.totalTargetGroups} groups (${relayResult.failedCount} failed)`
    );

    return NextResponse.json({
      ...relayResult,
      message: relayResult.deliveredCount > 0
        ? `Message successfully forwarded to ${relayResult.deliveredCount} WhatsApp group(s)!${relayResult.failedCount > 0 ? ` (${relayResult.failedCount} failed)` : ''}`
        : 'Failed to deliver message to target groups.',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/forwarder/relay]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to relay message to groups.' },
      { status: 500 }
    );
  }
}
