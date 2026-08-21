import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getZavuClient, normalizePhoneNumber, addWhatsAppLog } from '@/lib/whatsapp';

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
    if (!formattedPhone || formattedPhone.length < 10) {
      return NextResponse.json({ message: 'Invalid phone number format.' }, { status: 400 });
    }

    const { client, error } = await getZavuClient();
    if (!client) {
      return NextResponse.json({ message: error || 'Failed to initialize Zavu WhatsApp client.' }, { status: 500 });
    }

    // Auto-detect Sender ID
    let senderId: string | undefined;
    try {
      for await (const s of client.senders.list()) {
        if (s.isDefault || !senderId) {
          senderId = s.id;
        }
      }
    } catch (e: any) {
      console.warn('[direct-send sender detection]', e?.message);
    }

    const requestOptions = senderId ? { headers: { 'Zavu-Sender': senderId } } : undefined;

    // Send direct message
    const result = await client.messages.send({
      channel: 'whatsapp',
      to: formattedPhone,
      text: message.trim(),
    }, requestOptions);

    // Record log
    await addWhatsAppLog({
      targetDestination: formattedPhone,
      targetName: recipientName || 'Direct Player',
      messageText: message.trim(),
      triggerType: templateType === 'ROOM_ID' ? 'ROOM_ALERT' : 'INSTANT_BROADCAST',
      status: 'SENT',
      responseId: String((result as any)?.id || ''),
    });

    return NextResponse.json({
      success: true,
      message: `WhatsApp message delivered successfully to ${recipientName || formattedPhone} (${formattedPhone})!`,
      result,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/whatsapp/direct-send]', err);
    return NextResponse.json({
      success: false,
      message: err?.message || 'Failed to send WhatsApp message via API.',
    }, { status: 500 });
  }
}
