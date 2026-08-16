import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);

    const sanitized = (users || []).map(({ password: _, ...rest }) => rest);
    return NextResponse.json({ users: sanitized });
  } catch (error: any) {
    console.error('[GET /api/admin/users]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch users.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, isBanned, role, walletBalance, coinBalance, adminPermissions, name, inGameName } = body;

    if (!id) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (isBanned !== undefined) updates.isBanned = Boolean(isBanned);
    if (role !== undefined) updates.role = role;
    if (walletBalance !== undefined) updates.walletBalance = Number(walletBalance);
    if (coinBalance !== undefined) updates.coinBalance = Number(coinBalance);
    if (adminPermissions !== undefined) updates.adminPermissions = adminPermissions;
    if (name !== undefined) updates.name = name.trim();
    if (inGameName !== undefined) updates.inGameName = inGameName.trim();

    const { data: updatedUser, error } = await supabaseAdmin
      .from('User')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    logAdminAction(session!.email, 'USER_UPDATE', `Updated user ${id} in Supabase`);

    const { password: _, ...sanitized } = updatedUser;
    return NextResponse.json({ user: sanitized, message: 'User updated successfully.' });
  } catch (error: any) {
    console.error('[PATCH /api/admin/users]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update user.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, inGameName } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('User')
      .select('id')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'A user with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const vendorId = `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const referralCode = `VENDOR${Math.floor(100 + Math.random() * 900)}`;

    const newVendor = {
      id: vendorId,
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      role: 'VENDOR',
      freeFireUid: `VENDOR_${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      inGameName: (inGameName || name).toUpperCase().replace(/\s+/g, '_'),
      walletBalance: 0,
      coinBalance: 0,
      totalKills: 0,
      totalWins: 0,
      earnings: 0,
      isBanned: false,
      referralCode,
      totalReferrals: 0,
      claimedMilestones: [],
      adminPermissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let created: any = null;
    let retries = 10;
    const workingVendor = { ...newVendor };

    while (retries > 0) {
      const { data: insertedData, error } = await supabaseAdmin
        .from('User')
        .insert([workingVendor])
        .select()
        .single();

      if (!error && insertedData) {
        created = insertedData;
        break;
      }

      if (error) {
        const match = error.message?.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && workingVendor[match[1] as keyof typeof workingVendor] !== undefined) {
          delete (workingVendor as any)[match[1]];
          retries--;
          continue;
        }
        throw new Error(error.message);
      }
      break;
    }

    if (!created) throw new Error('Failed to create vendor in database.');

    logAdminAction(session!.email, 'VENDOR_CREATE', `Created vendor ${created.email} in Supabase`);

    const { password: _, ...sanitized } = { ...newVendor, ...created };
    return NextResponse.json({ user: sanitized, message: 'Vendor account created successfully.' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/users]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create vendor.' }, { status: 500 });
  }
}
