import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, milestoneId } = body;

    if (!userId || !milestoneId) {
      return NextResponse.json({ message: 'User ID and Milestone ID are required.' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const claimed = user.claimedMilestones || [];
    if (claimed.includes(Number(milestoneId))) {
      return NextResponse.json({ message: 'Milestone already claimed.' }, { status: 400 });
    }

    // Dynamically fetch milestone settings from SiteSetting
    let milestoneConfig: Record<number, { required: number; amount: number; type: 'COIN' | 'WALLET' }> = {
      10: { required: 10, amount: 50, type: 'COIN' },
      50: { required: 50, amount: 100, type: 'COIN' },
      100: { required: 100, amount: 200, type: 'COIN' },
      300: { required: 300, amount: 500, type: 'WALLET' },
    };

    try {
      const { data: settings } = await supabaseAdmin
        .from('SiteSetting')
        .select('key, value')
        .in('key', [
          'ref_stage1_required', 'ref_stage1_reward',
          'ref_stage2_required', 'ref_stage2_reward',
          'ref_stage3_required', 'ref_stage3_reward',
          'ref_stage4_required', 'ref_stage4_reward',
        ]);

      if (settings && settings.length > 0) {
        const sMap: Record<string, string> = {};
        settings.forEach((s: any) => { sMap[s.key] = s.value; });

        const m1Req = parseInt(sMap.ref_stage1_required || '10');
        const m1Rew = parseInt(sMap.ref_stage1_reward || '50');
        const m2Req = parseInt(sMap.ref_stage2_required || '50');
        const m2Rew = parseInt(sMap.ref_stage2_reward || '100');
        const m3Req = parseInt(sMap.ref_stage3_required || '100');
        const m3Rew = parseInt(sMap.ref_stage3_reward || '200');
        const m4Req = parseInt(sMap.ref_stage4_required || '300');
        const m4Rew = parseInt(sMap.ref_stage4_reward || '500');

        milestoneConfig = {
          [m1Req]: { required: m1Req, amount: m1Rew, type: 'COIN' },
          [m2Req]: { required: m2Req, amount: m2Rew, type: 'COIN' },
          [m3Req]: { required: m3Req, amount: m3Rew, type: 'COIN' },
          [m4Req]: { required: m4Req, amount: m4Rew, type: 'WALLET' },
        };
      }
    } catch (settErr) {
      console.warn('[POST /api/user/milestone] Using default milestone fallback config:', settErr);
    }

    const targetMilestone = milestoneConfig[Number(milestoneId)];
    if (!targetMilestone) {
      return NextResponse.json({ message: 'Invalid milestone stage.' }, { status: 400 });
    }

    const userReferrals = Number(user.totalReferrals) || 0;
    if (userReferrals < targetMilestone.required) {
      return NextResponse.json({
        message: `You need at least ${targetMilestone.required} referrals to claim this reward. Current: ${userReferrals}`
      }, { status: 400 });
    }

    const updates: Record<string, any> = {
      claimedMilestones: [...claimed, Number(milestoneId)],
      updatedAt: new Date().toISOString(),
    };

    // Strictly enforce server-calculated reward amount and type
    const numAmount = targetMilestone.amount;
    const actualRewardType = targetMilestone.type;

    if (actualRewardType === 'COIN') {
      updates.coinBalance = (Number(user.coinBalance) || 0) + numAmount;
    } else if (actualRewardType === 'WALLET') {
      updates.walletBalance = (Number(user.walletBalance) || 0) + numAmount;
      updates.winningBalance = (Number(user.winningBalance) || 0) + numAmount;
      updates.earnings = (Number(user.earnings) || 0) + numAmount;
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('User')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Insert Notification
    try {
      const notifId = `notif_claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId: user.id,
        title: '🎁 রিওয়ার্ড ক্লেইম সফল হয়েছে!',
        message: `অভিনন্দন! আপনি সফলভাবে ${numAmount} ${actualRewardType === 'COIN' ? 'কয়েন' : 'টাকা (ক্যাশ)'} রেফারেল মাইলস্টোন প্রাইজ ক্লেইম করেছেন!`,
        type: 'REWARD',
        link: '/profile#referral',
        icon: 'gift',
        priority: 'HIGH',
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json({ user: sanitizedUser, message: 'Milestone reward claimed successfully!' });
  } catch (error: any) {
    console.error('[POST /api/user/milestone]', error);
    return NextResponse.json({ message: error?.message || 'Failed to claim milestone.' }, { status: 500 });
  }
}
