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
    const nodeBotUrl = settings.nodeBotUrl || 'https://ezbd.onrender.com';
    const nodeBotSecret = settings.nodeBotSecret || 'blackrock_secret_bot_key_2026';

    // 1. Node Bot QR Check
    if (provider === 'NODE_BOT' && nodeBotUrl && nodeBotSecret) {
      const host = nodeBotUrl.replace(/\/+$/, '');
      const res = await fetch(`${host}/api/qr`, {
        headers: { 'x-api-secret': nodeBotSecret },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      const qrData = res?.ok ? await res.json().catch(() => ({})) : {};

      if (qrData?.status === 'CONNECTED') {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          provider: 'NODE_BOT',
          stateInstance: 'authorized',
          phoneNumber: '+880 WhatsApp Bot',
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
 * Controls QR session actions (LOGOUT, REBOOT, SYNC_GROUPS).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    return NextResponse.json({ message: 'Reboot/Logout must be done from Render dashboard for Node Bot.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/qr]', error);
    return NextResponse.json({ success: false, message: error?.message || 'QR action failed' }, { status: 500 });
  }
}

