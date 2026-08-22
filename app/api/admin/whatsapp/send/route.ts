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
        response: (result as any).response || (result as any).data,
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
      let resolvedTitle = tournamentTitle || 'BlackRock Esports Tournament';
      if (tournamentId && tournamentId !== 'ACTIVE_TOURNAMENTS' && tournamentId !== 'ALL') {
        const { data: tour } = await supabaseAdmin
          .from('Tournament')
          .select('title')
          .eq('id', tournamentId)
          .maybeSingle();

        if (tour?.title) {
          resolvedTitle = tour.title;
        }
      }

      // Fetch all verified registrations from Participant table
      let query = supabaseAdmin
        .from('Participant')
        .select('id, captainWhatsApp, iglName, squadName, status, tournamentId')
        .eq('status', 'VERIFIED')
        .not('captainWhatsApp', 'is', null);

      if (tournamentId && tournamentId !== 'ACTIVE_TOURNAMENTS' && tournamentId !== 'ALL') {
        query = query.eq('tournamentId', tournamentId);
      }

      const { data: regs, error: regErr } = await query;

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
          name: r.iglName || r.squadName || 'Captain',
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
        customMessage,
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
