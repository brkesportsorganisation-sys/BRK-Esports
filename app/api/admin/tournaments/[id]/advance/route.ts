import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { advanceSquadsToFinalRoom, getTournamentRooms } from '@/lib/tournament-rooms';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { cookies } from 'next/headers';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { advancingParticipants, finalRoomConfig } = body;

    if (!Array.isArray(advancingParticipants) || advancingParticipants.length === 0) {
      return NextResponse.json({ message: 'Please select at least one squad to advance to the Final Room.' }, { status: 400 });
    }

    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found' }, { status: 404 });
    }

    const result = await advanceSquadsToFinalRoom(tournamentId, advancingParticipants, finalRoomConfig);

    // Send in-app notification to all advancing squads
    for (const adv of advancingParticipants) {
      if (adv.userId) {
        try {
          await supabaseAdmin.from('Notification').insert([{
            id: `notif_adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: adv.userId,
            title: `🏆 Congratulations! Qualified for ${tournament.title} Finals!`,
            message: `Squad "${adv.squadName}" has advanced to the Championship Final Room! Check your match room tab for final room details.`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }]);
        } catch {}
      }
    }

    await logAdminAction(
      session?.sub || session?.email || 'admin',
      'ADVANCE_SQUADS_TO_FINAL',
      `Advanced ${result.advancedCount} squads to Final Room for "${tournament.title}"`
    );

    const updatedRooms = await getTournamentRooms(tournamentId, tournament);

    return NextResponse.json({
      success: true,
      message: `Successfully advanced ${result.advancedCount} squad(s) to the Final Room!`,
      finalRoom: result.finalRoom,
      rooms: updatedRooms,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/tournaments/[id]/advance] Error:', error);
    return NextResponse.json({ message: error?.message || 'Failed to advance squads' }, { status: 500 });
  }
}
