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

    let meta: Record<string, any> = {};
    if (rest.deviceToken && typeof rest.deviceToken === 'string') {
      try {
        if (rest.deviceToken.startsWith('META:')) {
          meta = JSON.parse(rest.deviceToken.replace('META:', '')) || {};
        } else if (rest.deviceToken.startsWith('STREAK:')) {
          meta = JSON.parse(rest.deviceToken.replace('STREAK:', '')) || {};
        } else if (rest.deviceToken.startsWith('{')) {
          meta = JSON.parse(rest.deviceToken) || {};
        }
      } catch {}
    }

    let lastStreakClaimDate = rest.lastStreakClaimDate || null;
    let currentStreak = Number(rest.currentStreak) || 0;

    if (!lastStreakClaimDate && meta.lastStreakClaimDate) {
      lastStreakClaimDate = meta.lastStreakClaimDate;
    }
    if (meta.currentStreak !== undefined && !rest.currentStreak) {
      currentStreak = Number(meta.currentStreak);
    }

    const inGameRole = rest.inGameRole || meta.inGameRole || 'RUSHER';

    const userReferralCode = rest.referralCode || `REF_${(rest.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || Math.floor(1000 + Math.random() * 9000)}`;
    if (!rest.referralCode && rest.id) {
      try {
        await supabaseAdmin.from('User').update({ referralCode: userReferralCode }).eq('id', rest.id);
      } catch {}
    }

    const sanitizedUser = {
      ...rest,
      inGameRole,
      referralCode: userReferralCode,
      totalReferrals: Number(rest.totalReferrals) || 0,
      claimedMilestones: Array.isArray(rest.claimedMilestones) ? rest.claimedMilestones : [],
      currentStreak,
      lastStreakClaimDate,
      accountNumber: rest.accountNumber || `EZBD-${(rest.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || Math.floor(100000 + Math.random() * 900000)}`,
    };
    return NextResponse.json({ user: sanitizedUser });
  } catch (error: any) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch user.' }, { status: 500 });
  }
}
