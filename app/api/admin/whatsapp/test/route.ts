import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getWhatsAppSettings, getZavuClient, normalizePhoneNumber, getDefaultSenderId } from '@/lib/whatsapp';

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

  let formattedPhone = '';

  try {
    const body = await request.json();
    const { testPhone } = body;

    if (!testPhone) {
      return NextResponse.json({ message: 'Test recipient phone number is required.' }, { status: 400 });
    }

    formattedPhone = normalizePhoneNumber(testPhone);
    const settings = await getWhatsAppSettings();
    const provider = settings.provider || 'NODE_BOT';

    const testMessage = `🤖 BlackRock Esports WhatsApp Test 🤖\n\n✅ WhatsApp (${provider}) is successfully connected and operational!\n🕒 Timestamp: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n\n🎮 BRK ESPORTS - https://brkesports.com`;

    // ─── NODE_BOT Mode ────────────────────────────────────────────────────────
    if (provider === 'NODE_BOT') {
      if (!settings.nodeBotUrl || !settings.nodeBotSecret) {
        return NextResponse.json({
          message: '⚠️ Node Bot URL বা Secret configure করা হয়নি। WhatsApp Settings-এ গিয়ে Node Bot URL এবং Secret দিন।',
        }, { status: 400 });
      }

      const host = settings.nodeBotUrl.replace(/\/+$/, '');

      // Check if bot is connected first
      const healthRes = await fetch(`${host}/`, {
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (!healthRes || !healthRes.ok) {
        return NextResponse.json({
          message: '⚠️ Node Bot (Render) এর সাথে সংযোগ করা যাচ্ছে না। Render app sleeping থাকতে পারে — ৩০ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।',
        }, { status: 503 });
      }

      const health = await healthRes.json().catch(() => ({}));
      if (!health.whatsappConnected) {
        return NextResponse.json({
          message: '⚠️ Node Bot চলছে কিন্তু WhatsApp connect হয়নি। Admin panel থেকে QR Code scan করুন।',
        }, { status: 400 });
      }

      // Send test message via Node Bot
      const sendRes = await fetch(`${host}/api/send-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': settings.nodeBotSecret,
        },
        body: JSON.stringify({ to: formattedPhone, message: testMessage }),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (!sendRes || !sendRes.ok) {
        const errData = await sendRes?.json().catch(() => ({}));
        return NextResponse.json({
          message: errData?.error || `Node Bot দিয়ে message পাঠানো গেল না (${sendRes?.status || 'timeout'}).`,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `✅ Test WhatsApp message sent to ${formattedPhone} via Node Bot!`,
        provider: 'NODE_BOT',
      });
    }

    // ─── ZAVU Mode ────────────────────────────────────────────────────────────
    if (provider === 'ZAVU') {
      const { client, error } = await getZavuClient();

      if (!client) {
        return NextResponse.json({ message: error || 'Could not initialize Zavu client.' }, { status: 400 });
      }

      const senderId = await getDefaultSenderId(client);

      if (!senderId) {
        return NextResponse.json({
          success: false,
          message: '⚠️ আপনার Zavu অ্যাকাউন্টে কোনো WhatsApp Sender / Phone Number এখনও কানেক্ট করা হয়নি। অনুগ্রহ করে Zavu Dashboard (https://dashboard.zavu.dev) এ গিয়ে Senders → Add Sender এ ক্লিক করে আপনার WhatsApp নম্বরটি লিংক করুন।',
        }, { status: 400 });
      }

      const response = await client.messages.send({
        channel: 'whatsapp',
        to: formattedPhone,
        text: testMessage,
        'Zavu-Sender': senderId,
      } as any);

      return NextResponse.json({
        success: true,
        message: `Test WhatsApp message sent successfully to ${formattedPhone}! Status: ${(response as any)?.message?.status || 'queued'}`,
        provider: 'ZAVU',
        response,
      });
    }

    // ─── Other providers ──────────────────────────────────────────────────────
    return NextResponse.json({
      message: `Test message for provider "${provider}" is not supported yet. Please use NODE_BOT or ZAVU.`,
    }, { status: 400 });

  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/test]', error);
    const rawMsg = error?.message || '';
    let userMsg = rawMsg;

    if (rawMsg.includes('No default sender') || rawMsg.includes('Zavu-Sender')) {
      userMsg = '⚠️ আপনার Zavu অ্যাকাউন্টে কোনো WhatsApp Sender কানেক্ট করা হয়নি।';
    } else if (rawMsg.includes('24') || rawMsg.includes('Re-engagement') || rawMsg.includes('outside the allowed window')) {
      userMsg = `⚠️ Meta WhatsApp 24-ঘণ্টা নীতি: এই নম্বরে (${formattedPhone}) message পাঠাতে হলে recipient-কে আগে আপনার নম্বরে একটি message দিতে হবে।`;
    }

    return NextResponse.json({ message: userMsg }, { status: 400 });
  }
}
