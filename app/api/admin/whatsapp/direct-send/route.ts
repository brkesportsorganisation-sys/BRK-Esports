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

    // Auto-detect Sender ID (must be passed inside params, not options.headers)
    let senderId: string | undefined;
    try {
      for await (const s of client.senders.list()) {
        if ((s as any).isDefault || !senderId) {
          senderId = (s as any).id;
        }
      }
    } catch (e: any) {
      console.warn('[direct-send sender detection]', e?.message);
    }

    // Send direct message — 'Zavu-Sender' goes inside the params object (1st arg)
    const result = await client.messages.send({
      channel: 'whatsapp',
      to: formattedPhone,
      text: message.trim(),
      ...(senderId ? { 'Zavu-Sender': senderId } : {}),
    });

    // Record log
    await addWhatsAppLog({
      targetDestination: formattedPhone,
      targetName: recipientName || 'Direct Player',
      messageText: message.trim(),
      triggerType: templateType === 'ROOM_ID' ? 'ROOM_ALERT' : 'INSTANT_BROADCAST',
      status: 'SENT',
      responseId: String((result as any)?.message?.id || (result as any)?.id || ''),
    });

    return NextResponse.json({
      success: true,
      message: `WhatsApp message dispatched to ${recipientName || formattedPhone} (${formattedPhone})!`,
      result,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/whatsapp/direct-send]', err);
    let errMsg = err?.message || 'Failed to send WhatsApp message via API.';
    if (errMsg.includes('24 hours') || errMsg.includes('Re-engagement') || errMsg.includes('outside the allowed window') || errMsg.includes('session')) {
      errMsg = 'Meta WhatsApp Policy: এই নম্বরে message পাঠাতে হলে প্লেয়ারকে আগে আপনার নম্বরে (+8801866408811) একটি মেসেজ দিয়ে 24 ঘণ্টার উইন্ডো খুলতে হবে। অথবা Zavu Dashboard থেকে Approved WhatsApp Template ব্যবহার করুন।';
    }
    return NextResponse.json({
      success: false,
      message: errMsg,
    }, { status: 500 });
  }
}
