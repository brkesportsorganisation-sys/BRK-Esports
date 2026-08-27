import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, hasPermission } from '@/lib/admin-auth';
import { ShopCoupon } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

const DEFAULT_COUPONS: ShopCoupon[] = [
  {
    id: 'coupon_welcome10',
    code: 'WELCOME10',
    discountPercent: 10,
    minOrderBdt: 50,
    maxUses: 500,
    usedCount: 14,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon_booyah50',
    code: 'BOOYAH50',
    discountAmountBdt: 50,
    minOrderBdt: 200,
    maxUses: 200,
    usedCount: 38,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon_cooler20',
    code: 'COOLER20',
    discountPercent: 20,
    minOrderBdt: 100,
    maxUses: 100,
    usedCount: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon_ezbdpass',
    code: 'EZBDPASS',
    discountAmountBdt: 30,
    minOrderBdt: 150,
    maxUses: 100,
    usedCount: 12,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

async function getCoupons(): Promise<ShopCoupon[]> {
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'SHOP_PROMO_COUPONS')
      .maybeSingle();

    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return DEFAULT_COUPONS;
}

async function saveCoupons(coupons: ShopCoupon[]) {
  await supabaseAdmin
    .from('SiteSetting')
    .upsert({
      id: 'setting_SHOP_PROMO_COUPONS',
      key: 'SHOP_PROMO_COUPONS',
      value: JSON.stringify(coupons),
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'key' });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const coupons = await getCoupons();
    const activeCoupons = coupons.filter(c => c.isActive);
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    return NextResponse.json({
      success: true,
      coupons,
      stats: {
        totalCoupons: coupons.length,
        activeCount: activeCoupons.length,
        totalRedemptions,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/admin/coupons]', error);
    return NextResponse.json({ coupons: DEFAULT_COUPONS, stats: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, discountPercent, discountAmountBdt, minOrderBdt, maxUses, expiryDate, isActive = true } = body;

    if (!code || (!discountPercent && !discountAmountBdt)) {
      return NextResponse.json({ message: 'Coupon Code and a valid Discount (% or BDT) are required.' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const coupons = await getCoupons();

    if (coupons.some(c => c.code === cleanCode)) {
      return NextResponse.json({ message: `Coupon code "${cleanCode}" already exists.` }, { status: 400 });
    }

    const newCoupon: ShopCoupon = {
      id: `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      discountAmountBdt: discountAmountBdt ? Number(discountAmountBdt) : undefined,
      minOrderBdt: minOrderBdt ? Number(minOrderBdt) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
      usedCount: 0,
      expiryDate: expiryDate ? String(expiryDate) : undefined,
      isActive: Boolean(isActive),
      createdAt: new Date().toISOString(),
    };

    const updated = [newCoupon, ...coupons];
    await saveCoupons(updated);

    return NextResponse.json({
      success: true,
      message: `Coupon "${cleanCode}" created successfully!`,
      coupon: newCoupon,
      coupons: updated,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/coupons]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create coupon.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, couponId, ...updates } = body;

    const coupons = await getCoupons();
    const idx = coupons.findIndex(c => c.id === couponId);

    if (idx === -1) {
      return NextResponse.json({ message: 'Coupon not found.' }, { status: 404 });
    }

    if (action === 'TOGGLE') {
      coupons[idx].isActive = !coupons[idx].isActive;
    } else if (action === 'RESET_USAGE') {
      coupons[idx].usedCount = 0;
    } else if (action === 'EDIT') {
      coupons[idx] = {
        ...coupons[idx],
        code: updates.code ? String(updates.code).trim().toUpperCase() : coupons[idx].code,
        discountPercent: updates.discountPercent ? Number(updates.discountPercent) : undefined,
        discountAmountBdt: updates.discountAmountBdt ? Number(updates.discountAmountBdt) : undefined,
        minOrderBdt: updates.minOrderBdt ? Number(updates.minOrderBdt) : undefined,
        maxUses: updates.maxUses ? Number(updates.maxUses) : undefined,
        expiryDate: updates.expiryDate || coupons[idx].expiryDate,
        isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : coupons[idx].isActive,
      };
    }

    await saveCoupons(coupons);

    return NextResponse.json({
      success: true,
      message: 'Coupon updated successfully.',
      coupons,
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/coupons]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update coupon.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const couponId = url.searchParams.get('id');

    if (!couponId) {
      return NextResponse.json({ message: 'Coupon ID required.' }, { status: 400 });
    }

    const coupons = await getCoupons();
    const updated = coupons.filter(c => c.id !== couponId);
    await saveCoupons(updated);

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully.',
      coupons: updated,
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/coupons]', error);
    return NextResponse.json({ message: error?.message || 'Failed to delete coupon.' }, { status: 500 });
  }
}
