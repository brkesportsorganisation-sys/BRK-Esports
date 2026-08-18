import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, verifiedToken, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ message: 'Email and new password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = newPassword.trim();

    if (trimmedPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Fetch user from Supabase (case-insensitive)
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('User')
      .select('id, name, email')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    if (fetchErr || !user) {
      return NextResponse.json({ message: 'No registered user found with this email.' }, { status: 404 });
    }

    // 2. Validate OTP or verifiedToken from SiteSetting resilient store
    const otpKey = `otp_reset_${trimmedEmail}`;
    let isAuthorized = false;

    const { data: settingRecord } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', otpKey)
      .maybeSingle();

    if (settingRecord && settingRecord.value) {
      try {
        const payload = JSON.parse(settingRecord.value);
        const expiryTime = new Date(payload.expiresAt).getTime();
        
        if (Date.now() <= expiryTime) {
          if (payload.verified || (verifiedToken && payload.verifiedToken === verifiedToken) || (otp && payload.otp === otp.toString().trim())) {
            isAuthorized = true;
          }
        }
      } catch {}
    }

    if (!isAuthorized) {
      return NextResponse.json({ message: 'Invalid or unverified OTP session. Please verify your OTP code first.' }, { status: 400 });
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    // 4. Update user password in Supabase
    const { error: updateErr } = await supabaseAdmin
      .from('User')
      .update({
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    // 5. Clean up OTP record from SiteSetting
    try {
      await supabaseAdmin
        .from('SiteSetting')
        .delete()
        .eq('key', otpKey);
    } catch {}

    // 6. Send in-app confirmation notification (safely)
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: user.id,
        title: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে 🔒',
        message: 'আপনার BRK Esports একাউন্টের পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! আপনি এখন নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।',
    }, { status: 200 });

  } catch (error: any) {
    console.error('[POST /api/auth/reset-password]', error);
    return NextResponse.json({ message: error?.message || 'Failed to reset password.' }, { status: 500 });
  }
}
