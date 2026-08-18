import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession, hasVendorPermission, isVendorTournamentAccessible } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

async function getVendorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  return verifyVendorSession(token);
}

export async function GET(request: NextRequest) {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  if (!hasVendorPermission(session, 'view_registrations')) {
    return NextResponse.json(
      { message: 'You do not have permission to view team registrations.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournamentId');

  if (tournamentId && !isVendorTournamentAccessible(session, tournamentId)) {
    return NextResponse.json(
      { message: 'You do not have access to this tournament.' },
      { status: 403 }
    );
  }

  try {
    let query = supabaseAdmin
      .from('Participant')
      .select('*')
      .order('joinedAt', { ascending: false });

    if (tournamentId) {
      query = query.eq('tournamentId', tournamentId);
    } else if (session.accessLevel !== 'FULL_ACCESS' && !session.assignedTournaments.includes('ALL')) {
      query = query.in('tournamentId', session.assignedTournaments);
    }

    const { data: participants, error } = await query;
    if (!error && participants) {
      return NextResponse.json({ registrations: participants });
    }

    // Fallback using payments/users
    const payments = db.getPayments().filter((p) => p.status === 'VERIFIED');
    return NextResponse.json({
      registrations: payments.map((p) => ({
        id: p.id,
        tournamentId: p.tournamentId,
        tournamentTitle: p.tournamentTitle,
        userId: p.userId,
        squadName: p.userName || 'Team Alpha',
        iglName: p.userName,
        captainWhatsApp: p.senderNumber || '+8801700000000',
        joinedAt: p.createdAt,
        status: 'VERIFIED',
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/vendor/registrations]', error);
    return NextResponse.json({ registrations: [] });
  }
}
