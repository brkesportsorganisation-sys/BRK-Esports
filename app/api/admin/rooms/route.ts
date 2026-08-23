import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { listTournamentsFromDb } from '@/lib/tournament-store';
import { broadcastRoomDetails } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

// GET /api/admin/rooms - Fetch all tournaments with room details and registered squad captains
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Fetch all tournaments
    const tournaments = await listTournamentsFromDb();

    // 2. Fetch all participants with captain contact metadata
    const { data: participants, error: partError } = await supabaseAdmin
      .from('Participant')
      .select('id, registrationId, tournamentId, userId, squadName, iglName, captainWhatsApp, status, joinedAt')
      .order('joinedAt', { ascending: true });

    if (partError) {
      console.warn('[GET /api/admin/rooms] Participant fetch error:', partError.message);
    }

    // 3. Fetch user profiles for captain fallback numbers
    const { data: users } = await supabaseAdmin
      .from('User')
      .select('id, name, phone, whatsapp');
    const userMap = new Map<string, any>();
    (users || []).forEach((u) => userMap.set(u.id, u));

    // Group participants by tournamentId
    const participantsByTournament = new Map<string, any[]>();
    (participants || []).forEach((p) => {
      const userMeta = userMap.get(p.userId);
      const rawPhone = p.captainWhatsApp || userMeta?.whatsapp || userMeta?.phone || '';
      const normalizedPhone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
      const formattedPhone = normalizedPhone.length >= 10
        ? (normalizedPhone.startsWith('880') ? `+${normalizedPhone}` : `+880${normalizedPhone.replace(/^0+/, '')}`)
        : rawPhone;

      const enriched = {
        ...p,
        captainWhatsApp: formattedPhone,
        captainName: p.iglName || p.squadName || userMeta?.name || 'Captain',
      };

      const list = participantsByTournament.get(p.tournamentId) || [];
      list.push(enriched);
      participantsByTournament.set(p.tournamentId, list);
    });

    // Structure tournament room items
    const tournamentRooms = tournaments.map((tour) => {
      const slots = participantsByTournament.get(tour.id) || [];
      const verifiedSlots = slots.filter((s) => s.status === 'VERIFIED');
      const pendingSlots = slots.filter((s) => s.status === 'PENDING');
      const isRoomSet = Boolean(tour.roomId && tour.roomId.trim().length > 0);

      return {
        id: tour.id,
        title: tour.title,
        game: tour.game,
        gameName: tour.gameName,
        banner: tour.banner,
        status: tour.status,
        matchTime: tour.matchTime,
        maxTeams: tour.maxTeams || 12,
        registeredCount: slots.length,
        verifiedCount: verifiedSlots.length,
        pendingCount: pendingSlots.length,
        roomId: tour.roomId || '',
        roomPassword: tour.roomPassword || '',
        roomEnabled: tour.roomEnabled || false,
        isRoomSet,
        slots,
      };
    });

    const totalTournaments = tournamentRooms.length;
    const roomsReleased = tournamentRooms.filter((t) => t.isRoomSet).length;
    const roomsPending = tournamentRooms.filter((t) => !t.isRoomSet).length;
    const totalCaptains = (participants || []).filter((p) => p.status === 'VERIFIED').length;

    return NextResponse.json({
      success: true,
      tournaments: tournamentRooms,
      stats: {
        totalTournaments,
        roomsReleased,
        roomsPending,
        totalCaptains,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/rooms]', error);
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/rooms - Update Room ID & Password in Database and optionally Broadcast via WhatsApp
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tournamentId, roomId, roomPassword, action, broadcastWhatsApp, customMessage } = body;

    if (!tournamentId) {
      return NextResponse.json({ message: 'Tournament ID is required.' }, { status: 400 });
    }

    // Mode A: Clear Room Credentials
    if (action === 'CLEAR') {
      const { error: updateErr } = await supabaseAdmin
        .from('Tournament')
        .update({
          roomId: null,
          roomPassword: null,
          roomEnabled: false,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', tournamentId);

      if (updateErr) {
        console.error('[POST /api/admin/rooms CLEAR]', updateErr);
        return NextResponse.json({ message: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Room ID & Password cleared successfully from database.',
      });
    }

    // Mode B: Set Room ID & Password
    const cleanRoomId = (roomId || '').trim();
    const cleanRoomPass = (roomPassword || '').trim();

    if (!cleanRoomId || !cleanRoomPass) {
      return NextResponse.json({ message: 'Room ID and Password are both required.' }, { status: 400 });
    }

    // 1. Update Database (Supabase Tournament Table)
    const { error: dbError } = await supabaseAdmin
      .from('Tournament')
      .update({
        roomId: cleanRoomId,
        roomPassword: cleanRoomPass,
        roomEnabled: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', tournamentId);

    if (dbError) {
      console.error('[POST /api/admin/rooms UPDATE]', dbError);
      return NextResponse.json({ message: dbError.message }, { status: 500 });
    }

    let broadcastResult: any = null;

    // 2. Broadcast via WhatsApp API if requested
    if (broadcastWhatsApp) {
      // Fetch tournament title
      const { data: tour } = await supabaseAdmin
        .from('Tournament')
        .select('title')
        .eq('id', tournamentId)
        .maybeSingle();

      const tournamentTitle = tour?.title || 'BlackRock Esports Tournament';

      // Fetch verified captains
      const { data: participants } = await supabaseAdmin
        .from('Participant')
        .select('id, captainWhatsApp, iglName, squadName, status')
        .eq('tournamentId', tournamentId)
        .eq('status', 'VERIFIED');

      const recipients = (participants || [])
        .filter((r) => r.captainWhatsApp && r.captainWhatsApp.trim().length > 0)
        .map((r) => ({
          phone: r.captainWhatsApp,
          name: r.iglName || r.squadName || 'Captain',
        }));

      if (recipients.length > 0) {
        try {
          broadcastResult = await broadcastRoomDetails({
            recipients,
            roomId: cleanRoomId,
            pass: cleanRoomPass,
            tournamentTitle,
            customMessage,
          });
        } catch (waErr: any) {
          console.warn('[POST /api/admin/rooms WhatsApp Broadcast]', waErr);
        }
      }
    }

    const message = broadcastWhatsApp && broadcastResult
      ? `Room ID & Pass saved to Database and dispatched to ${broadcastResult.successCount} of ${broadcastResult.total} WhatsApp captains!`
      : 'Room ID & Password saved successfully to database! Players can now see it on match screen.';

    return NextResponse.json({
      success: true,
      message,
      broadcastResult,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/rooms]', error);
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}
