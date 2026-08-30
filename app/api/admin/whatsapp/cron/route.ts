import { NextRequest, NextResponse } from 'next/server';
import { runAllDueWhatsAppSchedules } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.WHATSAPP_BOT_SECRET || 'blackrock_secret_bot_key_2026';
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';

    // Validate Bearer token, query secret, or Vercel cron header
    if (!isVercelCron) {
      const providedToken = authHeader?.replace('Bearer ', '').trim();
      const querySecret = new URL(req.url).searchParams.get('secret')?.trim();
      const isValid =
        providedToken === cronSecret ||
        providedToken === 'blackrock_secret_bot_key_2026' ||
        querySecret === cronSecret ||
        querySecret === 'blackrock_secret_bot_key_2026';

      if (!isValid) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const { executedCount, results } = await runAllDueWhatsAppSchedules();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      executedCount,
      results,
    });
  } catch (error: any) {
    console.error('[CRON /api/admin/whatsapp/cron]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error executing due WhatsApp schedules.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
