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

    const testMessage = `🤖 BlackRock Esports WhatsApp Test 🤖\n\n✅ Zavu API is successfully connected and operational!\n🕒 Timestamp: ${new Date().toLocaleString()}`;

    const response = await client.messages.send({
      channel: 'whatsapp',
      to: formattedPhone,
      text: testMessage,
    });

    return NextResponse.json({
      success: true,
      message: `Test WhatsApp message sent successfully to ${formattedPhone}!`,
      response,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/test]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to send test WhatsApp message.' },
      { status: 500 }
    );
  }
}
