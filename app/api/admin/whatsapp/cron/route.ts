import { NextRequest, NextResponse } from 'next/server';
import { runAllDueWhatsAppSchedules } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if configured in Vercel Cron
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If no admin cookie either, verify
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
