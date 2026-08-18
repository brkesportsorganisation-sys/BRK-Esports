import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { saveBase64Image } from '@/lib/upload';

const DEFAULT_MIN_DEPOSIT_BDT = 20;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userEmail, method, amount, trxId, screenshot } = body;

    if (!userId || !method || !amount || !trxId) {
      return NextResponse.json({ message: 'User ID, payment method, amount, and TrxID are required.' }, { status: 400 });
    }

    // Fetch dynamic minimum deposit limit from SiteSetting table
    let minDeposit = DEFAULT_MIN_DEPOSIT_BDT;
    try {
      const { data: settingData } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', 'min_deposit')
        .maybeSingle();

      if (settingData?.value) {
        const parsed = Number(settingData.value);
        if (!isNaN(parsed) && parsed > 0) {
          minDeposit = parsed;
        }
      }
    } catch (settingErr) {
      console.warn('[POST /api/wallet/deposit] Setting fetch fallback:', settingErr);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < minDeposit) {
      return NextResponse.json({ message: `Minimum deposit amount is ৳${minDeposit}. (ন্যূনতম ডিপোজিট ৳${minDeposit})` }, { status: 400 });
    }

    const trimmedTrx = trxId.trim().toUpperCase();
    if (trimmedTrx.length < 6) {
      return NextResponse.json({ message: 'Invalid Transaction ID (TrxID) format.' }, { status: 400 });
    }

    // Check duplicate TrxID in Supabase Payment table (Anti-Fraud protection)
    const { data: existingTrx } = await supabaseAdmin
      .from('Payment')
      .select('id, status')
      .eq('trxId', trimmedTrx)
      .maybeSingle();

    if (existingTrx) {
      return NextResponse.json({ message: 'A deposit with this TrxID has already been submitted.' }, { status: 409 });
    }

    // Upload screenshot if base64 provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        screenshotUrl = await saveBase64Image(screenshot, 'deposit_receipt');
      } catch (uploadErr) {
        console.warn('Screenshot upload skipped/failed:', uploadErr);
      }
    }

    // 1. Fetch current player balances from User table
    const { data: playerUser, error: userFetchErr } = await supabaseAdmin
      .from('User')
      .select('id, walletBalance, winningBalance, name, email')
      .eq('id', userId)
      .single();

    if (userFetchErr || !playerUser) {
      return NextResponse.json({ message: 'Player account not found in database.' }, { status: 404 });
    }

    const currentWallet = Number(playerUser.walletBalance || 0);
    const currentWinning = Number(playerUser.winningBalance || 0);
    const newWalletBalance = currentWallet + numAmount;
    const newWinningBalance = currentWinning + numAmount;

    // 2. INSTANT AUTO-CREDIT: Add deposit amount directly to player's wallet
    const { error: balanceUpdateErr } = await supabaseAdmin
      .from('User')
      .update({
        walletBalance: newWalletBalance,
        winningBalance: newWinningBalance,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (balanceUpdateErr) {
      console.error('[POST /api/wallet/deposit] Failed to auto-credit balance:', balanceUpdateErr);
    }

    // 3. Create Payment record with PENDING status (marked as Auto-Credited)
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newPayment = {
      id: paymentId,
      userId,
      userName: userName || playerUser.name || 'Player',
      userEmail: userEmail || playerUser.email || '',
      method,
      amount: numAmount,
      trxId: trimmedTrx,
      screenshot: screenshotUrl,
      status: 'PENDING', // Pending Admin Final Verification
      walletType: 'WINNING',
      notes: `Instant Auto-Credited ৳${numAmount} on submission. Pending Admin Review.`,
      communityAccessUnlocked: false,
      communityAccessRevoked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let paymentRecord: Record<string, any> = { ...newPayment };
    let createdPayment: any = null;
    let success = false;
    let attempts = 6;

    while (!success && attempts > 0) {
      const { data, error: paymentError } = await supabaseAdmin
        .from('Payment')
        .insert([paymentRecord])
        .select()
        .maybeSingle();

      if (!paymentError) {
        createdPayment = data || paymentRecord;
        success = true;
        break;
      }

      const fullErrStr = `${paymentError.message || ''} ${paymentError.details || ''}`;
      const match = fullErrStr.match(/Could not find the '([^']+)' column/i) ||
                    fullErrStr.match(/column '([^']+)' does not exist/i) ||
                    fullErrStr.match(/column "([^"]+)" does not exist/i);

      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`[POST /api/wallet/deposit] Omission of column '${missingCol}' due to schema cache.`);
        delete paymentRecord[missingCol];
        attempts--;
        continue;
      }

      throw new Error(paymentError.message);
    }

    // 4. Send Instant In-App Notification to Player
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: userId,
        title: `৳${numAmount} ডিপোজিট ইনস্ট্যান্ট জমা হয়েছে! ⚡`,
        message: `আপনার ${method} ডিপোজিট (TrxID: ${trimmedTrx}) সাবমিট করায় ৳${numAmount} তাৎক্ষণিকভাবে আপনার ওয়ালেটে যোগ করা হয়েছে। এডমিন প্যানেল থেকে এটি রিভিউ করা হচ্ছে।`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      success: true,
      payment: createdPayment,
      newWalletBalance,
      message: `৳${numAmount} ইনস্ট্যান্ট আপনার ওয়ালেটে যোগ হয়ে গেছে! আপনি এখনই টুর্নামেন্টে জয়েন করতে পারবেন। এডমিন প্যানেল থেকে ট্রানজেকশনটি রিভিউ করা হচ্ছে।`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/wallet/deposit]', error);
    return NextResponse.json({ message: error?.message || 'Failed to submit deposit.' }, { status: 500 });
  }
}
