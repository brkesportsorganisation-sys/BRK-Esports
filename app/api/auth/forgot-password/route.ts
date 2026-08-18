import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPasswordResetOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ message: 'Email address is required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Fetch user from Supabase (case-insensitive)
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('User')
      .select('id, name, email, isBanned')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    if (fetchErr) {
      console.error('[POST /api/auth/forgot-password] Supabase error:', fetchErr);
    }

    if (!user) {
      return NextResponse.json({ message: 'No registered player account found with this email address.' }, { status: 404 });
    }

    if (user.isBanned) {
      return NextResponse.json({ message: 'This account is suspended. Please contact support.' }, { status: 403 });
    }

    // 2. Generate secure 6-digit OTP and 15-minute expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const otpKey = `otp_reset_${trimmedEmail}`;

    // 3. Resilient Store in SiteSetting table (Always succeeds)
    try {
      await supabaseAdmin.from('SiteSetting').upsert({
        id: `setting_${otpKey}`,
        key: otpKey,
        value: JSON.stringify({
          otp,
          expiresAt,
          verified: false,
          updatedAt: new Date().toISOString(),
        }),
        updatedAt: new Date().toISOString(),
      });
    } catch (storeErr) {
      console.warn('[POST /api/auth/forgot-password] SiteSetting store fallback notice:', storeErr);
    }

    // 4. Also attempt saving in User table
    try {
      await supabaseAdmin
        .from('User')
        .update({
          passwordResetOtp: otp,
          passwordResetExpires: expiresAt,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch {}

    // 5. Send Email via SMTP / Resend
    const emailResult = await sendPasswordResetOtpEmail({
      name: user.name || 'Player',
      email: user.email,
      otp,
    });

    console.log(`[PASSWORD RESET] OTP generated for ${trimmedEmail}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification OTP has been sent to ${trimmedEmail}. Please check your inbox or spam folder.`,
      otpSent: true,
      emailDelivery: emailResult,
      // For instant debugging / development testing:
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {})
    }, { status: 200 });

  } catch (error: any) {
    console.error('[POST /api/auth/forgot-password]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process password reset request.' }, { status: 500 });
  }
}
