import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const MIN_WITHDRAW_BDT = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, method, amount, accountNumber } = body;

    if (!userId || !method || !amount || !accountNumber) {
      return NextResponse.json({ message: 'User ID, method, amount, and mobile banking number are required.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < MIN_WITHDRAW_BDT) {
      return NextResponse.json({ message: `Minimum withdrawal amount is ৳${MIN_WITHDRAW_BDT}.` }, { status: 400 });
    }

    // Fetch user balances
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Dual-Wallet Enforcement: Only winningBalance is withdrawable!
    const availableWinning = Number(user.winningBalance || 0);
    if (numAmount > availableWinning) {
      return NextResponse.json({
        message: `Insufficient Winning Wallet balance. You can only withdraw from tournament earnings (Available Winning Balance: ৳${availableWinning}). Promo bonus cannot be withdrawn.`,
      }, { status: 400 });
    }

    // Deduct winning balance and total balance
    const newWinning = availableWinning - numAmount;
    const newTotal = Math.max(0, Number(user.walletBalance || 0) - numAmount);

    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({
        winningBalance: newWinning,
        walletBalance: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw new Error(updateError.message);

    // Create withdrawal payment record
    const withdrawalId = `wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trxId = `WTH-${Date.now().toString().slice(-6)}`;

    await supabaseAdmin.from('Payment').insert([{
      id: withdrawalId,
      userId,
      userName: user.name,
      userEmail: user.email,
      method,
      amount: numAmount,
      trxId,
      status: 'PENDING',
      walletType: 'WINNING',
      notes: `Withdrawal to ${accountNumber} (${method})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    return NextResponse.json({
      success: true,
      message: `Withdrawal request of ৳${numAmount} submitted. Funds will be sent to your ${method} account (${accountNumber}) shortly.`,
      winningBalance: newWinning,
      walletBalance: newTotal,
    });
  } catch (error: any) {
    console.error('[POST /api/wallet/withdraw]', error);
    return NextResponse.json({ message: error?.message || 'Withdrawal request failed.' }, { status: 500 });
  }
}
