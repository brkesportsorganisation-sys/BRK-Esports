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

    const updates: Record<string, any> = {
      claimedMilestones: [...claimed, Number(milestoneId)],
      updatedAt: new Date().toISOString(),
    };

    if (rewardType === 'COIN') {
      updates.coinBalance = (Number(user.coinBalance) || 0) + Number(rewardAmount);
    } else if (rewardType === 'WALLET') {
      updates.walletBalance = (Number(user.walletBalance) || 0) + Number(rewardAmount);
      updates.earnings = (Number(user.earnings) || 0) + Number(rewardAmount);
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

    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json({ user: sanitizedUser, message: 'Milestone reward claimed successfully!' });
  } catch (error: any) {
    console.error('[POST /api/user/milestone]', error);
    return NextResponse.json({ message: error?.message || 'Failed to claim milestone.' }, { status: 500 });
  }
}
