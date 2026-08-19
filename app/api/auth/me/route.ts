import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id') || request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    let user: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('User')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        user = data;
      }
    } catch {}

    if (!user) {
      user = db.getUserById ? db.getUserById(userId) : null;
    }

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const { password: _, passwordResetOtp: __, passwordResetExpires: ___, ...rest } = user;

    let currentStreak = Number(rest.currentStreak || 0);
    let lastStreakClaimDate = rest.lastStreakClaimDate || null;

    if (!lastStreakClaimDate && rest.deviceToken && typeof rest.deviceToken === 'string' && rest.deviceToken.startsWith('STREAK:')) {
      try {
        const parsed = JSON.parse(rest.deviceToken.replace('STREAK:', ''));
        if (parsed.currentStreak !== undefined) currentStreak = Number(parsed.currentStreak);
        if (parsed.lastStreakClaimDate) lastStreakClaimDate = parsed.lastStreakClaimDate;
      } catch {}
    }

    const sanitizedUser = {
      ...rest,
      currentStreak,
      lastStreakClaimDate,
      accountNumber: rest.accountNumber || `BRK-${(rest.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || Math.floor(100000 + Math.random() * 900000)}`,
    };
    return NextResponse.json({ user: sanitizedUser });
  } catch (error: any) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch user.' }, { status: 500 });
  }
}
