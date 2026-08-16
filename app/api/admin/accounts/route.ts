import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verifyAdminSession, isOwner, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { AdminPermissionKey } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!session || !isOwner(session)) {
    return NextResponse.json({ message: 'Only the Platform Owner can manage sub-admin roles.' }, { status: 403 });
  }

  try {
    const { data: accounts, error } = await supabaseAdmin
      .from('AdminAccount')
      .select('id, username, displayName, role, permissions, isActive, createdBy, createdAt, updatedAt')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/accounts] Supabase query warning:', error.message);
      return NextResponse.json({ accounts: [] });
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/accounts]', error);
    return NextResponse.json({ accounts: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isOwner(session)) {
    return NextResponse.json({ message: 'Only the Platform Owner can create sub-admin accounts.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, password, displayName, permissions } = body;

    if (!username || !password || !displayName) {
      return NextResponse.json({ message: 'Username, password, and display name are required.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json({ message: 'Username must be at least 3 characters.' }, { status: 400 });
    }

    // Check duplicate username in AdminAccount
    const { data: existing } = await supabaseAdmin
      .from('AdminAccount')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'An admin account with this username already exists.' }, { status: 409 });
    }

    // Security Rule 1: 'manage_roles' and 'approve_deletes' can never be assigned to a sub-admin
    const safePermissions: AdminPermissionKey[] = (permissions || []).filter(
      (p: string) => p !== 'manage_roles' && p !== 'approve_deletes'
    );

    const passwordHash = await bcrypt.hash(password.trim(), 12);
    const accountId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newAccount = {
      id: accountId,
      username: cleanUsername,
      passwordHash,
      displayName: displayName.trim(),
      role: 'SUB_ADMIN',
      permissions: safePermissions,
      isActive: true,
      createdBy: session.username || 'Owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('AdminAccount')
      .insert([newAccount])
      .select('id, username, displayName, role, permissions, isActive, createdBy, createdAt, updatedAt')
      .single();

    if (error) throw new Error(error.message);

    logAdminAction(
      session.username || 'Owner',
      'CREATE_SUB_ADMIN',
      `Created sub-admin '${cleanUsername}' with ${safePermissions.length} permissions`,
      'AdminAccount',
      accountId
    );

    return NextResponse.json({
      account: data,
      message: `Sub-admin account '${cleanUsername}' created successfully!`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/accounts]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create sub-admin account.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !isOwner(session)) {
    return NextResponse.json({ message: 'Only the Platform Owner can modify sub-admin accounts.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { accountId, permissions, isActive, password, displayName } = body;

    if (!accountId) {
      return NextResponse.json({ message: 'Account ID is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    if (displayName) {
      updates.displayName = displayName.trim();
    }

    if (password && password.trim().length >= 6) {
      updates.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    if (Array.isArray(permissions)) {
      // Filter out Owner-only permissions
      updates.permissions = permissions.filter((p: string) => p !== 'manage_roles' && p !== 'approve_deletes');
    }

    const { data: updated, error } = await supabaseAdmin
      .from('AdminAccount')
      .update(updates)
      .eq('id', accountId)
      .select('id, username, displayName, role, permissions, isActive, createdBy, createdAt, updatedAt')
      .single();

    if (error) throw new Error(error.message);

    logAdminAction(
      session.username || 'Owner',
      'UPDATE_SUB_ADMIN',
      `Updated sub-admin account '${updated.username}' (Active: ${updated.isActive}, Permissions: ${updated.permissions?.length || 0})`,
      'AdminAccount',
      accountId
    );

    return NextResponse.json({
      account: updated,
      message: `Sub-admin account '${updated.username}' updated successfully!`,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/accounts]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update sub-admin account.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !isOwner(session)) {
    return NextResponse.json({ message: 'Only the Platform Owner can delete sub-admin accounts.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ message: 'Account ID is required.' }, { status: 400 });
    }

    const { data: account } = await supabaseAdmin
      .from('AdminAccount')
      .select('username')
      .eq('id', accountId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from('AdminAccount')
      .delete()
      .eq('id', accountId);

    if (error) throw new Error(error.message);

    logAdminAction(
      session.username || 'Owner',
      'DELETE_SUB_ADMIN',
      `Deleted sub-admin account '${account?.username || accountId}'`,
      'AdminAccount',
      accountId
    );

    return NextResponse.json({ message: 'Sub-admin account deleted successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/accounts]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete sub-admin account.' }, { status: 500 });
  }
}
