import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ message: 'Email and 6-digit OTP code are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.toString().trim();

    if (trimmedOtp.length !== 6) {
      return NextResponse.json({ message: 'Please enter a valid 6-digit OTP code.' }, { status: 400 });
    }

    // 1. Fetch OTP record from SiteSetting resilient store
    const otpKey = `otp_reset_${trimmedEmail}`;
    const { data: settingRecord } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', otpKey)
      .maybeSingle();

    let validOtpFound = false;
    let otpPayload: any = null;

    if (settingRecord && settingRecord.value) {
      try {
        otpPayload = JSON.parse(settingRecord.value);
        if (otpPayload.otp === trimmedOtp) {
          const expiryTime = new Date(otpPayload.expiresAt).getTime();
          if (Date.now() <= expiryTime) {
            validOtpFound = true;
          } else {
            return NextResponse.json({ message: 'OTP code has expired. Please request a new code.' }, { status: 400 });
          }
        }
      } catch {}
    }

    // 2. Also fallback-check User table safely if needed
    if (!validOtpFound) {
      try {
        const { data: user } = await supabaseAdmin
          .from('User')
          .select('id, name, email')
          .ilike('email', trimmedEmail)
          .maybeSingle();

        if (!user) {
          return NextResponse.json({ message: 'No registered user found with this email.' }, { status: 404 });
        }
      } catch {}
    }

    if (!validOtpFound) {
      return NextResponse.json({ message: 'Invalid 6-digit verification code. Please check your email and try again.' }, { status: 400 });
    }

    // 3. Mark OTP as verified in SiteSetting so Step 3 can proceed securely
    const verifiedToken = `vt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: `setting_${otpKey}`,
        key: otpKey,
        value: JSON.stringify({
          otp: trimmedOtp,
          verified: true,
          verifiedToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      verified: true,
      verifiedToken,
      message: 'OTP verification successful! You can now set your new password.',
    }, { status: 200 });

  } catch (error: any) {
    console.error('[POST /api/auth/verify-otp]', error);
    return NextResponse.json({ message: error?.message || 'Failed to verify OTP.' }, { status: 500 });
  }
}
