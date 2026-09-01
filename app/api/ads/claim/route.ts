import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_COIN_REWARD_PER_AD = 10;
const MAX_ALLOWED_COIN_PER_AD = 25;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    // 1. Fetch user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('id, coinBalance, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found in database.' }, { status: 404 });
    }

    // 2. Fetch server-side ad reward configuration
    let coinReward = DEFAULT_COIN_REWARD_PER_AD;
    try {
      const { data: setting } = await supabaseAdmin
        .from('SiteSetting')
        .select('value')
        .eq('key', 'ad_settings')
        .maybeSingle();

      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.isWatchEarnActive === false) {
          return NextResponse.json({ message: 'Watch & Earn is currently disabled by admin.' }, { status: 400 });
        }
        if (parsed.rewardPerAd && Number(parsed.rewardPerAd) > 0) {
          coinReward = Math.min(MAX_ALLOWED_COIN_PER_AD, Math.max(1, Number(parsed.rewardPerAd)));
        }
      }
    } catch {}

    const newBalance = (Number(user.coinBalance) || 0) + coinReward;

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('User')
      .update({ coinBalance: newBalance, updatedAt: new Date().toISOString() })
      .eq('id', userId)
      .select('coinBalance')
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ 
      success: true, 
      message: `+${coinReward} Coins claimed successfully! 🎉`,
      claimedCoins: coinReward,
      newBalance: updatedUser.coinBalance
    });
  } catch (error: any) {
    console.error('[POST /api/ads/claim]', error?.message);
    return NextResponse.json({ message: 'Failed to claim coins.' }, { status: 500 });
  }
}
