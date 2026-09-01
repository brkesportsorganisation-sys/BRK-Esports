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

    // 1. Fetch current player from User table
    const { data: playerUser, error: userFetchErr } = await supabaseAdmin
      .from('User')
      .select('id, walletBalance, winningBalance, name, email')
      .eq('id', userId)
      .single();

    if (userFetchErr || !playerUser) {
      return NextResponse.json({ message: 'Player account not found in database.' }, { status: 404 });
    }

    const currentWallet = Number(playerUser.walletBalance || 0);

    // 2. Create Payment record with PENDING status (Admin Verification Required)
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
      status: 'PENDING', // All deposits require verification before crediting
      walletType: 'WINNING',
      notes: `[Deposit Request: ৳${numAmount} via ${method}] TrxID: ${trimmedTrx}. Pending verification.`,
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
      } else {
        const errorMsg = paymentError.message || '';
        const match = errorMsg.match(/column "([^"]+)" of relation "Payment" does not exist/i) ||
                      errorMsg.match(/Could not find the '([^']+)' column of 'Payment'/i);

        if (match && match[1]) {
          const missingCol = match[1];
          delete paymentRecord[missingCol];
          attempts--;
        } else {
          console.warn('[POST /api/wallet/deposit] Insert warning, using local fallback:', paymentError);
          createdPayment = paymentRecord;
          success = true;
        }
      }
    }

    // 3. Send In-App Notification to Player
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: userId,
        title: `ডিপোজিট রিকোয়েস্ট জমা হয়েছে (৳${numAmount}) ⏳`,
        message: `আপনার ${method} ডিপোজিট (TrxID: ${trimmedTrx}) সাবমিট হয়েছে। এডমিন ভেরিফাই করে অ্যাপ্রুভ করার সাথে সাথে আপনার ওয়ালেটে ৳${numAmount} যোগ হয়ে যাবে।`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      success: true,
      payment: createdPayment,
      isAutoCredited: false,
      newWalletBalance: currentWallet,
      message: `আপনার ৳${numAmount} ডিপোজিট রিকোয়েস্টটি সফলভাবে জমা হয়েছে। এডমিন TrxID ভেরিফাই করে অ্যাপ্রুভ করার সাথে সাথে আপনার ওয়ালেটে ব্যালেন্স যোগ হবে।`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/wallet/deposit]', error);
    return NextResponse.json({ message: error?.message || 'Failed to submit deposit.' }, { status: 500 });
  }
}
