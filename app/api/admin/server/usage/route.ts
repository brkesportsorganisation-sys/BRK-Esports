import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import os from 'os';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. Verify Authentication (Service Role or valid admin session)
    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessionData } = await supabaseAdmin
      .from('AdminSession')
      .select('userId')
      .eq('id', sessionId)
      .single();

    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Collect Real OS Metrics
    const cpus = os.cpus();
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        release: os.release(),
        uptime: os.uptime(),
        hostname: os.hostname(),
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAvg: os.loadavg(), // [1, 5, 15] minute load averages
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      process: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(), // heapTotal, heapUsed, rss
      }
    };

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Server Usage API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
