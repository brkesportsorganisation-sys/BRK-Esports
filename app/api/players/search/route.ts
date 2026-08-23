import { NextRequest, NextResponse } from 'next/server';
import { searchPlayers } from '@/lib/squads';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const currentUserId = searchParams.get('currentUserId') || undefined;

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ players: [] });
    }

    const players = await searchPlayers(q, currentUserId);
    return NextResponse.json({ players });
  } catch (error: any) {
    console.error('[GET /api/players/search]', error);
    return NextResponse.json({ message: error?.message || 'Error searching players.' }, { status: 500 });
  }
}
