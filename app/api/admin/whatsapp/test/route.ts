import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getZavuClient, normalizePhoneNumber } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { testPhone } = body;

    if (!testPhone) {
      return NextResponse.json({ message: 'Test recipient phone number is required.' }, { status: 400 });
    }

    const formattedPhone = normalizePhoneNumber(testPhone);
    const { client, error } = await getZavuClient();

    if (!client) {
      return NextResponse.json({ message: error || 'Could not initialize Zavu client.' }, { status: 400 });
    }

    // 1. Inspect and resolve active sender from Zavu account
    let senderId: string | undefined;
    try {
      const senders: any[] = [];
      for await (const s of client.senders.list()) {
        senders.push(s);
      }

      if (senders.length === 0) {
        return NextResponse.json({
          success: false,
          message: '⚠️ আপনার Zavu অ্যাকাউন্টে কোনো WhatsApp Sender / Phone Number এখনও কানেক্ট করা হয়নি। অনুগ্রহ করে Zavu Dashboard (https://dashboard.zavu.dev) এ গিয়ে Senders -> Add Sender এ ক্লিক করে আপনার WhatsApp নম্বরটি লিংক করুন।',
        }, { status: 400 });
      }

      const defaultSender = senders.find(s => s.isDefault) || senders[0];
      senderId = defaultSender?.id;
    } catch (err: any) {
      console.warn('[Zavu Sender Fetch]', err?.message);
    }

    const testMessage = `🤖 BlackRock Esports WhatsApp Test 🤖\n\n✅ Zavu API is successfully connected and operational!\n🕒 Timestamp: ${new Date().toLocaleString()}`;

    const requestOptions = senderId ? { headers: { 'Zavu-Sender': senderId } } : undefined;

    const response = await client.messages.send({
      channel: 'whatsapp',
      to: formattedPhone,
      text: testMessage,
      ...(senderId ? { 'Zavu-Sender': senderId } : {}),
    });

    return NextResponse.json({
      success: true,
      message: `Test WhatsApp message sent successfully to ${formattedPhone}!`,
      response,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/test]', error);
    const rawMsg = error?.message || '';
    let userMsg = rawMsg;

    if (rawMsg.includes('No default sender') || rawMsg.includes('Zavu-Sender')) {
      userMsg = '⚠️ আপনার Zavu অ্যাকাউন্টে কোনো WhatsApp Sender / নম্বর কানেক্ট করা হয়নি। অনুগ্রহ করে Zavu Dashboard (https://dashboard.zavu.dev) -> Senders-এ গিয়ে আপনার WhatsApp Number যুক্ত করুন।';
    }

    return NextResponse.json(
      { message: userMsg },
      { status: 400 }
    );
  }
}
