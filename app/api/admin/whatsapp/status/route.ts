import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getZavuClient } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { client, error } = await getZavuClient();
    if (!client) {
      return NextResponse.json({
        connected: false,
        error: error || 'Zavu API client could not be initialized.',
      });
    }

    // 1. Fetch Account Info
    const me = await client.me.retrieve().catch(err => {
      console.warn('[Zavu Me]', err?.message);
      return null;
    });

    // 2. Fetch Live Senders
    const senders: any[] = [];
    try {
      for await (const s of client.senders.list()) {
        senders.push({
          id: s.id,
          name: s.name,
          phoneNumber: s.phoneNumber || s.whatsapp?.displayPhoneNumber || '',
          isDefault: s.isDefault,
          channels: s.channels,
          createdAt: s.createdAt,
        });
      }
    } catch (sErr: any) {
      console.warn('[Zavu Senders List]', sErr?.message);
    }

    // 3. Fetch Balance
    let balanceData = null;
    try {
      const b = await client.balance.retrieve();
      balanceData = {
        balanceUsd: (b.balance / 100).toFixed(2),
        currency: b.currency || 'USD',
      };
    } catch {}

    return NextResponse.json({
      connected: true,
      account: {
        projectName: me?.project?.name || 'BRK ESPORTS ORG',
        teamName: me?.team?.name || 'BRK ESPORTS ORG',
        isTestMode: me?.isTestMode || false,
      },
      balance: balanceData,
      senders,
      activeSender: senders.find(s => s.isDefault) || senders[0] || null,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/status]', error);
    return NextResponse.json(
      { connected: false, message: error?.message || 'Failed to fetch Zavu status.' },
      { status: 500 }
    );
  }
}
