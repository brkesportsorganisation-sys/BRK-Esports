import { NextRequest, NextResponse } from 'next/server';
import { listTournamentsFromDb } from '@/lib/tournament-store';

export async function GET() {
  try {
    const tournaments = await listTournamentsFromDb();
    return NextResponse.json(
      { tournaments },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to load tournaments' }, { status: 500 });
  }
}
