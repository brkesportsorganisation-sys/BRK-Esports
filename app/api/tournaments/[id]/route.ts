import { NextResponse } from 'next/server';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let tournament = await getTournamentByIdFromDb(id);
  if (!tournament) {
    tournament = db.getTournamentById(id) || null;
  }

  if (!tournament) {
    return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  let userRegistrations: any[] = [];
  let allParticipants: any[] = [];

  try {
    const { data: participantsData } = await supabaseAdmin
      .from('Participant')
      .select('*')
      .eq('tournamentId', id)
    allParticipants = participantsData || [];

    if (userId) {
      userRegistrations = allParticipants.filter((p) => p.userId === userId);
    }

    // Merge in-memory local registrations if any missing
    try {
      const localRegs = db.getRegistrations ? db.getRegistrations() : [];
      const matchedLocal = localRegs.filter((r: any) => r.tournamentId === id);
      for (const localP of matchedLocal) {
        if (!allParticipants.some((p) => p.id === localP.id || (p.squadName && p.squadName === localP.squadName))) {
          allParticipants.push(localP);
        }
      }
    } catch {}
  } catch (e) {
    console.error('Failed to fetch participants from Supabase:', e);
    // Fallback to local DB
    const localRegs = db.getRegistrations ? db.getRegistrations() : [];
    allParticipants = localRegs.filter((r: any) => r.tournamentId === id);
    if (userId) {
      userRegistrations = allParticipants.filter((p) => p.userId === userId);
    }
  }

  const isUserRegistered = userRegistrations.length > 0;
  
  // Protect Room ID & Password from leaking to non-registered visitors
  const sanitizedTournament = {
    ...tournament,
    participants: allParticipants,
    registeredCount: allParticipants.length > (tournament.registeredCount || 0) ? allParticipants.length : (tournament.registeredCount || 0),
    roomId: isUserRegistered ? tournament.roomId : undefined,
    roomPassword: isUserRegistered ? tournament.roomPassword : undefined,
  };

  return NextResponse.json({ 
    tournament: sanitizedTournament, 
    participants: allParticipants, 
    userRegistrations 
  });
}
