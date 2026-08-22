import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { sendDirectWhatsappMessage, normalizePhoneNumber } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { phone, recipientName, message, templateType } = body;

    if (!phone || !message) {
      return NextResponse.json({ message: 'Phone number and message are required.' }, { status: 400 });
    }

    const formattedPhone = normalizePhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 5) {
      return NextResponse.json({ message: 'Invalid phone number format.' }, { status: 400 });
    }

    const res = await sendDirectWhatsappMessage({
      to: formattedPhone,
      text: message.trim(),
      targetName: recipientName || 'Direct Player',
      triggerType: templateType === 'ROOM_ID' ? 'ROOM_ALERT' : 'INSTANT_BROADCAST',
    });

    if (!res.success) {
      return NextResponse.json({
        success: false,
        message: res.message || 'Failed to send WhatsApp message.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp message dispatched to ${recipientName || formattedPhone} (${formattedPhone})!`,
      result: (res as any).response || (res as any).data,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/whatsapp/direct-send]', err);
    return NextResponse.json({
      success: false,
      message: err?.message || 'Failed to send WhatsApp message.',
    }, { status: 500 });
  }
}
