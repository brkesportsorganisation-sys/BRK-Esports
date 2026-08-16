import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, ffUid, ign, refCode } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabaseAdmin
      .from('User')
      .select('id, email')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const referralCode = `REF_${Math.floor(1000 + Math.random() * 9000)}`;
    const accountNumber = `BRE-${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser = {
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      role: 'USER',
      accountNumber,
      freeFireUid: ffUid?.trim() || null,
      inGameName: ign?.trim() || name.trim(),
      walletBalance: 100, // Total
      promoBalance: 100, // Sign-up bonus promo wallet (tournaments only)
      winningBalance: 0, // Winning wallet (withdrawable)
      coinBalance: 0,
      totalKills: 0,
      totalWins: 0,
      earnings: 0,
      winRate: 0.0,
      playerStatus: 'AVAILABLE',
      isBanned: false,
      referralCode,
      totalReferrals: 0,
      claimedMilestones: [],
      adminPermissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('User')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/auth/register] Supabase error:', error);
      throw new Error(error.message);
    }

    // Handle referral increment and promo bonus for referrer
    if (refCode) {
      const { data: referrer } = await supabaseAdmin
        .from('User')
        .select('id, totalReferrals, promoBalance, walletBalance')
        .eq('referralCode', refCode.trim())
        .maybeSingle();

      if (referrer) {
        await supabaseAdmin
          .from('User')
          .update({
            totalReferrals: (referrer.totalReferrals || 0) + 1,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', referrer.id);
      }
    }

    // Return sanitized user object
    const { password: _, ...sanitizedUser } = data;
    return NextResponse.json({ user: sanitizedUser, message: 'Account created successfully!' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json({ message: error?.message || 'Registration failed.' }, { status: 500 });
  }
}
