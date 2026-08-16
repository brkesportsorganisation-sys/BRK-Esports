import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';

const getUserId = (request: NextRequest) => request.headers.get('x-user-id') || request.headers.get('x-current-user-id');

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ message: 'Community Locked' }, { status: 401 });
  
  const { id } = await params;
  
  const [userRes, tournament] = await Promise.all([
    supabaseAdmin.from('User').select('*').eq('id', userId).maybeSingle(),
    getTournamentByIdFromDb(id)
  ]);
  
  const user = userRes.data;
  if (!user) return NextResponse.json({ message: 'Community Locked' }, { status: 401 });
  if (!tournament?.community?.enabled || tournament.community.isDisabled) {
    return NextResponse.json({ message: 'Community access is disabled' }, { status: 403 });
  }

  const [slotRes, approvedPaymentRes] = await Promise.all([
    supabaseAdmin.from('Participant').select('id').eq('tournamentId', id).eq('userId', user.id).maybeSingle(),
    supabaseAdmin.from('Payment').select('id').eq('tournamentId', id).eq('userId', user.id).eq('status', 'VERIFIED').maybeSingle()
  ]);

  if (!slotRes.data || !approvedPaymentRes.data) {
    return NextResponse.json({ message: 'Community Locked' }, { status: 403 });
  }

  const inviteLink = (tournament.community.inviteLink || '').trim();
  if (!inviteLink) return NextResponse.json({ message: 'Community link is not available' }, { status: 404 });

  return NextResponse.json({
    inviteLink,
    communityName: tournament.community.communityName,
    communityDescription: tournament.community.communityDescription,
    communityType: tournament.community.accessType
  });
}

export const POST = GET;
