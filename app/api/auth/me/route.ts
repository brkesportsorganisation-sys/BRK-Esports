import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id') || request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const { password: _, passwordResetOtp: __, passwordResetExpires: ___, ...rest } = user;
    const sanitizedUser = {
      ...rest,
      accountNumber: rest.accountNumber || `BRK-${(rest.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || Math.floor(100000 + Math.random() * 900000)}`,
    };
    return NextResponse.json({ user: sanitizedUser });
  } catch (error: any) {
    console.error('[GET /api/auth/me]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch user.' }, { status: 500 });
  }
}
