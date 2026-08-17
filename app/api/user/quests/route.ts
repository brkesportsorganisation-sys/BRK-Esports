import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select('id, coinBalance, walletBalance, currentStreak, lastStreakClaimDate')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const lastClaim = user.lastStreakClaimDate ? user.lastStreakClaimDate.split('T')[0] : null;
    const canClaimStreak = lastClaim !== todayStr;

    let currentStreakDay = user.currentStreak || 1;
    if (currentStreakDay > 7) currentStreakDay = 1;

    return NextResponse.json({
      success: true,
      currentStreakDay,
      canClaimStreak,
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
    const { userId, action, questId } = body;

    if (!userId || !action) {
      return NextResponse.json({ message: 'User ID and action are required.' }, { status: 400 });
    }

    const { data: user, error: userErr } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Handle Daily Login Streak Claim
    if (action === 'CLAIM_STREAK') {
      const lastClaim = user.lastStreakClaimDate ? user.lastStreakClaimDate.split('T')[0] : null;
      if (lastClaim === todayStr) {
        return NextResponse.json({ message: 'You have already claimed today\'s login streak reward!' }, { status: 400 });
      }

      let streakDay = (user.currentStreak || 0) + 1;
      if (streakDay > 7) streakDay = 1;

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

      const { data: updatedUser, error: updateErr } = await supabaseAdmin
        .from('User')
        .update({
          coinBalance: newCoinBal,
          walletBalance: newWalletBal,
          earnings: newEarnings,
          currentStreak: streakDay,
          lastStreakClaimDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      const { password: _, ...sanitizedUser } = updatedUser;

      return NextResponse.json({
        success: true,
        message: `Claimed Day ${streakDay} Streak Reward: ${reward.label}! 🎉`,
        reward,
        user: sanitizedUser,
        currentStreakDay: streakDay,
        canClaimStreak: false,
      });
    }

    return NextResponse.json({ message: 'Unknown quest action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/user/quests]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process quest.' }, { status: 500 });
  }
}
