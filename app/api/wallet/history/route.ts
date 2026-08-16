import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const { data: payments, error } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ payments: payments || [] });
  } catch (error: any) {
    console.error('[GET /api/wallet/history]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch transaction history.' }, { status: 500 });
  }
}
