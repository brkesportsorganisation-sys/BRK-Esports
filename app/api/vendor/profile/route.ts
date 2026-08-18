import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession, hasVendorPermission } from '@/lib/vendor-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

async function getVendorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  return verifyVendorSession(token);
}

export async function GET() {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    const { data: vendor, error } = await supabaseAdmin
      .from('VendorAccount')
      .select('id, vendorId, name, orgName, email, phone, whatsApp, logo, banner, bio, accessLevel, status, commissionRate')
      .eq('id', session.sub)
      .maybeSingle();

    if (!error && vendor) {
      return NextResponse.json({ profile: vendor });
    }

    const localVendor = db.getVendorById ? db.getVendorById(session.sub) : null;
    return NextResponse.json({
      profile: localVendor || {
        id: session.sub,
        vendorId: session.vendorId,
        name: session.name,
        orgName: session.orgName,
        email: session.email,
        accessLevel: session.accessLevel,
        commissionRate: session.commissionRate,
      },
    });
  } catch {
    return NextResponse.json({
      profile: {
        id: session.sub,
        vendorId: session.vendorId,
        name: session.name,
        orgName: session.orgName,
        email: session.email,
        accessLevel: session.accessLevel,
        commissionRate: session.commissionRate,
      },
    });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getVendorSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  if (!hasVendorPermission(session, 'edit_store_profile')) {
    return NextResponse.json(
      { message: 'Your access tier does not permit modifying the public storefront directly. Please contact administration.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { orgName, phone, whatsApp, logo, banner, bio } = body;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (orgName) updates.orgName = orgName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (whatsApp !== undefined) updates.whatsApp = whatsApp.trim();
    if (logo !== undefined) updates.logo = logo.trim();
    if (banner !== undefined) updates.banner = banner.trim();
    if (bio !== undefined) updates.bio = bio.trim();

    try {
      await supabaseAdmin
        .from('VendorAccount')
        .update(updates)
        .eq('id', session.sub);
    } catch {}

    db.updateVendorAccount(session.sub, updates);

    return NextResponse.json({ message: 'Storefront profile updated successfully!' });
  } catch (error: any) {
    console.error('[PATCH /api/vendor/profile]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
