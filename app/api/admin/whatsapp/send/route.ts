import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { sendRoomDetailsToPlayer, broadcastRoomDetails } from '@/lib/whatsapp';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, playerPhone, playerName, roomId, pass, tournamentId, tournamentTitle, customMessage } = body;

    // Mode 1: Send to single player
    if (action === 'SINGLE' || (!action && playerPhone)) {
      if (!playerPhone || !roomId || !pass) {
        return NextResponse.json(
          { message: 'Player phone, Room ID, and Room Password are required.' },
          { status: 400 }
        );
      }

      const result = await sendRoomDetailsToPlayer({
        playerPhone,
        playerName,
        roomId,
        pass,
        tournamentTitle,
        customMessage,
      });

      if (!result.success) {
        return NextResponse.json({ message: result.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        response: result.response,
      });
    }

    // Mode 2: Broadcast to all verified registrations in a tournament
    if (action === 'BROADCAST') {
      if (!tournamentId || !roomId || !pass) {
        return NextResponse.json(
          { message: 'Tournament ID, Room ID, and Password are required for broadcast.' },
          { status: 400 }
        );
      }

      // Fetch tournament title
      const { data: tour } = await supabaseAdmin
        .from('Tournament')
        .select('title')
        .eq('id', tournamentId)
        .single();

      const resolvedTitle = tournamentTitle || tour?.title || 'BlackRock Esports Tournament';

      // Fetch all verified registrations
      const { data: regs, error: regErr } = await supabaseAdmin
        .from('TournamentRegistration')
        .select('id, captainWhatsApp, iglName, squadName, userName, status')
        .eq('tournamentId', tournamentId)
        .eq('status', 'VERIFIED');

      if (regErr) {
        return NextResponse.json({ message: regErr.message }, { status: 500 });
      }

      if (!regs || regs.length === 0) {
        return NextResponse.json(
          { message: 'No verified teams found for this tournament.' },
          { status: 404 }
        );
      }

      const recipients = regs
        .filter((r) => r.captainWhatsApp && r.captainWhatsApp.trim().length > 0)
        .map((r) => ({
          phone: r.captainWhatsApp,
          name: r.iglName || r.squadName || r.userName || 'Captain',
        }));

      if (recipients.length === 0) {
        return NextResponse.json(
          { message: 'None of the verified teams have a valid WhatsApp phone number.' },
          { status: 400 }
        );
      }

      const broadcastResult = await broadcastRoomDetails({
        recipients,
        roomId,
        pass,
        tournamentTitle: resolvedTitle,
      });

      return NextResponse.json({
        success: true,
        message: `WhatsApp Broadcast sent! Successfully delivered to ${broadcastResult.successCount} of ${broadcastResult.total} squad captains.`,
        data: broadcastResult,
      });
    }

    return NextResponse.json({ message: 'Invalid action specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/send]', error);
    return NextResponse.json(
      { message: error?.message || 'Server error while processing WhatsApp request.' },
      { status: 500 }
    );
  }
}
