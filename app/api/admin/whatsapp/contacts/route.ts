import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/whatsapp';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Fetch participants (Captains & Players)
    const { data: participants, error: partErr } = await supabaseAdmin
      .from('Participant')
      .select('id, registrationId, squadName, iglName, captainWhatsApp, player1Name, player2Name, player3Name, player4Name, status, tournamentId, joinedAt')
      .order('joinedAt', { ascending: false });

    // 2. Fetch tournaments to match titles
    const { data: tournaments } = await supabaseAdmin
      .from('Tournament')
      .select('id, title, roomId, roomPassword, matchTime');

    const tournamentMap = (tournaments || []).reduce((acc: Record<string, any>, t: any) => {
      acc[t.id] = t;
      return acc;
    }, {});

    // 3. Fetch Platform Users
    const { data: users } = await supabaseAdmin
      .from('User')
      .select('id, name, email, phone, createdAt')
      .order('createdAt', { ascending: false });

    // Build contacts list
    const contacts: Array<{
      id: string;
      name: string;
      squadName?: string;
      phone: string;
      formattedPhone: string;
      role: 'CAPTAIN' | 'PLAYER' | 'USER';
      tournamentId?: string;
      tournamentTitle?: string;
      roomId?: string;
      roomPassword?: string;
      status?: string;
    }> = [];

    const phoneSet = new Set<string>();

    // Add Tournament Captains
    for (const p of (participants || [])) {
      const rawPhone = p.captainWhatsApp || '';
      const formatted = normalizePhoneNumber(rawPhone);
      const tour = tournamentMap[p.tournamentId];

      if (formatted && !phoneSet.has(formatted)) {
        phoneSet.add(formatted);
        contacts.push({
          id: p.id || p.registrationId,
          name: p.iglName || p.squadName || 'Captain',
          squadName: p.squadName,
          phone: rawPhone,
          formattedPhone: formatted,
          role: 'CAPTAIN',
          tournamentId: p.tournamentId,
          tournamentTitle: tour?.title || 'Tournament',
          roomId: tour?.roomId,
          roomPassword: tour?.roomPassword,
          status: p.status || 'VERIFIED',
        });
      }
    }

    // Add registered users with phone numbers
    for (const u of (users || [])) {
      if (u.phone) {
        const formatted = normalizePhoneNumber(u.phone);
        if (formatted && !phoneSet.has(formatted)) {
          phoneSet.add(formatted);
          contacts.push({
            id: u.id,
            name: u.name || 'User',
            phone: u.phone,
            formattedPhone: formatted,
            role: 'USER',
            status: 'ACTIVE',
          });
        }
      }
    }

    return NextResponse.json({
      contacts,
      totalContacts: contacts.length,
      captainsCount: contacts.filter(c => c.role === 'CAPTAIN').length,
    });
  } catch (err: any) {
    console.error('[GET /api/admin/whatsapp/contacts]', err);
    return NextResponse.json({ contacts: [], totalContacts: 0 }, { status: 500 });
  }
}
