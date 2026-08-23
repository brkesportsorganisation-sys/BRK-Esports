import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // Exact 24 hours
const DAILY_LOGIN_REWARD_COINS = 20;

function getUserStreakInfo(user: any) {
  let lastStreakClaimDate = user.lastStreakClaimDate || null;

  // Fallback check in deviceToken if columns are not yet in Supabase
  if (!lastStreakClaimDate && user.deviceToken && typeof user.deviceToken === 'string' && user.deviceToken.startsWith('STREAK:')) {
    try {
      const parsed = JSON.parse(user.deviceToken.replace('STREAK:', ''));
      if (parsed.lastStreakClaimDate) lastStreakClaimDate = parsed.lastStreakClaimDate;
    } catch {}
  }

  return { lastStreakClaimDate };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required. Please login to view daily rewards.' }, { status: 401 });
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
      return NextResponse.json({ success: false, message: 'User not found. Please log in.' }, { status: 404 });
    }

    const { lastStreakClaimDate } = getUserStreakInfo(user);

    const now = Date.now();
    let canClaimStreak = true;
    let remainingSeconds = 0;
    let nextClaimAvailableAt: string | null = null;

    if (lastStreakClaimDate) {
      const lastClaimTime = new Date(lastStreakClaimDate).getTime();
      const timeSinceLastClaim = now - lastClaimTime;
      const nextClaimTime = lastClaimTime + COOLDOWN_MS;

      if (timeSinceLastClaim < COOLDOWN_MS) {
        canClaimStreak = false;
        remainingSeconds = Math.max(0, Math.ceil((nextClaimTime - now) / 1000));
        nextClaimAvailableAt = new Date(nextClaimTime).toISOString();
      } else {
        canClaimStreak = true;
        remainingSeconds = 0;
      }
    }

    return NextResponse.json({
      success: true,
      canClaimStreak,
      remainingSeconds,
      rewardCoins: DAILY_LOGIN_REWARD_COINS,
      lastStreakClaimDate,
      nextClaimAvailableAt,
    });
  } catch (error: any) {
    console.error('Error fetching quests info:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve daily login reward' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 401 });
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
      return NextResponse.json({ success: false, message: 'একাউন্ট পাওয়া যায়নি। অনুগ্রহ করে লগইন করুন।' }, { status: 404 });
    }

    const { lastStreakClaimDate } = getUserStreakInfo(user);
    const now = Date.now();

    // Handle Daily Login Claim (20 Coins)
    if (action === 'CLAIM_STREAK' || action === 'CLAIM_DAILY_LOGIN') {
      const claimNowIso = new Date().toISOString();

      if (lastStreakClaimDate) {
        const lastClaimTime = new Date(lastStreakClaimDate).getTime();
        const timeSinceLastClaim = now - lastClaimTime;

        if (timeSinceLastClaim < COOLDOWN_MS) {
          const remainingSeconds = Math.max(1, Math.ceil((COOLDOWN_MS - timeSinceLastClaim) / 1000));
          const hours = Math.floor(remainingSeconds / 3600);
          const mins = Math.floor((remainingSeconds % 3600) / 60);
          return NextResponse.json({ 
            success: false,
            message: `আজকে ইতিমধ্যেই আপনার ডেইলি লগইন রিওয়ার্ড (২০ কয়েন) ক্লেইম করা হয়েছে! পরবর্তী ক্লেইম করতে বাকি: ${hours > 0 ? `${hours} ঘণ্টা ` : ''}${mins} মিনিট।`,
            canClaimStreak: false,
            remainingSeconds,
          }, { status: 400 });
        }
      }

      const rewardValue = DAILY_LOGIN_REWARD_COINS;
      let newCoinBal = Number(user.coinBalance || 0) + rewardValue;

      const fallbackStreakStr = `STREAK:${JSON.stringify({ lastStreakClaimDate: claimNowIso })}`;

      // Safe update to Supabase
      try {
        const { error } = await supabaseAdmin
          .from('User')
          .update({
            coinBalance: newCoinBal,
            lastStreakClaimDate: claimNowIso,
            updatedAt: claimNowIso,
          })
          .eq('id', userId);

        if (error) {
          console.warn('Supabase update with lastStreakClaimDate failed, using fallback:', error.message);
          await supabaseAdmin
            .from('User')
            .update({
              coinBalance: newCoinBal,
              deviceToken: fallbackStreakStr,
              updatedAt: claimNowIso,
            })
            .eq('id', userId);
        }
      } catch (e) {
        console.warn('Supabase user balance update warning:', e);
      }

      // Update in local DB with claim fields
      const updatedUser = {
        ...user,
        coinBalance: newCoinBal,
        lastStreakClaimDate: claimNowIso,
        deviceToken: fallbackStreakStr,
        updatedAt: claimNowIso,
      };

      db.updateUser(userId, updatedUser);

      const { password: _, ...sanitizedUser } = updatedUser;

      return NextResponse.json({
        success: true,
        message: 'অভিনন্দন! আপনার একাউন্টে ২০ কয়েন সফলভাবে যোগ করা হয়েছে! 🎉',
        reward: { label: '+20 Coins', type: 'COINS', value: 20 },
        user: sanitizedUser,
        canClaimStreak: false,
        remainingSeconds: COOLDOWN_MS / 1000,
        nextClaimAvailableAt: new Date(now + COOLDOWN_MS).toISOString(),
      });
    }

    return NextResponse.json({ message: 'Unknown quest action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/user/quests]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process quest.' }, { status: 500 });
  }
}
