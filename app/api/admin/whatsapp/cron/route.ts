import { NextRequest, NextResponse } from 'next/server';
import { runAllDueWhatsAppSchedules } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured, validate Bearer token
    if (cronSecret) {
      const providedToken = authHeader?.replace('Bearer ', '');
      // Also allow via query param: ?secret=xxx (for external cron services like cron-job.org)
      const querySecret = new URL(req.url).searchParams.get('secret');
      if (providedToken !== cronSecret && querySecret !== cronSecret) {
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
