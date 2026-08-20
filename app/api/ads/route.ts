import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { RewardsHubSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS: RewardsHubSettings = {
  isWatchEarnActive: true,
  isLotteryActive: true,
  dailyAdLimit: 10,
  dailySpinLimit: 5,
  spinCoinCost: 20,
  spinCashCost: 10,
  spinPaymentMode: 'BOTH',
  coinsToBdtRatio: 50,
  minCoinsToConvert: 50,
  ads: [
    {
      id: 'ad_ff_1',
      videoId: 'dQw4w9WgXcQ',
      title: 'Free Fire World Series - Final Clutch & Booyah Highlights',
      adType: 'YOUTUBE',
      rewardAmount: 15,
      durationSeconds: 15,
      isActive: true,
    },
    {
      id: 'ad_ff_2',
      videoId: '7Y4lFvP9gZc',
      title: 'Pro Free Fire Grand Finals - Best Headshots & Strategy',
      adType: 'YOUTUBE',
      rewardAmount: 20,
      durationSeconds: 20,
      isActive: true,
    }
  ],
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

export async function GET() {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ad_settings')
      .maybeSingle();

    let settings: RewardsHubSettings = DEFAULT_SETTINGS;

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (parsed && typeof parsed === 'object') {
          settings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            ads: (parsed.ads && parsed.ads.length > 0) ? parsed.ads : DEFAULT_SETTINGS.ads,
            lotteryRewards: (parsed.lotteryRewards && parsed.lotteryRewards.length > 0) ? parsed.lotteryRewards : DEFAULT_SETTINGS.lotteryRewards,
          };
        }
      } catch (parseErr) {
        console.warn('[GET /api/ads] Failed to parse ad_settings JSON:', parseErr);
      }
    }

    return NextResponse.json({
      success: true,
      settings,
      adSettings: {
        isActive: settings.isWatchEarnActive,
        ads: settings.ads.filter(a => a.isActive)
      },
      lotterySettings: {
        isActive: settings.isLotteryActive,
        spinCoinCost: settings.spinCoinCost,
        dailySpinLimit: settings.dailySpinLimit,
        rewards: settings.lotteryRewards.filter(r => r.isActive)
      }
    });
  } catch (error: any) {
    console.error('[GET /api/ads]', error);
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      adSettings: {
        isActive: true,
        ads: DEFAULT_SETTINGS.ads
      },
      lotterySettings: {
        isActive: true,
        spinCoinCost: DEFAULT_SETTINGS.spinCoinCost,
        rewards: DEFAULT_SETTINGS.lotteryRewards
      }
    });
  }
}
