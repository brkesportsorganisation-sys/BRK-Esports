import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user by email from Supabase
    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (error) {
      console.error('[POST /api/auth/login] Supabase error:', error);
      throw new Error(error.message);
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json({ message: 'This account has been banned. Please contact support.' }, { status: 403 });
    }

    // Verify password
    let passwordMatches = false;
    let needsHashUpgrade = false;

    if (user.password) {
      // Check bcrypt hash
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        passwordMatches = await bcrypt.compare(password, user.password);
      } else {
        // Plaintext match for initial/migrated users
        passwordMatches = user.password === password;
        if (passwordMatches) {
          needsHashUpgrade = true;
        }
      }
    }

    if (!passwordMatches) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // Automatically upgrade plaintext password to bcrypt hash in database
    if (needsHashUpgrade) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await supabaseAdmin
          .from('User')
          .update({ password: hashedPassword, updatedAt: new Date().toISOString() })
          .eq('id', user.id);
      } catch (hashErr) {
        console.warn('[Login] Password hash upgrade notice:', hashErr);
      }
    }

    // Sanitize response
    const { password: _, passwordResetOtp: __, passwordResetExpires: ___, ...sanitizedUser } = user;
    return NextResponse.json({ user: sanitizedUser, message: 'Logged in successfully' });
  } catch (error: any) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ message: error?.message || 'Login failed.' }, { status: 500 });
  }
}
