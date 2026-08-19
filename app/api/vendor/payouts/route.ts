import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyVendorSession, hasVendorPermission } from '@/lib/vendor-auth';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { VendorPayoutRequest } from '@/lib/types';

// In-memory fallback for local dev
let localPayouts: VendorPayoutRequest[] = [];

export async function GET() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_session')?.value;
  const vendorToken = cookieStore.get('vendor_session')?.value;

  const adminSession = verifyAdminSession(adminToken);
  const vendorSession = verifyVendorSession(vendorToken);

  if (!adminSession && !vendorSession) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  try {
    let query = supabaseAdmin
      .from('VendorPayoutRequest')
      .select('*')
      .order('createdAt', { ascending: false });

    // If vendor, filter to only their own payout requests
    if (vendorSession && !adminSession) {
      query = query.eq('vendorId', vendorSession.vendorId);
    }

    const { data: dbPayouts, error } = await query;
    if (!error && dbPayouts) {
      return NextResponse.json({ payouts: dbPayouts });
    }

    const filtered = vendorSession && !adminSession
      ? localPayouts.filter((p) => p.vendorId === vendorSession.vendorId)
      : localPayouts;

    return NextResponse.json({ payouts: filtered });
  } catch {
    const filtered = vendorSession && !adminSession
      ? localPayouts.filter((p) => p.vendorId === vendorSession.vendorId)
      : localPayouts;
    return NextResponse.json({ payouts: filtered });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('vendor_session')?.value;
  const session = verifyVendorSession(token);

  if (!session) {
    return NextResponse.json({ message: 'Unauthenticated vendor' }, { status: 401 });
  }

  if (!hasVendorPermission(session, 'request_payout')) {
    return NextResponse.json(
      { message: 'You do not have permission to request payouts.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { amount, method = 'BKASH', accountNumber, notes } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      return NextResponse.json(
        { message: 'Minimum payout withdrawal request is ৳100.' },
        { status: 400 }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        { message: 'Payment account number is required.' },
        { status: 400 }
      );
    }

    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPayout: VendorPayoutRequest = {
      id: payoutId,
      vendorId: session.vendorId,
      vendorName: session.name,
      amount: numAmount,
      method,
      accountNumber: String(accountNumber).trim(),
      status: session.accessLevel === 'FULL_ACCESS' ? 'PENDING' : 'PENDING',
      notes: notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await supabaseAdmin.from('VendorPayoutRequest').insert([newPayout]);
    } catch {}

    localPayouts.unshift(newPayout);

    return NextResponse.json(
      {
        payout: newPayout,
        message: 'Payout request submitted successfully! Admin review in progress.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/vendor/payouts]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to submit payout request.' },
      { status: 500 }
    );
  }
}
