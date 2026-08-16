import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, hasPermission, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_deposits')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: payments, error } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .not('trxId', 'ilike', 'WTH-%')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/payments] Supabase error:', error.message);
      return NextResponse.json({ payments: [] });
    }

    return NextResponse.json({ payments: payments || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/payments]', error);
    return NextResponse.json({ payments: [] });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_deposits')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paymentId, action, rejectionReason } = body; // action: 'APPROVE' | 'REJECT'

    if (!paymentId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ message: 'Payment ID and action (APPROVE|REJECT) are required.' }, { status: 400 });
    }

    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ message: 'Deposit record not found.' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // 1. Credit player balance in Supabase User table
      const { data: user } = await supabaseAdmin
        .from('User')
        .select('id, walletBalance')
        .eq('id', payment.userId)
        .single();

      if (user) {
        await supabaseAdmin
          .from('User')
          .update({
            walletBalance: Number(user.walletBalance || 0) + Number(payment.amount),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      // 2. Mark payment as VERIFIED
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: `${payment.notes || ''} [Verified by ${session.username || session.email}]`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', paymentId);

      logAdminAction(
        session.username || session.email,
        'DEPOSIT_VERIFIED',
        `Approved deposit of ৳${payment.amount} (TrxID: ${payment.trxId}) for ${payment.userName}`,
        'Payment',
        paymentId
      );

      return NextResponse.json({ message: `Deposit of ৳${payment.amount} verified and credited to player balance.` });
    }

    // If REJECTED
    await supabaseAdmin
      .from('Payment')
      .update({
        status: 'REJECTED',
        notes: `${payment.notes || ''} [Rejected: ${rejectionReason || 'Invalid TrxID or receipt'}]`,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', paymentId);

    logAdminAction(
      session.username || session.email,
      'DEPOSIT_REJECTED',
      `Rejected deposit of ৳${payment.amount} (TrxID: ${payment.trxId}) for ${payment.userName}`,
      'Payment',
      paymentId
    );

    return NextResponse.json({ message: `Deposit request marked rejected.` });
  } catch (error: any) {
    console.error('[PATCH /api/admin/payments]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process deposit.' }, { status: 500 });
  }
}
