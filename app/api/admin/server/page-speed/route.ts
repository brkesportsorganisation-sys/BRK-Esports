import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // We will measure TTFB for a few key routes
    const routesToTest = [
      { name: 'Homepage (SSR)', path: '/' },
      { name: 'Tournaments API', path: '/api/tournaments' },
      { name: 'Shop API', path: '/api/shop' },
    ];

    const results = await Promise.all(
      routesToTest.map(async (route) => {
        const start = performance.now();
        try {
          const res = await fetch(`${baseUrl}${route.path}`, {
            headers: { 'Cache-Control': 'no-cache' }
          });
          const end = performance.now();
          return {
            name: route.name,
            path: route.path,
            status: res.status,
            latencyMs: Math.round(end - start),
            error: false
          };
        } catch (e) {
          const end = performance.now();
          return {
            name: route.name,
            path: route.path,
            status: 500,
            latencyMs: Math.round(end - start),
            error: true
          };
        }
      })
    );

    const averageLatency = Math.round(
      results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length
    );

    return NextResponse.json({
      success: true,
      metrics: {
        timestamp: new Date().toISOString(),
        averageLatencyMs: averageLatency,
        details: results
      }
    });
  } catch (error) {
    console.error('Page Speed API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
