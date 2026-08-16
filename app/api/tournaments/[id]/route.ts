import { NextResponse } from 'next/server';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentByIdFromDb(id);
  if (!tournament) {
    return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  let userRegistrations: any[] = [];
  if (userId) {
    try {
      userRegistrations = await prisma.participant.findMany({
        where: { tournamentId: id, userId },
        orderBy: { joinedAt: 'desc' }
      });
    } catch (e) {
      console.error('Failed to fetch user registrations:', e);
    }
  }

  return NextResponse.json({ tournament, userRegistrations });
}

