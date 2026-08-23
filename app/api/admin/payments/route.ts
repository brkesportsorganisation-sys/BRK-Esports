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

    const depositAmount = Number(payment.amount || 0);
    const wasAutoCredited = payment.notes?.includes('[Auto-Credited') || 
      (depositAmount < 500 && !payment.notes?.includes('NOT Auto-Credited') && !payment.notes?.includes('Manual Approval'));

    if (action === 'APPROVE') {
      // 1. If NOT auto-credited (e.g. > ৳500), credit the player's wallet now
      if (!wasAutoCredited) {
        const { data: user } = await supabaseAdmin
          .from('User')
          .select('id, walletBalance, winningBalance')
          .eq('id', payment.userId)
          .single();

        if (user) {
          const currentWallet = Number(user.walletBalance || 0);
          const currentWinning = Number(user.winningBalance || 0);
          const newWallet = currentWallet + depositAmount;
          const newWinning = currentWinning + depositAmount;

          await supabaseAdmin
            .from('User')
            .update({
              walletBalance: newWallet,
              winningBalance: newWinning,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
      }

      // 2. Mark payment as VERIFIED
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: wasAutoCredited
            ? `${payment.notes || ''} [Verified & Confirmed by ${session.username || session.email}]`
            : `${payment.notes || ''} [Approved & ৳${depositAmount} Credited to Wallet by ${session.username || session.email}]`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // 3. Send in-app Confirmation Notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: payment.userId,
          title: wasAutoCredited ? 'Deposit Verified! 🎉' : 'ডিপোজিট অ্যাপ্রুভ ও ওয়ালেটে জমা হয়েছে! 🎉',
          message: wasAutoCredited
            ? `আপনার ৳${payment.amount} ডিপোজিট (${payment.method}, TrxID: ${payment.trxId}) এডমিন কর্তৃক সফলভাবে ভেরিফাই ও কনফার্ম করা হয়েছে!`
            : `আপনার ৳${payment.amount} ডিপোজিট রিকোয়েস্টটি (${payment.method}, TrxID: ${payment.trxId}) এডমিন কর্তৃক অনুমোদিত হয়েছে এবং আপনার ওয়ালেটে ৳${payment.amount} যোগ করা হয়েছে!`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      await logAdminAction(
        session.username || session.email,
        'DEPOSIT_VERIFIED',
        'Payment',
        paymentId,
        `Approved deposit of ৳${payment.amount} (TrxID: ${payment.trxId}) for player ${payment.userName} (AutoCredited: ${wasAutoCredited})`
      );

      return NextResponse.json({ 
        success: true,
        message: wasAutoCredited 
          ? `Deposit of ৳${payment.amount} verified and confirmed.`
          : `Deposit of ৳${payment.amount} approved and credited to player's wallet.`
      });
    }

    // If REJECTED
    const reasonText = rejectionReason || 'Invalid Transaction ID, number mismatch, or payment not received';
    let newWallet = 0;

    // 1. Only deduct balance from player's wallet IF it was actually auto-credited
    if (wasAutoCredited) {
      const { data: user } = await supabaseAdmin
        .from('User')
        .select('id, walletBalance, winningBalance')
        .eq('id', payment.userId)
        .single();

      if (user) {
        const currentWallet = Number(user.walletBalance || 0);
        const currentWinning = Number(user.winningBalance || 0);
        newWallet = Math.max(0, currentWallet - depositAmount);
        const newWinning = Math.max(0, currentWinning - depositAmount);

        await supabaseAdmin
          .from('User')
          .update({
            walletBalance: newWallet,
            winningBalance: newWinning,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // 2. Mark payment as REJECTED
    await supabaseAdmin
      .from('Payment')
      .update({
        status: 'REJECTED',
        notes: wasAutoCredited
          ? `${payment.notes || ''} [Rejected & ৳${depositAmount} Deducted by ${session.username || session.email}: ${reasonText}]`
          : `${payment.notes || ''} [Rejected by ${session.username || session.email}: ${reasonText}]`,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // 3. Send Rejection Notification to player
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: payment.userId,
        title: wasAutoCredited ? 'ডিপোজিট বাতিল ও ব্যালেন্স কর্তন ⚠️' : 'ডিপোজিট রিকোয়েস্ট বাতিল ⚠️',
        message: wasAutoCredited
          ? `আপনার ৳${depositAmount} ডিপোজিট (TrxID: ${payment.trxId}) ভেরিফিকেশনে বাতিল হয়েছে এবং ওয়ালেট থেকে ৳${depositAmount} কেটে নেওয়া হয়েছে। কারণ: ${reasonText}। ভুল মনে হলে হেল্পলাইনে যোগাযোগ করুন।`
          : `আপনার ৳${depositAmount} ডিপোজিট রিকোয়েস্টটি (TrxID: ${payment.trxId}) বাতিল করা হয়েছে। কারণ: ${reasonText}। ভুল মনে হলে হেল্পলাইনে যোগাযোগ করুন।`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    await logAdminAction(
      session.username || session.email,
      wasAutoCredited ? 'DEPOSIT_REJECTED_AND_DEDUCTED' : 'DEPOSIT_REJECTED',
      'Payment',
      paymentId,
      `Rejected deposit of ৳${depositAmount} (TrxID: ${payment.trxId}) for ${payment.userName} (Reason: ${reasonText})`
    );

    return NextResponse.json({ 
      success: true,
      message: wasAutoCredited
        ? `Deposit rejected. ৳${depositAmount} has been deducted from player's balance.`
        : `Deposit request rejected. (No balance was deducted since it was not auto-credited).`,
      newWalletBalance: newWallet
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/payments]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process deposit.' }, { status: 500 });
  }
}
