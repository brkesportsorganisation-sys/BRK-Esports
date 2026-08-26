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

    // 2. Fetch Row Counts for core tables in parallel
    const tables = [
      'User',
      'Tournament',
      'Match',
      'TournamentRegistration',
      'ShopOrder',
      'ShopProduct',
      'Transaction',
      'Message',
      'Announcement',
      'SiteSetting',
      'MatchParticipant',
      'LFGPost',
      'LFGComment'
    ];

    const promises = tables.map(async (tableName) => {
      const { count, error } = await supabaseAdmin
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.warn(`Failed to count ${tableName}:`, error.message);
        return { name: tableName, count: 0, error: true };
      }
      return { name: tableName, count: count || 0, error: false };
    });

    const results = await Promise.all(promises);

    // Filter out errors and aggregate
    const tableStats = results.filter(r => !r.error);
    const totalRows = tableStats.reduce((sum, t) => sum + t.count, 0);

    return NextResponse.json({
      success: true,
      metrics: {
        timestamp: new Date().toISOString(),
        totalRows,
        tables: tableStats
      }
    });
  } catch (error) {
    console.error('Database API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
