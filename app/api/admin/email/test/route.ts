import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { sendTestEmail } from '@/lib/email';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { toEmail, apiKey, fromEmail, subject, bodyTemplate } = body;

    if (!toEmail) {
      return NextResponse.json({ message: 'Recipient email is required.' }, { status: 400 });
    }

    const result = await sendTestEmail({
      toEmail,
      apiKey,
      fromEmail,
      subject,
      bodyTemplate,
    });

    if (result.success) {
      return NextResponse.json({ 
        message: `Test email sent successfully to ${toEmail}!`, 
        data: (result as any).data,
        provider: (result as any).provider 
      });
    } else {
      return NextResponse.json({ message: result.error || 'Failed to send test email.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[POST /api/admin/email/test]', error);
    return NextResponse.json({ message: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
