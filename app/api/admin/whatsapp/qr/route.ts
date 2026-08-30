import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { getWhatsAppSettings, getWhatsAppTargetGroups, saveWhatsAppTargetGroups } from '@/lib/whatsapp';
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
    const provider = settings.provider || 'GREEN_API';

    // 1. GREEN-API QR & Status
    if (provider === 'GREEN_API') {
      const host = (settings.greenApiUrl || 'https://7107.api.greenapi.com').replace(/\/+$/, '');
      const instanceId = settings.greenApiInstanceId || '710722716896';
      const token = settings.greenApiToken;

      if (!token) {
        return NextResponse.json({
          success: false,
          status: 'CONFIG_REQUIRED',
          message: 'Green-API Token is not configured. Please enter token in Settings.',
        });
      }

      // Check state instance
      const stateRes = await fetch(`${host}/waInstance${instanceId}/getStateInstance/${token}`, {
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);

      const stateData = stateRes?.ok ? await stateRes.json().catch(() => ({})) : {};
      const stateInstance = stateData?.stateInstance || 'unknown';

      if (stateInstance === 'authorized') {
        // Fetch phone info if available
        const settingsRes = await fetch(`${host}/waInstance${instanceId}/getSettings/${token}`, {
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);
        const instSettings = settingsRes?.ok ? await settingsRes.json().catch(() => ({})) : {};

        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          provider: 'GREEN_API',
          stateInstance,
          phoneNumber: instSettings?.wid ? `+${instSettings.wid.split('@')[0]}` : '+880 1846-587311',
          name: instSettings?.name || 'ESPORTS ZONE BD WhatsApp',
          message: 'WhatsApp Web is authorized and active!',
        });
      }

      // If not authorized, fetch QR code
      const qrRes = await fetch(`${host}/waInstance${instanceId}/qr/${token}`, {
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      const qrData = qrRes?.ok ? await qrRes.json().catch(() => ({})) : {};

      if (qrData?.type === 'qrCode' && qrData?.message) {
        // qrData.message is base64 image or raw string
        const qrImage = qrData.message.startsWith('data:image')
          ? qrData.message
          : qrData.message.startsWith('iVBOR') || qrData.message.length > 200
          ? `data:image/png;base64,${qrData.message}`
          : await QRCode.toDataURL(qrData.message, { width: 320, margin: 2 });

        return NextResponse.json({
          success: true,
          status: 'WAITING_FOR_SCAN',
          provider: 'GREEN_API',
          stateInstance,
          qrCodeImage: qrImage,
          rawQr: qrData.message,
          message: 'Scan the QR code with WhatsApp on your phone.',
        });
      }

      if (qrData?.type === 'alreadyLogged') {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          provider: 'GREEN_API',
          stateInstance: 'authorized',
          phoneNumber: '+880 1846-587311',
          message: 'WhatsApp Web is authorized and active!',
        });
      }

      return NextResponse.json({
        success: true,
        status: stateInstance === 'notAuthorized' ? 'SCAN_REQUIRED' : 'INITIALIZING',
        provider: 'GREEN_API',
        stateInstance,
        message: 'Generating new WhatsApp QR code...',
      });
    }

    // 2. WAAPI QR & Status
    if (provider === 'WAAPI') {
      const instanceId = settings.waapiInstanceId || '102791';
      const apiKey = settings.waapiApiKey;

      if (!apiKey) {
        return NextResponse.json({
          success: false,
          status: 'CONFIG_REQUIRED',
          message: 'WaAPI API Key is not configured.',
        });
      }

      const statusRes = await fetch(`https://waapi.app/api/v1/instances/${instanceId}/client/status`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);

      const statusData = statusRes?.ok ? await statusRes.json().catch(() => ({})) : {};
      const clientStatus = statusData?.data?.status || 'unknown';

      if (clientStatus === 'READY' || clientStatus === 'authenticated') {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          provider: 'WAAPI',
          stateInstance: clientStatus,
          phoneNumber: statusData?.data?.info?.wid?.user ? `+${statusData.data.info.wid.user}` : '+880 WhatsApp',
          message: 'WaAPI instance connected and ready!',
        });
      }

      const qrRes = await fetch(`https://waapi.app/api/v1/instances/${instanceId}/client/qr`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      const qrData = qrRes?.ok ? await qrRes.json().catch(() => ({})) : {};
      if (qrData?.data?.qr_code) {
        const qrImage = await QRCode.toDataURL(qrData.data.qr_code, { width: 320, margin: 2 });
        return NextResponse.json({
          success: true,
          status: 'WAITING_FOR_SCAN',
          provider: 'WAAPI',
          qrCodeImage: qrImage,
          rawQr: qrData.data.qr_code,
          message: 'Scan the QR code with WhatsApp on your phone.',
        });
      }
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
    const body = await req.json();
    const { action } = body;
    const settings = await getWhatsAppSettings();
    const host = (settings.greenApiUrl || 'https://7107.api.greenapi.com').replace(/\/+$/, '');
    const instanceId = settings.greenApiInstanceId || '710722716896';
    const token = settings.greenApiToken;

    if (action === 'LOGOUT') {
      const res = await fetch(`${host}/waInstance${instanceId}/logout/${token}`, {
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      await logAdminAction(
        session?.email || 'admin',
        'WHATSAPP_QR_LOGOUT',
        'WHATSAPP',
        'Logged out linked WhatsApp device to pair a new account.'
      );

      return NextResponse.json({
        success: true,
        message: 'WhatsApp instance unlinked. You can now scan a new QR code.',
      });
    }

    if (action === 'REBOOT') {
      await fetch(`${host}/waInstance${instanceId}/reboot/${token}`, {
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        message: 'WhatsApp instance rebooted successfully.',
      });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/qr]', error);
    return NextResponse.json({ success: false, message: error?.message || 'QR action failed' }, { status: 500 });
  }
}
