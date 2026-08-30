import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { getWhatsAppSettings } from '@/lib/whatsapp';
import QRCode from 'qrcode';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

/**
 * GET /api/admin/whatsapp/qr
 * Fetches real-time QR code and authorization status from active WhatsApp gateway.
 */
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await getWhatsAppSettings();
    const provider = settings.provider || 'NODE_BOT';
    const nodeBotUrl = settings.nodeBotUrl || process.env.WHATSAPP_BOT_URL || '';
    const nodeBotSecret = settings.nodeBotSecret || process.env.WHATSAPP_BOT_SECRET || '';

    // 1. Node Bot QR Check
    if (provider === 'NODE_BOT' && nodeBotUrl && nodeBotSecret) {
      const host = nodeBotUrl.replace(/\/+$/, '');
      const res = await fetch(`${host}/api/qr`, {
        headers: { 'x-api-secret': nodeBotSecret },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (!res) {
        return NextResponse.json({
          success: false,
          status: 'OFFLINE',
          provider: 'NODE_BOT',
          message: 'Node Bot (Render) is unreachable. It may be sleeping — wait 30s and refresh.',
        });
      }

      const qrData = res.ok ? await res.json().catch(() => ({})) : {};

      if (qrData?.status === 'CONNECTED') {
        const rawUserId = qrData?.user?.id || '';
        const phoneDigits = rawUserId.split(':')[0]?.split('@')[0] || '';
        const displayPhone = phoneDigits ? `+${phoneDigits}` : '+880 WhatsApp Bot';
        const userName = qrData?.user?.name ? ` (${qrData.user.name})` : '';

        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          provider: 'NODE_BOT',
          stateInstance: 'authorized',
          phoneNumber: `${displayPhone}${userName}`,
          groupsCount: qrData?.groupsCount || 0,
          message: 'WhatsApp Web is authorized and active!',
        });
      }

      if (qrData?.status === 'WAITING_FOR_SCAN' && qrData?.qr) {
        const qrImage = await QRCode.toDataURL(qrData.qr, { width: 320, margin: 2 });
        return NextResponse.json({
          success: true,
          status: 'WAITING_FOR_SCAN',
          provider: 'NODE_BOT',
          stateInstance: 'waiting',
          qrCodeImage: qrImage,
          rawQr: qrData.qr,
          message: 'Scan the QR code with WhatsApp on your phone.',
        });
      }

      return NextResponse.json({
        success: true,
        status: qrData?.status || 'INITIALIZING',
        provider: 'NODE_BOT',
        stateInstance: 'initializing',
        message: qrData?.message || 'Generating new WhatsApp QR code...',
      });
    }

    return NextResponse.json({
      success: true,
      status: 'CONNECTED',
      provider,
      message: 'Active gateway provider is ready.',
    });
  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/qr]', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to fetch QR status' }, { status: 500 });
  }
}

/**
 * POST /api/admin/whatsapp/qr
 * Controls QR session actions: REBOOT (reconnect), LOGOUT (clear session).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const settings = await getWhatsAppSettings();
    const nodeBotUrl = settings.nodeBotUrl || process.env.WHATSAPP_BOT_URL || '';
    const nodeBotSecret = settings.nodeBotSecret || process.env.WHATSAPP_BOT_SECRET || '';

    if (settings.provider !== 'NODE_BOT' || !nodeBotUrl) {
      return NextResponse.json({
        message: 'QR control actions are only available in NODE_BOT mode.',
      }, { status: 400 });
    }

    if (action === 'REBOOT') {
      // Hit the health endpoint to wake the bot (Render free tier wake-up)
      const host = nodeBotUrl.replace(/\/+$/, '');
      const wakeRes = await fetch(`${host}/`, {
        signal: AbortSignal.timeout(30000),
      }).catch(() => null);

      const isAlive = wakeRes?.ok;

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'WHATSAPP_BOT_REBOOT',
        'WHATSAPP',
        `Attempted to wake/reboot Node Bot. Response: ${isAlive ? 'alive' : 'no response'}`
      );

      return NextResponse.json({
        success: isAlive,
        message: isAlive
          ? '✅ Node Bot is awake! Refresh the QR status in a few seconds.'
          : '⚠️ Bot did not respond within 30s. It may be restarting. Try again in 1 minute.',
      });
    }

    if (action === 'LOGOUT') {
      const host = nodeBotUrl.replace(/\/+$/, '');
      const logoutRes = await fetch(`${host}/api/logout`, {
        method: 'POST',
        headers: { 'x-api-secret': nodeBotSecret },
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      const logoutData = logoutRes?.ok ? await logoutRes.json().catch(() => ({})) : {};

      await logAdminAction(
        session?.sub || session?.email || 'admin',
        'WHATSAPP_BOT_LOGOUT',
        'WHATSAPP',
        'Admin disconnected WhatsApp session to generate a fresh QR code'
      );

      return NextResponse.json({
        success: true,
        message: logoutData.message || 'WhatsApp session cleared. Fresh QR code is generating...',
      });
    }

    return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/qr]', error);
    return NextResponse.json({ success: false, message: error?.message || 'QR action failed' }, { status: 500 });
  }
}
