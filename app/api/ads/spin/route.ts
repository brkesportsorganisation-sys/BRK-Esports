import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LotteryRewardItem, RewardsHubSettings } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    // 1. Fetch User from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // 2. Fetch Rewards & Lottery Settings from SiteSetting
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ad_settings')
      .maybeSingle();

    let settings: RewardsHubSettings = {
      isWatchEarnActive: true,
      isLotteryActive: true,
      dailyAdLimit: 10,
      dailySpinLimit: 5,
      spinCoinCost: 20,
      coinsToBdtRatio: 50,
      minCoinsToConvert: 50,
      ads: [],
      lotteryRewards: [
        { id: '1', label: '15 Coins', type: 'COINS', value: 15, probabilityPercent: 30, currentWonCount: 0, color: '#F59E0B', isActive: true },
        { id: '2', label: '৳ 5 Real Cash', type: 'WALLET', value: 5, probabilityPercent: 15, maxWinnersLimit: 100, currentWonCount: 0, color: '#10B981', isActive: true },
        { id: '3', label: '35 Coins', type: 'COINS', value: 35, probabilityPercent: 20, currentWonCount: 0, color: '#EC4899', isActive: true },
        { id: '4', label: 'Better Luck Next Time', type: 'TRY_AGAIN', value: 0, probabilityPercent: 15, currentWonCount: 0, color: '#64748B', isActive: true },
        { id: '5', label: '75 Mega Coins', type: 'COINS', value: 75, probabilityPercent: 10, currentWonCount: 0, color: '#8B5CF6', isActive: true },
        { id: '6', label: '৳ 20 bKash Cash', type: 'WALLET', value: 20, probabilityPercent: 5, maxWinnersLimit: 25, currentWonCount: 0, color: '#3B82F6', isActive: true },
        { id: '7', label: '10 Coins', type: 'COINS', value: 10, probabilityPercent: 4, currentWonCount: 0, color: '#F97316', isActive: true },
        { id: '8', label: '💎 100 Diamonds Jackpot', type: 'DIAMONDS', value: 100, probabilityPercent: 1, maxWinnersLimit: 5, currentWonCount: 0, color: '#06B6D4', isActive: true },
      ]
    };

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        settings = { ...settings, ...parsed };
      } catch {}
    }

    if (!settings.isLotteryActive) {
      return NextResponse.json({ message: 'Lottery wheel is currently paused by admin.' }, { status: 400 });
    }

    const paymentMethod: 'COINS' | 'CASH' = body.paymentMethod === 'CASH' ? 'CASH' : 'COINS';
    const spinPaymentMode = settings.spinPaymentMode || 'BOTH';

    if (paymentMethod === 'CASH' && spinPaymentMode === 'COINS_ONLY') {
      return NextResponse.json({ message: 'Cash spin is currently disabled by admin.' }, { status: 400 });
    }
    if (paymentMethod === 'COINS' && spinPaymentMode === 'CASH_ONLY') {
      return NextResponse.json({ message: 'Coin spin is currently disabled by admin.' }, { status: 400 });
    }

    const coinCost = Number(settings.spinCoinCost ?? 20);
    const cashCost = Number(settings.spinCashCost ?? 10);
    const userCoinBal = Number(user.coinBalance || 0);
    const userWalletBal = Number(user.walletBalance || 0);

    // 3. Verify Balance
    if (paymentMethod === 'CASH') {
      if (cashCost > 0 && userWalletBal < cashCost) {
        return NextResponse.json({ 
          message: `Insufficient wallet balance. You need ৳${cashCost} to spin the lottery wheel.` 
        }, { status: 400 });
      }
    } else {
      if (coinCost > 0 && userCoinBal < coinCost) {
        return NextResponse.json({ 
          message: `Insufficient coins. You need ${coinCost} coins to spin the lottery wheel.` 
        }, { status: 400 });
      }
    }

    // 4. Filter Available Rewards (Active & Under Quota)
    const allRewards = settings.lotteryRewards || [];
    const eligibleRewards = allRewards.filter(r => {
      if (!r.isActive) return false;
      if (r.maxWinnersLimit && (r.currentWonCount || 0) >= r.maxWinnersLimit) {
        return false; // Quota reached for this prize!
      }
      return true;
    });

    if (eligibleRewards.length === 0) {
      return NextResponse.json({ message: 'No active prizes available.' }, { status: 400 });
    }

    // 5. Weighted Random Probability Draw
    const totalWeight = eligibleRewards.reduce((sum, r) => sum + Math.max(1, Number(r.probabilityPercent) || 1), 0);
    let randomNum = Math.random() * totalWeight;
    let selectedReward: LotteryRewardItem = eligibleRewards[0];

    for (const reward of eligibleRewards) {
      const weight = Math.max(1, Number(reward.probabilityPercent) || 1);
      if (randomNum < weight) {
        selectedReward = reward;
        break;
      }
      randomNum -= weight;
    }

    // Find index in active rewards list for client wheel rendering
    const activeRewards = allRewards.filter(r => r.isActive !== false);
    const winningIndex = activeRewards.findIndex(r => r.id === selectedReward.id);

    // 6. Update User Balance in Supabase
    const prizeValue = Number(selectedReward.value || 0);
    let newCoinBalance = userCoinBal;
    let newWalletBalance = userWalletBal;
    let newEarnings = Number(user.earnings || 0);

    if (paymentMethod === 'CASH') {
      newWalletBalance -= cashCost;
    } else {
      newCoinBalance -= coinCost;
    }

    if (selectedReward.type === 'WALLET' && prizeValue > 0) {
      newWalletBalance += prizeValue;
      newEarnings += prizeValue;
    } else if (selectedReward.type === 'COINS' && prizeValue > 0) {
      newCoinBalance += prizeValue;
    } else if (selectedReward.type === 'DIAMONDS' && prizeValue > 0) {
      newCoinBalance += prizeValue;
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('User')
      .update({
        coinBalance: Math.max(0, newCoinBalance),
        walletBalance: Math.max(0, newWalletBalance),
        earnings: Math.max(0, newEarnings),
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    // 7. Update Winner Count in Settings if applicable
    try {
      const updatedLotteryRewards = allRewards.map(r => {
        if (r.id === selectedReward.id) {
          return { ...r, currentWonCount: (r.currentWonCount || 0) + 1 };
        }
        return r;
      });

      await supabaseAdmin
        .from('SiteSetting')
        .update({
          value: JSON.stringify({ ...settings, lotteryRewards: updatedLotteryRewards }),
          updatedAt: new Date().toISOString(),
        })
        .eq('key', 'ad_settings');
    } catch (settErr) {
      console.warn('[POST /api/ads/spin] Winner count update notice:', settErr);
    }

    // 8. Record Spin History in Supabase
    try {
      const spinId = `spin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('SpinHistory').insert([{
        id: spinId,
        userId,
        reward: selectedReward.label,
        amount: prizeValue,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    const { password: _, ...sanitizedUser } = updatedUser;

    return NextResponse.json({
      success: true,
      winningIndex: winningIndex >= 0 ? winningIndex : 0,
      rewardIndex: winningIndex >= 0 ? winningIndex : 0,
      reward: selectedReward,
      user: sanitizedUser,
      message: prizeValue > 0 
        ? `🎉 Congratulations! You won ${selectedReward.label}!` 
        : 'Better luck next time! Spin again to win.',
    });
  } catch (error: any) {
    console.error('[POST /api/ads/spin]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process lottery spin.' }, { status: 500 });
  }
}
