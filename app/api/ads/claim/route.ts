import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, amount } = await request.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
    }

    // Get current user coin balance
    const { data: user, error: userError } = await supabaseAdmin
      .from('User')
      .select('coinBalance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found in database.' }, { status: 404 });
    }

    const newBalance = (Number(user.coinBalance) || 0) + Number(amount);

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
      message: 'Coins claimed successfully',
      newBalance: updatedUser.coinBalance
    });
  } catch (error: any) {
    console.error('[POST /api/ads/claim]', error?.message);
    return NextResponse.json({ message: 'Failed to claim coins.' }, { status: 500 });
  }
}
