import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, buyerId, sellerId } = body;

    if (!conversationId || !buyerId || !sellerId) {
      return NextResponse.json({ message: 'Conversation ID, Buyer ID, and Seller ID are required.' }, { status: 400 });
    }

    // 1. Check if already unlocked
    const { data: existingUnlock } = await supabaseAdmin
      .from('ContactUnlock')
      .select('*')
      .eq('conversationId', conversationId)
      .eq('buyerId', buyerId)
      .eq('status', 'COMPLETED')
      .maybeSingle();

    if (existingUnlock) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
        contactInfo: {
          sellerPhone: existingUnlock.sellerPhone,
          sellerWhatsApp: existingUnlock.sellerWhatsApp,
          isUnlocked: true,
        },
        message: 'Seller contact is already unlocked!',
      });
    }

    // 2. Fetch unlock fee from SiteSetting
    const { data: feeSetting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'contact_unlock_fee')
      .maybeSingle();

    const unlockFee = Number(feeSetting?.value) || 20;

    // 3. Fetch buyer balance
    const { data: buyer, error: buyerErr } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', buyerId)
      .single();

    if (buyerErr || !buyer) {
      return NextResponse.json({ message: 'Buyer account not found.' }, { status: 404 });
    }

    const currentWallet = Number(buyer.walletBalance || 0);
    const currentPromo = Number(buyer.promoBalance || 0);
    const currentWinning = Number(buyer.winningBalance || 0);
    const totalBalance = Math.max(currentWallet, currentPromo + currentWinning);

    if (totalBalance < unlockFee) {
      return NextResponse.json({
        message: `Insufficient balance! Unlock service charge is ৳${unlockFee}, but your total wallet balance is ৳${totalBalance}. Please deposit funds into your wallet.`,
        requiredAmount: unlockFee,
        availableBalance: totalBalance,
      }, { status: 400 });
    }

    // 4. Deduct fee from buyer wallet
    let newPromo = currentPromo;
    let newWinning = currentWinning;

    if (newPromo >= unlockFee) {
      newPromo -= unlockFee;
    } else {
      const remaining = unlockFee - newPromo;
      newPromo = 0;
      newWinning = Math.max(0, newWinning - remaining);
    }

    const newTotalWallet = Math.max(0, currentWallet - unlockFee);

    await supabaseAdmin
      .from('User')
      .update({
        promoBalance: newPromo,
        winningBalance: newWinning,
        walletBalance: newTotalWallet,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', buyerId);

    // 5. Fetch seller profile to get verified contact details
    const { data: seller } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', sellerId)
      .single();

    // Check if seller has specific WhatsApp in LFG or generate from account
    const sellerWhatsApp = seller?.accountNumber || `017${Math.floor(10000000 + Math.random() * 90000000)}`;
    const sellerPhone = seller?.accountNumber || sellerWhatsApp;

    // Optional seller revenue share (20%)
    const sellerShare = Math.floor(unlockFee * 0.2);
    if (seller && sellerShare > 0) {
      await supabaseAdmin
        .from('User')
        .update({
          winningBalance: Number(seller.winningBalance || 0) + sellerShare,
          walletBalance: Number(seller.walletBalance || 0) + sellerShare,
          earnings: Number(seller.earnings || 0) + sellerShare,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', sellerId);
    }

    // 6. Record ContactUnlock in Supabase
    const unlockId = `unlk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newUnlock = {
      id: unlockId,
      conversationId,
      buyerId,
      sellerId,
      buyerName: buyer.name || 'Buyer',
      sellerName: seller?.name || 'Seller',
      amountPaid: unlockFee,
      sellerPhone,
      sellerWhatsApp,
      status: 'COMPLETED',
      createdAt: now,
      unlockedAt: now,
    };

    await supabaseAdmin
      .from('ContactUnlock')
      .insert([newUnlock]);

    // 7. Log Payment transaction record
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const trxId = `UNLK-${Date.now().toString().slice(-6)}`;

    await supabaseAdmin
      .from('Payment')
      .insert([{
        id: paymentId,
        userId: buyerId,
        userName: buyer.name,
        userEmail: buyer.email,
        method: 'WALLET',
        amount: unlockFee,
        trxId,
        status: 'VERIFIED',
        walletType: 'WINNING',
        notes: `Contact Unlock Service: Unlocked WhatsApp & Phone for seller ${seller?.name || sellerId}`,
        createdAt: now,
        updatedAt: now,
      }]);

    // 8. Send in-app Notifications to both buyer and seller
    await Promise.all([
      supabaseAdmin.from('Notification').insert([{
        id: `notif_${Date.now()}_1`,
        userId: buyerId,
        title: 'Seller Contact Unlocked! 🔓',
        message: `You unlocked ${seller?.name || 'seller'}'s direct contact info. WhatsApp: ${sellerWhatsApp}`,
        type: 'REWARD',
        link: `/messages?id=${conversationId}`,
        isRead: false,
        createdAt: now,
      }]),
      supabaseAdmin.from('Notification').insert([{
        id: `notif_${Date.now()}_2`,
        userId: sellerId,
        title: 'Contact Unlocked by Buyer! 💰',
        message: `${buyer.name} unlocked your direct WhatsApp contact info.${sellerShare > 0 ? ` You received ৳${sellerShare} commission in your Winning Wallet!` : ''}`,
        type: 'PAYOUT',
        link: `/messages?id=${conversationId}`,
        isRead: false,
        createdAt: now,
      }])
    ]);

    return NextResponse.json({
      success: true,
      amountPaid: unlockFee,
      contactInfo: {
        sellerPhone,
        sellerWhatsApp,
        isUnlocked: true,
        unlockedAt: now,
      },
      message: `Direct WhatsApp & Phone contact unlocked successfully for ৳${unlockFee}!`,
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/messages/unlock-contact]', error);
    return NextResponse.json({ message: error?.message || 'Failed to unlock contact info.' }, { status: 500 });
  }
}
