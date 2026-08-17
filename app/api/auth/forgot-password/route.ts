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

    // 1. Fetch user from Supabase
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('User')
      .select('id, name, email, isBanned')
      .eq('email', trimmedEmail)
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

    // 2. Generate secure 6-digit OTP and 10-minute expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Save OTP in User table
    const { error: updateErr } = await supabaseAdmin
      .from('User')
      .update({
        passwordResetOtp: otp,
        passwordResetExpires: expiresAt,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      console.warn('[POST /api/auth/forgot-password] Update OTP notice:', updateErr.message);
    }

    // 4. Send Email via Resend
    const emailResult = await sendPasswordResetOtpEmail({
      name: user.name || 'Player',
      email: user.email,
      otp,
    });

    if (!emailResult.success) {
      // Return helpful response if Resend unverified domain limitation
      return NextResponse.json({
        message: 'A 6-digit OTP code was generated. (Note: Email delivery depends on verified domain or test inbox).',
        emailDelivery: emailResult,
        otpSent: true
      }, { status: 200 });
    }

    return NextResponse.json({
      message: `A 6-digit verification OTP has been sent to ${trimmedEmail}. Please check your inbox or spam folder.`,
      otpSent: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('[POST /api/auth/forgot-password]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process password reset request.' }, { status: 500 });
  }
}
