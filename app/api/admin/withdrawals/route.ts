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
  if (!session || !hasPermission(session, 'manage_withdrawals')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: withdrawals, error } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .or('trxId.ilike.WTH-%,notes.ilike.%Withdrawal%')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/withdrawals] Supabase query warning:', error.message);
      return NextResponse.json({ withdrawals: [] });
    }

    return NextResponse.json({ withdrawals: withdrawals || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/withdrawals]', error);
    return NextResponse.json({ withdrawals: [] });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_withdrawals')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { withdrawalId, action, rejectionReason, adminTrxId, adminNote } = body; // action: 'APPROVE' | 'REJECT'

    if (!withdrawalId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ message: 'Withdrawal ID and action (APPROVE|REJECT) are required.' }, { status: 400 });
    }

    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json({ message: 'Withdrawal request not found.' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const extraTrx = adminTrxId ? ` [TrxID: ${adminTrxId.trim()}]` : '';
      const extraNote = adminNote ? ` - Note: ${adminNote.trim()}` : '';
      const updatedNotes = `${payment.notes || ''} [Paid by ${session.username || session.email}${extraTrx}${extraNote}]`;

      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: updatedNotes,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      // Send in-app Notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: payment.userId,
          title: 'উইথড্র সফল হয়েছে! 💸',
          message: `আপনার ৳${payment.amount} ক্যাশআউট (${payment.method}) সফলভাবে পাঠানো হয়েছে! ${adminTrxId ? `(TrxID: ${adminTrxId}) ` : ''}আপনার ${payment.method} একাউন্ট ব্যালেন্স চেক করুন।`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      await logAdminAction(
        session.username || session.email,
        'WITHDRAWAL_APPROVED',
        'Payment',
        withdrawalId,
        `Approved and sent payout of ৳${payment.amount} to ${payment.userName} via ${payment.method} (${payment.senderNumber || payment.notes})`
      );

      return NextResponse.json({ 
        success: true,
        message: `Withdrawal of ৳${payment.amount} approved and marked completed.` 
      });
    }

    // If REJECTED -> refund the deducted amount back to user's winningBalance and walletBalance
    const { data: user } = await supabaseAdmin
      .from('User')
      .select('id, winningBalance, walletBalance')
      .eq('id', payment.userId)
      .single();

    if (user) {
      await supabaseAdmin
        .from('User')
        .update({
          winningBalance: Number(user.winningBalance || 0) + Number(payment.amount),
          walletBalance: Number(user.walletBalance || 0) + Number(payment.amount),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    const reasonText = rejectionReason || 'Account number error or verification issue';
    await supabaseAdmin
      .from('Payment')
      .update({
        status: 'REJECTED',
        notes: `${payment.notes || ''} [Rejected & Refunded by ${session.username || session.email}: ${reasonText}]`,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    // Send in-app Notification to player
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: payment.userId,
        title: 'উইথড্র বাতিল ও রিফান্ড 🔄',
        message: `আপনার ৳${payment.amount} উইথড্র রিকোয়েস্ট বাতিল করা হয়েছে (${reasonText})। ৳${payment.amount} আপনার Winning Wallet এ রিফান্ড করা হয়েছে।`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    await logAdminAction(
      session.username || session.email,
      'WITHDRAWAL_REJECTED',
      'Payment',
      withdrawalId,
      `Rejected payout of ৳${payment.amount} for ${payment.userName} and refunded to winning balance (Reason: ${reasonText})`
    );

    return NextResponse.json({ 
      success: true,
      message: `Withdrawal rejected and ৳${payment.amount} refunded back to player wallet.` 
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/withdrawals]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process withdrawal.' }, { status: 500 });
  }
}

