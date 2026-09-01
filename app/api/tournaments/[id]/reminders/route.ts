import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getTournamentRooms } from '@/lib/tournament-rooms';
import { sendDirectWhatsappMessage, normalizePhoneNumber } from '@/lib/whatsapp';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

/**
 * POST /api/tournaments/[id]/reminders
 * Admin endpoint to send pre-match WhatsApp reminders to squad captains of a specific room or all rooms.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
      return NextResponse.json({ message: 'Unauthorized. Admin session required.' }, { status: 403 });
    }

    const { id: tournamentId } = await params;
    const body = await request.json();
    const { roomId, roomLabel, customNote } = body;

    const tournament = await getTournamentByIdFromDb(tournamentId);
    if (!tournament) {
      return NextResponse.json({ message: 'Tournament not found.' }, { status: 404 });
    }

    const rooms = await getTournamentRooms(tournamentId, tournament);
    const targetRooms = roomId
      ? rooms.filter(r => r.id === roomId || r.roomLabel === roomLabel)
      : rooms;

    if (targetRooms.length === 0) {
      return NextResponse.json({ message: 'No matching rooms found for this tournament.' }, { status: 404 });
    }

    let totalSent = 0;
    let totalFailed = 0;
    const details: any[] = [];

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://blackrock-esports.com';

    for (const room of targetRooms) {
      const participants = (room as any).participants || [];
      const matchTimeStr = room.matchTime || tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : '');
      const formattedTime = matchTimeStr ? new Date(matchTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon';

      for (const p of participants) {
        const phone = p.captainWhatsApp || p.phone;
        if (!phone) {
          totalFailed++;
          continue;
        }

        const msgText = `📢 *[BLACKROCK ESPORTS — MATCH REMINDER]*

Hello Captain *${p.iglName || p.squadName}*!
Your tournament match is starting soon!

🏆 *Tournament:* ${tournament.title}
⚔️ *Group / Room:* Group ${room.roomLabel}
⏰ *Match Time:* ${formattedTime}
🎯 *Assigned Slot:* Slot #${p.slotNumber || '1'}

⚠️ *Important Instructions:*
1. Room ID & Password will be unlocked 15 minutes before match start.
2. Open your tournament dashboard link below to reveal credentials and enter the game lobby promptly:
👉 ${siteUrl}/tournaments/${tournament.id}

${customNote ? `\n📌 *Admin Note:* ${customNote}` : ''}

_Best of luck & get ready for Booyah! 🔥_`;

        try {
          const res = await sendDirectWhatsappMessage({
            to: normalizePhoneNumber(phone),
            text: msgText,
            targetName: p.squadName,
            triggerType: 'ROOM_ALERT',
          });

          if (res?.success) {
            totalSent++;
            details.push({ squad: p.squadName, phone, status: 'SENT' });
          } else {
            totalFailed++;
            details.push({ squad: p.squadName, phone, status: 'FAILED', reason: res?.message });
          }
        } catch (err: any) {
          totalFailed++;
          details.push({ squad: p.squadName, phone, status: 'ERROR', reason: err?.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Dispatched ${totalSent} WhatsApp match reminders (${totalFailed} failed/unreachable).`,
      totalSent,
      totalFailed,
      details,
    });
  } catch (err: any) {
    console.error('[POST /api/tournaments/[id]/reminders] Error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to dispatch WhatsApp reminders.' },
      { status: 500 }
    );
  }
}
