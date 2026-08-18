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
      // 1. Mark payment as VERIFIED (already auto-credited on submission)
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: `${payment.notes || ''} [Verified & Confirmed by ${session.username || session.email}]`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // 2. Send in-app Confirmation Notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: payment.userId,
          title: 'Deposit Verified! 🎉',
          message: `আপনার ৳${payment.amount} ডিপোজিট (${payment.method}, TrxID: ${payment.trxId}) এডমিন কর্তৃক সফলভাবে ভেরিফাই ও কনফার্ম করা হয়েছে!`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      await logAdminAction(
        session.username || session.email,
        'DEPOSIT_VERIFIED',
        'Payment',
        paymentId,
        `Approved and verified deposit of ৳${payment.amount} (TrxID: ${payment.trxId}) for player ${payment.userName}`
      );

      return NextResponse.json({ 
        success: true,
        message: `Deposit of ৳${payment.amount} verified and confirmed.` 
      });
    }

    // If REJECTED (Fraud / Fake TrxID / Fake Screenshot -> Deduct / Minus balance)
    const reasonText = rejectionReason || 'Invalid Transaction ID, number mismatch, or payment not received';
    const deductAmt = Number(payment.amount || 0);

    // 1. Deduct the auto-credited balance from the player's wallet
    const { data: user } = await supabaseAdmin
      .from('User')
      .select('id, walletBalance, winningBalance')
      .eq('id', payment.userId)
      .single();

    let newWallet = 0;
    let newWinning = 0;

    if (user) {
      const currentWallet = Number(user.walletBalance || 0);
      const currentWinning = Number(user.winningBalance || 0);
      newWallet = Math.max(0, currentWallet - deductAmt);
      newWinning = Math.max(0, currentWinning - deductAmt);

      await supabaseAdmin
        .from('User')
        .update({
          walletBalance: newWallet,
          winningBalance: newWinning,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    // 2. Mark payment as REJECTED
    await supabaseAdmin
      .from('Payment')
      .update({
        status: 'REJECTED',
        notes: `${payment.notes || ''} [Rejected & ৳${deductAmt} Deducted by ${session.username || session.email}: ${reasonText}]`,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // 3. Send Rejection & Balance Deduction Notification to player
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: payment.userId,
        title: 'ডিপোজিট বাতিল ও ব্যালেন্স কর্তন ⚠️',
        message: `আপনার ৳${deductAmt} ডিপোজিট (TrxID: ${payment.trxId}) ভেরিফিকেশনে বাতিল হয়েছে এবং ওয়ালেট থেকে ৳${deductAmt} কেটে নেওয়া হয়েছে। কারণ: ${reasonText}। ভুল মনে হলে হেল্পলাইনে যোগাযোগ করুন।`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    await logAdminAction(
      session.username || session.email,
      'DEPOSIT_REJECTED_AND_DEDUCTED',
      'Payment',
      paymentId,
      `Rejected deposit of ৳${deductAmt} (TrxID: ${payment.trxId}) for ${payment.userName} and deducted balance (Reason: ${reasonText})`
    );

    return NextResponse.json({ 
      success: true,
      message: `Deposit rejected. ৳${deductAmt} has been deducted from player's balance.`,
      newWalletBalance: newWallet
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/payments]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process deposit.' }, { status: 500 });
  }
}
