import { NextRequest, NextResponse } from 'next/server';
import { getChampionsConfig } from '@/lib/champions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getChampionsConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[GET /api/champions] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch champions data.' }, { status: 500 });
  }
}
