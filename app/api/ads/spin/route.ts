import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, rewardType, value, label } = body;

    if (!userId || !rewardType) {
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

    // Record Spin History in Supabase
    const spinId = `spin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await supabaseAdmin.from('SpinHistory').insert([{
      id: spinId,
      userId,
      reward: label || rewardType,
      amount: Number(value || 0),
      createdAt: new Date().toISOString(),
    }]);

    const numValue = Number(value) || 0;
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (rewardType === 'WALLET' && numValue > 0) {
      updates.walletBalance = (Number(user.walletBalance) || 0) + numValue;
      updates.earnings = (Number(user.earnings) || 0) + numValue;
    } else if (rewardType === 'DIAMONDS' && numValue > 0) {
      updates.coinBalance = (Number(user.coinBalance) || 0) + numValue;
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('User')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      message: numValue > 0 ? `Congratulations! You won ${label}!` : 'Better luck next time!',
    });
  } catch (error: any) {
    console.error('[POST /api/ads/spin]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process spin.' }, { status: 500 });
  }
}
