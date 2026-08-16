import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { data: registrations, error } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ registrations: registrations || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/registrations]', error?.message);
    return NextResponse.json({ message: 'Failed to load registrations.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { registrationId, action } = body; // action: 'APPROVE' | 'REJECT'
  if (!registrationId || !['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json(
      { message: 'Invalid request: registrationId and action (APPROVE|REJECT) are required.' },
      { status: 400 }
    );
  }

  try {
    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    const { data: payment, error } = await supabaseAdmin
      .from('Payment')
      .update({ status: newStatus, updatedAt: new Date().toISOString() })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // If approved, increment registeredCount on the tournament
    if (action === 'APPROVE' && payment?.tournamentId) {
      const { data: tournament } = await supabaseAdmin
        .from('Tournament')
        .select('registeredCount')
        .eq('id', payment.tournamentId)
        .single();

      if (tournament) {
        await supabaseAdmin
          .from('Tournament')
          .update({
            registeredCount: (tournament.registeredCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', payment.tournamentId);
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        action === 'APPROVE'
          ? 'Registration approved successfully.'
          : 'Registration rejected.',
      payment,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/registrations]', error?.message);
    return NextResponse.json(
      { message: error?.message || 'Failed to update registration.' },
      { status: 500 }
    );
  }
}
