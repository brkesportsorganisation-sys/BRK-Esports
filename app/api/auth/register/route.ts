import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';
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
    const accountNumber = `EZBD-${Math.floor(100000 + Math.random() * 900000)}`;

    const userPayload: Record<string, any> = {
      id: userId,
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      role: 'USER',
      accountNumber,
      freeFireUid: ffUid?.trim() || null,
      inGameName: ign?.trim() || name.trim(),
      walletBalance: 0, // Starts at 0, must be earned/deposited
      promoBalance: 0, // Starts at 0
      winningBalance: 0, // Starts at 0
      coinBalance: 0, // Starts at 0
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
        
        // Detect missing column error from PostgREST or PostgreSQL
        const match = fullErrStr.match(/Could not find the '([^']+)' column/i) ||
                      fullErrStr.match(/column '([^']+)' does not exist/i) ||
                      fullErrStr.match(/column "([^"]+)" does not exist/i);

        if (match && match[1]) {
          const missingCol = match[1];
          console.warn(`[POST /api/auth/register] Omission of column '${missingCol}' due to database schema mismatch.`);
          delete workingPayload[missingCol];
          retries--;
          continue;
        }

        // Ultimate fallback: minimal payload if multiple columns mismatch
        if (retries === 1) {
          const minimalPayload = {
            id: userId,
            name: name.trim(),
            email: trimmedEmail,
            password: hashedPassword,
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

        console.error('[POST /api/auth/register] Supabase error:', error);
        throw new Error(error.message);
      }
      break;
    }

    if (!insertedData) {
      throw new Error('Registration failed while saving user to database.');
    }

    // Handle referral increment and promo bonus for referrer
    if (refCode) {
      try {
        const cleanRef = refCode.trim();
        const { data: referrer } = await supabaseAdmin
          .from('User')
          .select('id, name, totalReferrals, referralCode, claimedMilestones')
          .or(`referralCode.ilike.${cleanRef},accountNumber.ilike.${cleanRef}`)
          .maybeSingle();

        if (referrer && referrer.id !== userId) {
          const newTotal = (Number(referrer.totalReferrals) || 0) + 1;
          await supabaseAdmin
            .from('User')
            .update({
              totalReferrals: newTotal,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', referrer.id);

          try {
            await supabaseAdmin
              .from('User')
              .update({ referredBy: referrer.id })
              .eq('id', userId);
          } catch {}

          // Insert in-app push notification for the referrer
          try {
            const notifId = `notif_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await supabaseAdmin.from('Notification').insert([{
              id: notifId,
              userId: referrer.id,
              title: '🎉 নতুন রেফারেল সফল হয়েছে!',
              message: `${name.trim()} আপনার রেফারেল লিংক ব্যবহার করে একাউন্ট খুলেছে! আপনার মোট রেফারেল সংখ্যা: ${newTotal} টি।`,
              type: 'REWARD',
              link: '/profile#referral',
              icon: 'gift',
              priority: 'HIGH',
              isRead: false,
              createdAt: new Date().toISOString(),
            }]);
          } catch {}
        }
      } catch (refErr) {
        console.warn('Referral update notice:', refErr);
      }
    }

    // Trigger Welcome Email in background via Resend
    void sendWelcomeEmail({
      name: userPayload.name,
      email: userPayload.email,
      accountNumber: userPayload.accountNumber,
      freeFireUid: userPayload.freeFireUid,
      inGameName: userPayload.inGameName,
    }).catch((err) => console.warn('[Register Welcome Email Notice]:', err));

    // Return sanitized user object merged with client model defaults
    const { password: _, passwordResetOtp: __, passwordResetExpires: ___, ...sanitizedUser } = {
      ...userPayload,
      ...insertedData,
    };

    return NextResponse.json({ user: sanitizedUser, message: 'Account created successfully!' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json({ message: error?.message || 'Registration failed.' }, { status: 500 });
  }
}
