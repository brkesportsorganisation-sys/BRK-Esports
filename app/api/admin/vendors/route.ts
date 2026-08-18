import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';
import { VendorAccount, VendorAccessLevel, VendorPermissionKey } from '@/lib/types';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['OWNER', 'SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: dbVendors, error } = await supabaseAdmin
      .from('VendorAccount')
      .select('id, vendorId, name, email, phone, whatsApp, status, accessLevel, permissions, assignedTournaments, notes, createdBy, createdAt, updatedAt')
      .order('createdAt', { ascending: false });

    if (!error && dbVendors && dbVendors.length > 0) {
      return NextResponse.json({ vendors: dbVendors });
    }

    // Fallback to local database
    const localVendors = db.getVendors ? db.getVendors() : [];
    const sanitized = localVendors.map(({ password: _, passwordHash: __, ...rest }) => rest);
    return NextResponse.json({ vendors: sanitized });
  } catch (error: any) {
    console.error('[GET /api/admin/vendors]', error);
    const localVendors = db.getVendors ? db.getVendors() : [];
    const sanitized = localVendors.map(({ password: _, passwordHash: __, ...rest }) => rest);
    return NextResponse.json({ vendors: sanitized });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['OWNER', 'SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      vendorId: customVendorId,
      phone,
      whatsApp,
      accessLevel = 'LIMITED_ACCESS',
      permissions = [],
      assignedTournaments = [],
      notes,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const finalVendorId = (
      customVendorId?.trim() ||
      `VND-${Math.floor(1000 + Math.random() * 9000)}`
    ).toUpperCase();

    // Check duplicate email or vendorId in Supabase
    try {
      const { data: existing } = await supabaseAdmin
        .from('VendorAccount')
        .select('id, email, vendorId')
        .or(`email.eq.${cleanEmail},vendorId.eq.${finalVendorId}`)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { message: 'A vendor with this Email or Vendor ID already exists.' },
          { status: 409 }
        );
      }
    } catch {}

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const accountId = `vendor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // If Full Access is selected, ensure assignedTournaments contains 'ALL' and default permissions
    const finalAccessLevel: VendorAccessLevel = accessLevel === 'FULL_ACCESS' ? 'FULL_ACCESS' : 'LIMITED_ACCESS';
    const finalPermissions: VendorPermissionKey[] =
      finalAccessLevel === 'FULL_ACCESS'
        ? [
            'manage_room_details',
            'enter_match_results',
            'view_registrations',
            'manage_tournaments',
            'view_analytics',
          ]
        : (permissions as VendorPermissionKey[]);

    const finalTournaments: string[] =
      finalAccessLevel === 'FULL_ACCESS'
        ? ['ALL']
        : Array.isArray(assignedTournaments) && assignedTournaments.length > 0
        ? assignedTournaments
        : [];

    const newVendorRecord = {
      id: accountId,
      vendorId: finalVendorId,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      phone: phone?.trim() || null,
      whatsApp: whatsApp?.trim() || phone?.trim() || null,
      status: 'ACTIVE',
      accessLevel: finalAccessLevel,
      permissions: finalPermissions,
      assignedTournaments: finalTournaments,
      notes: notes?.trim() || null,
      createdBy: session?.username || session?.email || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Supabase
    let savedInDb = false;
    try {
      const { data, error } = await supabaseAdmin
        .from('VendorAccount')
        .insert([newVendorRecord])
        .select('id, vendorId, name, email, phone, whatsApp, status, accessLevel, permissions, assignedTournaments, notes, createdBy, createdAt, updatedAt')
        .single();

      if (!error && data) {
        savedInDb = true;
      } else if (error) {
        console.warn('[POST /api/admin/vendors] Supabase insert warning:', error.message);
      }
    } catch (dbErr) {
      console.warn('[POST /api/admin/vendors] DB error fallback:', dbErr);
    }

    // Always sync in local fallback store
    db.createVendorAccount({
      vendorId: finalVendorId,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      phone: phone?.trim() || '',
      whatsApp: whatsApp?.trim() || '',
      status: 'ACTIVE',
      accessLevel: finalAccessLevel,
      permissions: finalPermissions,
      assignedTournaments: finalTournaments,
      notes: notes?.trim() || '',
      createdBy: session?.username || 'Admin',
    });

    logAdminAction(
      session?.username || session?.email || 'Admin',
      'CREATE_VENDOR',
      `Created vendor '${finalVendorId}' (${cleanName}) with ${finalAccessLevel} access`,
      'VendorAccount',
      accountId
    );

    const { passwordHash: _, ...sanitized } = newVendorRecord;

    return NextResponse.json(
      {
        vendor: sanitized,
        message: `Vendor '${finalVendorId}' created successfully!`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/admin/vendors]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to create vendor account.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['OWNER', 'SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      password,
      phone,
      whatsApp,
      status,
      accessLevel,
      permissions,
      assignedTournaments,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ message: 'Vendor ID is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (whatsApp !== undefined) updates.whatsApp = whatsApp.trim();
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes.trim();

    if (password && password.trim().length >= 6) {
      updates.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (accessLevel) {
      updates.accessLevel = accessLevel === 'FULL_ACCESS' ? 'FULL_ACCESS' : 'LIMITED_ACCESS';
      if (accessLevel === 'FULL_ACCESS') {
        updates.permissions = [
          'manage_room_details',
          'enter_match_results',
          'view_registrations',
          'manage_tournaments',
          'view_analytics',
        ];
        updates.assignedTournaments = ['ALL'];
      }
    }

    if (Array.isArray(permissions) && updates.accessLevel !== 'FULL_ACCESS') {
      updates.permissions = permissions;
    }

    if (Array.isArray(assignedTournaments) && updates.accessLevel !== 'FULL_ACCESS') {
      updates.assignedTournaments = assignedTournaments;
    }

    // Update in Supabase
    let updatedVendor: any = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('VendorAccount')
        .update(updates)
        .eq('id', id)
        .select('id, vendorId, name, email, phone, whatsApp, status, accessLevel, permissions, assignedTournaments, notes, createdBy, createdAt, updatedAt')
        .single();

      if (!error && data) {
        updatedVendor = data;
      }
    } catch (err) {
      console.warn('Supabase vendor update error:', err);
    }

    // Also sync in local store
    const localUpdated = db.updateVendorAccount(id, {
      ...updates,
      password: password ? password.trim() : undefined,
    });

    logAdminAction(
      session?.username || session?.email || 'Admin',
      'UPDATE_VENDOR',
      `Updated vendor credentials/access for ${id}`,
      'VendorAccount',
      id
    );

    return NextResponse.json({
      vendor: updatedVendor || localUpdated,
      message: 'Vendor updated successfully!',
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/vendors]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to update vendor.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ['OWNER', 'SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('id');

    if (!vendorId) {
      return NextResponse.json({ message: 'Vendor ID is required.' }, { status: 400 });
    }

    try {
      await supabaseAdmin.from('VendorAccount').delete().eq('id', vendorId);
    } catch {}

    db.deleteVendorAccount(vendorId);

    logAdminAction(
      session?.username || session?.email || 'Admin',
      'DELETE_VENDOR',
      `Deleted vendor account ${vendorId}`,
      'VendorAccount',
      vendorId
    );

    return NextResponse.json({ message: 'Vendor account removed successfully.' });
  } catch (error: any) {
    console.error('[DELETE /api/admin/vendors]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to delete vendor.' },
      { status: 500 }
    );
  }
}
