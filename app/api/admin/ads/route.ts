import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, hasPermission, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { RewardsHubSettings, LotteryRewardItem, AdSettingItem } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

const DEFAULT_REWARDS_SETTINGS: RewardsHubSettings = {
  isWatchEarnActive: true,
  isLotteryActive: true,
  dailyAdLimit: 10,
  dailySpinLimit: 5,
  spinCoinCost: 20,
  spinCashCost: 10,
  spinPaymentMode: 'BOTH',
  coinsToBdtRatio: 50, // 50 coins = 1 BDT
  minCoinsToConvert: 50,
  ads: [
    {
      id: 'ad_default_1',
      title: 'Free Fire Booyah Championship Highlights',
      adType: 'YOUTUBE',
      videoId: 'dQw4w9WgXcQ',
      rewardAmount: 15,
      durationSeconds: 15,
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
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_watch_earn')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: setting, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'ad_settings')
      .maybeSingle();

    let settings: RewardsHubSettings = DEFAULT_REWARDS_SETTINGS;

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        settings = {
          ...DEFAULT_REWARDS_SETTINGS,
          ...parsed,
          ads: parsed.ads || DEFAULT_REWARDS_SETTINGS.ads,
          lotteryRewards: parsed.lotteryRewards || DEFAULT_REWARDS_SETTINGS.lotteryRewards,
        };
      } catch {}
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[GET /api/admin/ads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to load ad settings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasPermission(session, 'manage_watch_earn')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ message: 'Settings payload is required.' }, { status: 400 });
    }

    // Validate lottery rewards total percentage
    const activeLottery = settings.lotteryRewards || [];
    const totalProb = activeLottery.reduce((acc: number, item: LotteryRewardItem) => acc + (Number(item.probabilityPercent) || 0), 0);

    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_ad_settings',
        key: 'ad_settings',
        value: JSON.stringify(settings),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw new Error(error.message);

    logAdminAction(
      session.username || session.email,
      'REWARDS_SETTINGS_UPDATE',
      `Updated Earn Rewards & Lottery settings (${settings.ads?.length || 0} ads, ${settings.lotteryRewards?.length || 0} lottery prizes)`,
      'SiteSetting',
      'setting_ad_settings'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Earn Rewards & Lottery settings saved successfully to database!',
      totalProbability: totalProb
    });
  } catch (error: any) {
    console.error('[POST /api/admin/ads]', error);
    return NextResponse.json({ message: error?.message || 'Failed to save settings.' }, { status: 500 });
  }
}
