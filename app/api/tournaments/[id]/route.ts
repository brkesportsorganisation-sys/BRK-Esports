import { NextResponse } from 'next/server';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { supabaseAdmin } from '@/lib/supabase';

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
      const { data } = await supabaseAdmin
        .from('Participant')
        .select('*')
        .eq('tournamentId', id)
        .eq('userId', userId)
        .order('joinedAt', { ascending: false });
      userRegistrations = data || [];
    } catch (e) {
      console.error('Failed to fetch user registrations:', e);
    }
  }

  return NextResponse.json({ tournament, userRegistrations });
}

