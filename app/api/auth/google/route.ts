import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, avatar, refCode } = body;

    if (!email) {
      return NextResponse.json({ message: 'Google account email is required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const displayName = (name || trimmedEmail.split('@')[0]).trim();
    const userAvatar = avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150';

    // 1. Check if user already exists
    const { data: existingUser, error: fetchErr } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (fetchErr) {
      console.error('[POST /api/auth/google] Supabase lookup error:', fetchErr);
    }

    if (existingUser) {
      // Check ban status
      if (existingUser.isBanned) {
        return NextResponse.json({ message: 'This account has been banned. Please contact support.' }, { status: 403 });
      }

      // Update avatar or updatedAt
      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      if (!existingUser.avatar && userAvatar) {
        updates.avatar = userAvatar;
      }

      await supabaseAdmin
        .from('User')
        .update(updates)
        .eq('id', existingUser.id);

      const { password: _, ...sanitized } = { ...existingUser, ...updates };
      return NextResponse.json({
        user: sanitized,
        message: 'Logged in successfully with Google!',
        isNewUser: false
      });
    }

    // 2. Register new user via Google
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const referralCode = `REF_${Math.floor(1000 + Math.random() * 9000)}`;
    const accountNumber = `BRK-${Math.floor(100000 + Math.random() * 900000)}`;

    const userPayload: Record<string, any> = {
      id: userId,
      name: displayName,
      email: trimmedEmail,
      avatar: userAvatar,
      role: 'USER',
      accountNumber,
      inGameName: displayName.toUpperCase().replace(/\s+/g, '_').slice(0, 16),
      walletBalance: 0,
      promoBalance: 0,
      winningBalance: 0,
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

    let insertedData: any = null;
    let retries = 15;
    const workingPayload = { ...userPayload };

    while (retries > 0) {
      const { data, error } = await supabaseAdmin
        .from('User')
        .insert([workingPayload])
        .select()
        .maybeSingle();

      if (!error && data) {
        insertedData = data;
        break;
      }

      if (error) {
        const fullErrStr = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
        const match = fullErrStr.match(/Could not find the '([^']+)' column/i) ||
                      fullErrStr.match(/column '([^']+)' does not exist/i) ||
                      fullErrStr.match(/column "([^"]+)" does not exist/i);

        if (match && match[1]) {
          const missingCol = match[1];
          delete workingPayload[missingCol];
          retries--;
          continue;
        }

        // Ultimate fallback
        if (retries === 1) {
          const minimalPayload = {
            id: userId,
            name: displayName,
            email: trimmedEmail,
            avatar: userAvatar,
            role: 'USER',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const { data: minData, error: minErr } = await supabaseAdmin
            .from('User')
            .insert([minimalPayload])
            .select()
            .maybeSingle();

          if (!minErr && minData) {
            insertedData = minData;
            break;
          }
        }

        console.error('[POST /api/auth/google] Supabase insert error:', error);
        throw new Error(error.message);
      }
      break;
    }

    if (!insertedData) {
      throw new Error('Failed to create user account with Google in database.');
    }

    // Handle referral increment if refCode was provided
    if (refCode) {
      try {
        const { data: referrer } = await supabaseAdmin
          .from('User')
          .select('id, totalReferrals')
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
      } catch (refErr) {
        console.warn('Referral update notice:', refErr);
      }
    }

    // Send Welcome Email in background
    void sendWelcomeEmail({
      name: userPayload.name,
      email: userPayload.email,
      accountNumber: userPayload.accountNumber,
      freeFireUid: userPayload.freeFireUid,
      inGameName: userPayload.inGameName,
    }).catch((err) => console.warn('[Google Register Welcome Email Notice]:', err));

    const { password: _, ...sanitizedUser } = {
      ...userPayload,
      ...insertedData,
    };

    return NextResponse.json({
      user: sanitizedUser,
      message: 'Account created successfully with Google!',
      isNewUser: true
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/auth/google]', error);
    return NextResponse.json({ message: error?.message || 'Google authentication failed.' }, { status: 500 });
  }
}
