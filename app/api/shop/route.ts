import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DIAMOND_PRODUCTS, DiamondProduct } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    success: true,
    products: DIAMOND_PRODUCTS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productId, paymentMethod = 'WALLET', playerUid, inGameName } = body;

    if (!userId || !productId || !playerUid) {
      return NextResponse.json({ message: 'User ID, Product ID, and Player Free Fire UID are required.' }, { status: 400 });
    }

    const product = DIAMOND_PRODUCTS.find(p => p.id === productId);
    if (!product) {
      return NextResponse.json({ message: 'Invalid diamond product selected.' }, { status: 404 });
    }

    // Verify user balance
    const { data: user, error: uErr } = await supabaseAdmin
      .from('User')
      .select('id, name, email, walletBalance, coinBalance')
      .eq('id', userId)
      .single();

    if (uErr || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const isCoins = paymentMethod === 'COINS';
    const requiredAmount = isCoins ? product.priceCoins : product.priceBdt;
    const currentBalance = isCoins ? Number(user.coinBalance || 0) : Number(user.walletBalance || 0);

    if (currentBalance < requiredAmount) {
      return NextResponse.json({
        message: `Insufficient ${isCoins ? 'coins' : 'wallet balance'}! Required: ${requiredAmount}, Available: ${currentBalance}`,
      }, { status: 400 });
    }

    // Deduct balance
    const newBal = currentBalance - requiredAmount;
    if (isCoins) {
      await supabaseAdmin.from('User').update({ coinBalance: newBal, updatedAt: new Date().toISOString() }).eq('id', userId);
    } else {
      await supabaseAdmin.from('User').update({ walletBalance: newBal, updatedAt: new Date().toISOString() }).eq('id', userId);
    }

    // Create Order Record in Payment table
    const orderId = `dia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin.from('Payment').insert([{
      id: orderId,
      userId,
      userName: user.name,
      userEmail: user.email,
      method: isCoins ? 'COINS' : 'WALLET',
      amount: requiredAmount,
      trxId: `FF-${Date.now().toString().slice(-6)}`,
      status: 'VERIFIED',
      notes: `Diamond Order: ${product.name} | FF UID: ${playerUid} (${inGameName || ''})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    // Send in-app confirmation notification (safely)
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId,
        title: `Diamond Order Placed: ${product.name} 💎`,
        message: `Your top-up of ${product.diamonds} Diamonds to UID ${playerUid} has been confirmed! Diamonds are delivered to your in-game mailbox.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Diamond top-up of ${product.name} confirmed! Delivered to Free Fire UID: ${playerUid}`,
      orderId,
      remainingBalance: newBal,
    });
  } catch (error: any) {
    console.error('[POST /api/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process diamond order.' }, { status: 500 });
  }
}
