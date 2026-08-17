import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 10 Coins = 1 BDT
const COINS_PER_BDT = 10;
const MIN_COINS_TO_CONVERT = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, coins } = body;

    if (!userId || !coins) {
      return NextResponse.json({ message: 'User ID and coins amount are required.' }, { status: 400 });
    }

    const numCoins = Math.floor(Number(coins));
    if (isNaN(numCoins) || numCoins < MIN_COINS_TO_CONVERT) {
      return NextResponse.json({ 
        message: `Minimum ${MIN_COINS_TO_CONVERT} coins required for conversion (Rate: ${COINS_PER_BDT} Coins = ৳1).` 
      }, { status: 400 });
    }

    // Fetch user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    const currentCoins = Number(user.coinBalance || 0);
    if (currentCoins < numCoins) {
      return NextResponse.json({ 
        message: `Insufficient Coins! You have ${currentCoins} Coins, but tried to convert ${numCoins} Coins.` 
      }, { status: 400 });
    }

    // Calculate BDT value
    const bdtAmount = parseFloat((numCoins / COINS_PER_BDT).toFixed(2));
    const newCoinBalance = currentCoins - numCoins;
    const newPromoBalance = Number(user.promoBalance || 0) + bdtAmount;
    const newWalletBalance = Number(user.walletBalance || 0) + bdtAmount;

    // Update User balances in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('User')
      .update({
        coinBalance: newCoinBalance,
        promoBalance: newPromoBalance,
        walletBalance: newWalletBalance,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Create Payment record for transaction history
    const paymentId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trxId = `CONV-${Date.now().toString().slice(-6)}`;

    await supabaseAdmin.from('Payment').insert([{
      id: paymentId,
      userId,
      userName: user.name,
      userEmail: user.email,
      method: 'WALLET',
      amount: bdtAmount,
      trxId,
      status: 'VERIFIED',
      walletType: 'PROMO',
      notes: `Coin Exchange: Converted ${numCoins} Coins to ৳${bdtAmount} Promo Wallet credit`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    // Send in-app Notification
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin.from('Notification').insert([{
      id: notifId,
      userId,
      title: 'Coins Converted! 🪙➡️৳',
      message: `You converted ${numCoins} Coins to ৳${bdtAmount} Promo Wallet credit. Use it to join tournament matches!`,
      type: 'REWARD',
      link: '/wallet',
      isRead: false,
      createdAt: new Date().toISOString(),
    }]);

    return NextResponse.json({
      success: true,
      message: `Successfully converted ${numCoins} Coins to ৳${bdtAmount} Promo Wallet credit!`,
      convertedCoins: numCoins,
      creditedBdt: bdtAmount,
      newCoinBalance,
      newPromoBalance,
      newWalletBalance,
    });

  } catch (error: any) {
    console.error('[POST /api/wallet/convert-coins]', error);
    return NextResponse.json({ message: error?.message || 'Failed to convert coins.' }, { status: 500 });
  }
}
