import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // Exact 24 hours
const STREAK_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours to maintain streak

const STREAK_REWARDS = [
  { day: 1, label: '+15 Coins', type: 'COINS', value: 15 },
  { day: 2, label: '+25 Coins', type: 'COINS', value: 25 },
  { day: 3, label: '+40 Coins + Spin Ticket', type: 'COINS', value: 40 },
  { day: 4, label: '+50 Coins', type: 'COINS', value: 50 },
  { day: 5, label: '+75 Coins', type: 'COINS', value: 75 },
  { day: 6, label: '+100 Mega Coins', type: 'COINS', value: 100 },
  { day: 7, label: '৳10 Real Cash Bonus', type: 'WALLET', value: 10 },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    const now = Date.now();
    let canClaimStreak = true;
    let remainingSeconds = 0;
    let nextClaimAvailableAt: string | null = null;
    let currentStreakDay = user.currentStreak || 1;

    if (user.lastStreakClaimDate) {
      const lastClaimTime = new Date(user.lastStreakClaimDate).getTime();
      const timeSinceLastClaim = now - lastClaimTime;
      const nextClaimTime = lastClaimTime + COOLDOWN_MS;

      if (timeSinceLastClaim < COOLDOWN_MS) {
        canClaimStreak = false;
        remainingSeconds = Math.ceil((nextClaimTime - now) / 1000);
        nextClaimAvailableAt = new Date(nextClaimTime).toISOString();
      } else {
        canClaimStreak = true;
        remainingSeconds = 0;
        // If user waited more than 48h since last claim, streak resets to Day 1
        if (timeSinceLastClaim > STREAK_EXPIRY_MS) {
          currentStreakDay = 1;
        } else {
          // Ready to claim next day!
          currentStreakDay = (user.currentStreak % 7) + 1;
        }
      }
    }

    if (currentStreakDay > 7 || currentStreakDay < 1) currentStreakDay = 1;

    return NextResponse.json({
      success: true,
      currentStreakDay,
      canClaimStreak,
      remainingSeconds,
      nextClaimAvailableAt,
      streakRewards: STREAK_REWARDS,
      dailyQuests: [
        { id: 'q_tour', title: 'Play in 1 Free Fire Tournament Match', rewardCoins: 50, isCompleted: false },
        { id: 'q_ad', title: 'Watch 2 Video Ads in Rewards Hub', rewardCoins: 30, isCompleted: true },
        { id: 'q_spin', title: 'Spin the Lucky Lottery Wheel', rewardCoins: 20, isCompleted: false },
      ]
    });
  } catch (error: any) {
    console.error('[GET /api/user/quests]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch quests.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ message: 'User ID and action are required.' }, { status: 400 });
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

    const now = Date.now();

      // Handle Daily Login Streak Claim
    if (action === 'CLAIM_STREAK') {
      const claimNowIso = new Date().toISOString();

      if (user.lastStreakClaimDate) {
        const lastClaimTime = new Date(user.lastStreakClaimDate).getTime();
        const timeSinceLastClaim = now - lastClaimTime;

        if (timeSinceLastClaim < COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastClaim) / 1000);
          const hours = Math.floor(remainingSeconds / 3600);
          const mins = Math.floor((remainingSeconds % 3600) / 60);
          return NextResponse.json({ 
            message: `আজকে ইতিমধ্যেই ডেইলি রিওয়ার্ড ক্লেইম করা হয়েছে! পরবর্তী ক্লেইমের জন্য আরও ${hours} ঘণ্টা ${mins} মিনিট অপেক্ষা করতে হবে।`,
            canClaimStreak: false,
            remainingSeconds,
          }, { status: 400 });
        }
      }

      // Calculate streak day progression
      let streakDay = 1;
      if (user.lastStreakClaimDate) {
        const lastClaimTime = new Date(user.lastStreakClaimDate).getTime();
        const timeSinceLastClaim = now - lastClaimTime;

        if (timeSinceLastClaim > STREAK_EXPIRY_MS) {
          streakDay = 1; // Expired streak resets to Day 1
        } else {
          streakDay = ((user.currentStreak || 0) % 7) + 1;
        }
      } else {
        streakDay = 1;
      }

      const reward = STREAK_REWARDS[streakDay - 1] || STREAK_REWARDS[0];

      let newCoinBal = Number(user.coinBalance || 0);
      let newWalletBal = Number(user.walletBalance || 0);
      let newEarnings = Number(user.earnings || 0);

      if (reward.type === 'WALLET') {
        newWalletBal += reward.value;
        newEarnings += reward.value;
      } else {
        newCoinBal += reward.value;
      }

      // Safe update to Supabase including currentStreak and lastStreakClaimDate
      try {
        await supabaseAdmin
          .from('User')
          .update({
            coinBalance: newCoinBal,
            walletBalance: newWalletBal,
            earnings: newEarnings,
            currentStreak: streakDay,
            lastStreakClaimDate: claimNowIso,
            updatedAt: claimNowIso,
          })
          .eq('id', userId);
      } catch (e) {
        console.warn('Supabase user balance update warning:', e);
      }

      // Update in local DB with streak fields
      const updatedUser = {
        ...user,
        coinBalance: newCoinBal,
        walletBalance: newWalletBal,
        earnings: newEarnings,
        currentStreak: streakDay,
        lastStreakClaimDate: claimNowIso,
        updatedAt: claimNowIso,
      };

      db.updateUser(userId, updatedUser);

      const { password: _, ...sanitizedUser } = updatedUser;

      return NextResponse.json({
        success: true,
        message: `Claimed Day ${streakDay} Streak Reward: ${reward.label}! 🎉`,
        reward,
        user: sanitizedUser,
        currentStreakDay: streakDay,
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
