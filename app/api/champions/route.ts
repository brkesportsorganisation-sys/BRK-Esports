import { NextRequest, NextResponse } from 'next/server';
import { getChampionsConfig } from '@/lib/champions';

export const revalidate = 60;

export async function GET() {
  try {
    const config = await getChampionsConfig();
    return NextResponse.json(
      { success: true, config },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/champions] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch champions data.' }, { status: 500 });
  }
}
