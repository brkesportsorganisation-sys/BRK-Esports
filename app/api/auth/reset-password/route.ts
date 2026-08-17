import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: 'Email, 6-digit OTP, and new password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();
    const trimmedPassword = newPassword.trim();

    if (trimmedPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Fetch user from Supabase
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (fetchErr || !user) {
      return NextResponse.json({ message: 'No registered user found with this email.' }, { status: 404 });
    }

    // 2. Validate OTP and expiration
    if (!user.passwordResetOtp || user.passwordResetOtp !== trimmedOtp) {
      return NextResponse.json({ message: 'Invalid 6-digit verification code. Please check and try again.' }, { status: 400 });
    }

    if (user.passwordResetExpires) {
      const expiry = new Date(user.passwordResetExpires).getTime();
      const now = Date.now();
      if (now > expiry) {
        return NextResponse.json({ message: 'Verification code has expired. Please request a new OTP.' }, { status: 400 });
      }
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    // 4. Update user in Supabase
    const { error: updateErr } = await supabaseAdmin
      .from('User')
      .update({
        password: hashedPassword,
        passwordResetOtp: null,
        passwordResetExpires: null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    // 5. Send in-app notification
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin.from('Notification').insert([{
      id: notifId,
      userId: user.id,
      title: 'Password Changed Successfully 🔒',
      message: 'Your account password was recently reset via email OTP verification.',
      type: 'SYSTEM',
      link: '/profile',
      isRead: false,
      createdAt: new Date().toISOString(),
    }]);

    const { password: _, ...sanitizedUser } = user;

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully! You can now sign in with your new password.',
      user: sanitizedUser,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[POST /api/auth/reset-password]', error);
    return NextResponse.json({ message: error?.message || 'Failed to reset password.' }, { status: 500 });
  }
}
