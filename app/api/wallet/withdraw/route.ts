import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_MIN_WITHDRAW_BDT = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, method, amount, accountNumber } = body;

    if (!userId || !method || !amount || !accountNumber) {
      return NextResponse.json({ 
        message: 'User ID, method, amount, and mobile banking account number are required.' 
      }, { status: 400 });
    }

    const trimmedAccount = String(accountNumber).trim();
    if (trimmedAccount.length < 11) {
      return NextResponse.json({ 
        message: 'Please provide a valid 11-digit mobile banking number (e.g. 017XXXXXXXX).' 
      }, { status: 400 });
    }

    // 1. Fetch dynamic minimum withdrawal limit from SiteSetting table
    let minWithdraw = DEFAULT_MIN_WITHDRAW_BDT;
    try {
      const { data: settingData } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', 'min_withdraw')
        .maybeSingle();

      if (settingData?.value) {
        const parsed = Number(settingData.value);
        if (!isNaN(parsed) && parsed > 0) {
          minWithdraw = parsed;
        }
      }
    } catch (settingErr) {
      console.warn('[POST /api/wallet/withdraw] Setting fetch fallback:', settingErr);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < minWithdraw) {
      return NextResponse.json({ 
        message: `Minimum withdrawal amount is ৳${minWithdraw}. (ন্যূনতম উইথড্র ৳${minWithdraw})` 
      }, { status: 400 });
    }

    // 2. Fetch user balances (No maximum withdrawal limit/cap is enforced; users can cash out any amount up to available balance)
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    // Single Unified Wallet Balance check
    const currentWallet = Number(user.walletBalance ?? (Number(user.winningBalance || 0) + Number(user.promoBalance || 0)));
    if (numAmount > currentWallet) {
      return NextResponse.json({
        message: `Insufficient Wallet balance. (Available: ৳${currentWallet}).`,
      }, { status: 400 });
    }

    // 3. Deduct total wallet balance and winning balance
    const newTotal = Math.max(0, currentWallet - numAmount);
    const newWinning = Math.max(0, Number(user.winningBalance || 0) - numAmount);

    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({
        winningBalance: newWinning,
        walletBalance: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw new Error(updateError.message);

    // 4. Create withdrawal payment record (PENDING state for Admin Review)
    const withdrawalId = `wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trxId = `WTH-${Date.now().toString().slice(-6)}`;

    await supabaseAdmin.from('Payment').insert([{
      id: withdrawalId,
      userId,
      userName: user.name || 'Player',
      userEmail: user.email || '',
      method,
      amount: numAmount,
      trxId,
      senderNumber: trimmedAccount,
      status: 'PENDING',
      walletType: 'WINNING',
      notes: `Withdrawal to ${trimmedAccount} (${method})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    // 5. Send in-app Notification to player
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: userId,
        title: 'উইথড্র রিকোয়েস্ট জমা হয়েছে! ⏳',
        message: `আপনার ৳${numAmount} ক্যাশআউট রিকোয়েস্ট (${method}: ${trimmedAccount}) সাবমিট হয়েছে। এডমিন যাচাই করে আপনার নাম্বারে টাকা পাঠিয়ে রিকোয়েস্ট Approve করবেন।`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Withdrawal request of ৳${numAmount} submitted. Admin will review and send funds to your ${method} account (${trimmedAccount}) shortly.`,
      winningBalance: newWinning,
      walletBalance: newTotal,
    });
  } catch (error: any) {
    console.error('[POST /api/wallet/withdraw]', error);
    return NextResponse.json({ message: error?.message || 'Withdrawal request failed.' }, { status: 500 });
  }
}

