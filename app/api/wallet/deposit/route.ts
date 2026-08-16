import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { saveBase64Image } from '@/lib/upload';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userEmail, method, amount, trxId, screenshot } = body;

    if (!userId || !method || !amount || !trxId) {
      return NextResponse.json({ message: 'User ID, payment method, amount, and TrxID are required.' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ message: 'Please enter a valid amount.' }, { status: 400 });
    }

    // Check duplicate TrxID in Supabase Payment table
    const { data: existingTrx } = await supabaseAdmin
      .from('Payment')
      .select('id')
      .eq('trxId', trxId.trim())
      .maybeSingle();

    if (existingTrx) {
      return NextResponse.json({ message: 'A transaction with this TrxID has already been submitted.' }, { status: 409 });
    }

    // Upload screenshot if base64 provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        screenshotUrl = await saveBase64Image(screenshot, 'receipt');
      } catch (uploadErr) {
        console.warn('Screenshot upload skipped/failed:', uploadErr);
      }
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newPayment = {
      id: paymentId,
      userId,
      userName: userName || 'Player',
      userEmail: userEmail || '',
      method,
      amount: numAmount,
      trxId: trxId.trim(),
      screenshot: screenshotUrl,
      status: 'PENDING',
      notes: 'Wallet Topup / Deposit',
      communityAccessUnlocked: false,
      communityAccessRevoked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data: createdPayment, error: paymentError } = await supabaseAdmin
      .from('Payment')
      .insert([newPayment])
      .select()
      .single();

    if (paymentError) {
      throw new Error(paymentError.message);
    }

    return NextResponse.json({
      payment: createdPayment,
      message: 'Deposit request submitted successfully! Your balance will be updated once verified by admin.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/wallet/deposit]', error);
    return NextResponse.json({ message: error?.message || 'Failed to submit deposit.' }, { status: 500 });
  }
}
