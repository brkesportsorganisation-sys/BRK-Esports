import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, milestoneId, rewardType, rewardAmount } = body;

    if (!userId || !milestoneId || !rewardType || !rewardAmount) {
      return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
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

    const milestoneConfig: Record<number, { required: number; amount: number; type: 'COIN' | 'WALLET' }> = {
      10: { required: 10, amount: 50, type: 'COIN' },
      50: { required: 50, amount: 100, type: 'COIN' },
      100: { required: 100, amount: 200, type: 'COIN' },
      300: { required: 300, amount: 500, type: 'WALLET' },
    };

    const targetMilestone = milestoneConfig[Number(milestoneId)];
    const userReferrals = Number(user.totalReferrals) || 0;

    if (targetMilestone && userReferrals < targetMilestone.required) {
      return NextResponse.json({
        message: `You need at least ${targetMilestone.required} referrals to claim this reward. Current: ${userReferrals}`
      }, { status: 400 });
    }

    const updates: Record<string, any> = {
      claimedMilestones: [...claimed, Number(milestoneId)],
      updatedAt: new Date().toISOString(),
    };

    const numAmount = Number(rewardAmount) || (targetMilestone?.amount || 0);

    if (rewardType === 'COIN') {
      updates.coinBalance = (Number(user.coinBalance) || 0) + numAmount;
    } else if (rewardType === 'WALLET') {
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
        message: `অভিনন্দন! আপনি সফলভাবে ${numAmount} ${rewardType === 'COIN' ? 'কয়েন' : 'টাকা (ক্যাশ)'} রেফারেল মাইলস্টোন প্রাইজ ক্লেইম করেছেন!`,
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
