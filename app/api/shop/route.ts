import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_SHOP_PRODUCTS, ShopProduct, ShopCoupon } from '@/lib/types';

async function getDynamicProducts(): Promise<ShopProduct[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'GAMING_SHOP_ITEMS')
      .single();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load dynamic shop items:', err);
  }
  return DEFAULT_SHOP_PRODUCTS;
}

async function getCoupons(): Promise<ShopCoupon[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'SHOP_PROMO_COUPONS')
      .single();

    if (!error && data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const validateCoupon = searchParams.get('coupon');

    // 1. Validate Coupon Code
    if (validateCoupon) {
      const codeClean = validateCoupon.trim().toUpperCase();
      const coupons = await getCoupons();
      const coupon = coupons.find(c => c.code.toUpperCase() === codeClean && c.isActive);

      if (!coupon) {
        return NextResponse.json({ success: false, message: 'Invalid or expired coupon code.' }, { status: 404 });
      }

      if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
        return NextResponse.json({ success: false, message: 'This coupon code has expired.' }, { status: 400 });
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ success: false, message: 'This coupon has reached its maximum usage limit.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        coupon: {
          code: coupon.code,
          discountPercent: coupon.discountPercent || 0,
          discountAmountBdt: coupon.discountAmountBdt || 0,
          minOrderBdt: coupon.minOrderBdt || 0,
        },
      });
    }

    // 2. Fetch User Purchase History
    let userOrders: any[] = [];
    if (userId) {
      try {
        const { data: orders } = await supabaseAdmin
          .from('Payment')
          .select('*')
          .eq('userId', userId)
          .ilike('notes', '%[Shop Order]%')
          .order('createdAt', { ascending: false })
          .limit(20);

        if (orders) {
          userOrders = orders;
        }
      } catch (historyErr) {
        console.warn('Failed to fetch user shop order history:', historyErr);
      }
    }

    const products = await getDynamicProducts();
    const activeProducts = products.filter(p => p.isActive !== false);

    const headers: Record<string, string> = {};
    if (!userId && !validateCoupon) {
      headers['Cache-Control'] = 'public, s-maxage=30, stale-while-revalidate=120';
    }

    return NextResponse.json(
      {
        success: true,
        products: activeProducts,
        allCount: products.length,
        userOrders,
      },
      { headers }
    );
  } catch (error: any) {
    return NextResponse.json({ success: true, products: DEFAULT_SHOP_PRODUCTS, userOrders: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productId, paymentMethod = 'WALLET', playerUid, inGameName, couponCode, shippingAddress, phoneNumber } = body;

    if (!userId || !productId) {
      return NextResponse.json({ message: 'User ID and Product ID are required.' }, { status: 400 });
    }

    const allProducts = await getDynamicProducts();
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      return NextResponse.json({ message: 'Selected shop item was not found.' }, { status: 404 });
    }

    if (!product.isActive) {
      return NextResponse.json({ message: 'This item is currently unavailable in the shop.' }, { status: 400 });
    }

    // Check stock if defined
    if (typeof product.stock === 'number' && product.stock <= 0) {
      return NextResponse.json({ message: 'This item is currently out of stock!' }, { status: 400 });
    }

    // UID requirement for FF items
    if (product.deliveryType === 'FF_UID' && (!playerUid || playerUid.trim().length < 5)) {
      return NextResponse.json({ message: 'Please enter a valid Free Fire Player UID (minimum 5 digits).' }, { status: 400 });
    }

    // Physical shipping address requirement
    if (product.deliveryType === 'PHYSICAL' && (!shippingAddress || shippingAddress.trim().length < 5)) {
      return NextResponse.json({ message: 'Please enter your complete shipping delivery address.' }, { status: 400 });
    }

    // Validate payment method compatibility
    const isCoins = paymentMethod === 'COINS';
    if (isCoins && product.currencyType === 'WALLET') {
      return NextResponse.json({ message: 'This item can only be purchased with Wallet Cash (৳).' }, { status: 400 });
    }
    if (!isCoins && product.currencyType === 'COINS') {
      return NextResponse.json({ message: 'This item can only be purchased with EZBD Coins (🪙).' }, { status: 400 });
    }

    // Base price
    let basePrice = isCoins ? Number(product.priceCoins) : Number(product.priceBdt);
    let discountAmount = 0;
    let appliedCoupon: string | null = null;

    // Apply coupon if provided
    if (couponCode && !isCoins) {
      const cleanCoupon = String(couponCode).trim().toUpperCase();
      const coupons = await getCoupons();
      const coupon = coupons.find(c => c.code.toUpperCase() === cleanCoupon && c.isActive);

      if (coupon) {
        const minOrder = coupon.minOrderBdt || 0;
        if (basePrice >= minOrder) {
          if (coupon.discountPercent) {
            discountAmount = Math.round((basePrice * coupon.discountPercent) / 100);
          } else if (coupon.discountAmountBdt) {
            discountAmount = Math.min(basePrice, coupon.discountAmountBdt);
          }
          appliedCoupon = coupon.code;
        }
      }
    }

    const requiredAmount = Math.max(1, basePrice - discountAmount);

    // Verify user balance
    const { data: user, error: uErr } = await supabaseAdmin
      .from('User')
      .select('id, name, email, walletBalance, coinBalance, freeFireUid, inGameName')
      .eq('id', userId)
      .single();

    if (uErr || !user) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    const currentCoinBal = Number(user.coinBalance || 0);
    const currentWalletBal = Number(user.walletBalance || 0);
    const userBalance = isCoins ? currentCoinBal : currentWalletBal;

    if (userBalance < requiredAmount) {
      return NextResponse.json({
        message: `Insufficient ${isCoins ? 'coins' : 'wallet balance'}! Required: ${isCoins ? requiredAmount + ' Coins' : '৳' + requiredAmount}, Available: ${isCoins ? currentCoinBal + ' Coins' : '৳' + currentWalletBal}`,
      }, { status: 400 });
    }

    // Deduct balance
    const newCoinBal = isCoins ? currentCoinBal - requiredAmount : currentCoinBal;
    const newWalletBal = isCoins ? currentWalletBal : currentWalletBal - requiredAmount;

    await supabaseAdmin
      .from('User')
      .update({
        coinBalance: newCoinBal,
        walletBalance: newWalletBal,
        freeFireUid: playerUid ? playerUid.trim() : user.freeFireUid,
        inGameName: inGameName ? inGameName.trim() : user.inGameName,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    // If product has limited stock, decrement stock
    if (typeof product.stock === 'number' && product.stock > 0) {
      try {
        const updatedProducts = allProducts.map(p => p.id === product.id ? { ...p, stock: Math.max(0, (p.stock || 1) - 1) } : p);
        await supabaseAdmin.from('SiteSetting').upsert({
          id: 'setting_GAMING_SHOP_ITEMS',
          key: 'GAMING_SHOP_ITEMS',
          value: JSON.stringify(updatedProducts),
          updatedAt: new Date().toISOString(),
        }, { onConflict: 'key' });
      } catch {}
    }

    // Create Order Record in Payment table as PENDING
    const orderId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveUid = playerUid || user.freeFireUid || 'N/A';
    const effectiveIgn = inGameName || user.inGameName || 'N/A';
    const phoneNote = phoneNumber ? ` | Phone: ${phoneNumber.trim()}` : '';
    const couponNote = appliedCoupon ? ` | Coupon: ${appliedCoupon} (-৳${discountAmount})` : '';
    const addressNote = shippingAddress ? ` | Address: ${shippingAddress.trim()}` : '';

    await supabaseAdmin.from('Payment').insert([{
      id: orderId,
      userId,
      userName: user.name,
      userEmail: user.email,
      method: isCoins ? 'COINS' : 'WALLET',
      amount: requiredAmount,
      trxId: `SHOP-${Date.now().toString().slice(-6)}`,
      status: 'PENDING',
      notes: `[Shop Order] ${product.name} | Category: ${product.category} | Method: ${isCoins ? 'COINS' : 'WALLET'} | UID: ${effectiveUid} | IGN: ${effectiveIgn} | Delivery: ${product.deliveryType || 'FF_UID'}${phoneNote}${couponNote}${addressNote}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    // Increment coupon usedCount
    if (appliedCoupon) {
      try {
        const coupons = await getCoupons();
        const updatedCoupons = coupons.map(c => 
          c.code.toUpperCase() === appliedCoupon?.toUpperCase() 
            ? { ...c, usedCount: (c.usedCount || 0) + 1 } 
            : c
        );
        await supabaseAdmin.from('SiteSetting').upsert({
          id: 'setting_SHOP_PROMO_COUPONS',
          key: 'SHOP_PROMO_COUPONS',
          value: JSON.stringify(updatedCoupons),
          updatedAt: new Date().toISOString(),
        }, { onConflict: 'key' });
      } catch {}
    }

    // 1. Send in-app pending notification to player
    try {
      const userNotifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: userNotifId,
        userId,
        title: `Shop Order Placed: ${product.name} ⏳`,
        message: `Your order for "${product.name}" (${isCoins ? requiredAmount + ' Coins 🪙' : '৳' + requiredAmount}) has been placed. Our team will verify and deliver to your UID (${effectiveUid}) shortly!`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    // 2. Send alert notification to Admin Panel users
    try {
      const { data: admins } = await supabaseAdmin
        .from('User')
        .select('id')
        .in('role', ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MODERATOR']);

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(adm => ({
          id: `notif_adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: adm.id,
          title: `🛍️ New Shop Order: ${product.name}`,
          message: `Player ${user.name} ordered "${product.name}" (${isCoins ? requiredAmount + ' Coins' : '৳' + requiredAmount}) for UID: ${effectiveUid}. Please deliver in Admin Shop.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }));

        await supabaseAdmin.from('Notification').insert(adminNotifications);
      }
    } catch (adminNotifErr) {
      console.warn('Failed to notify admins of shop order:', adminNotifErr);
    }

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: `Order placed successfully! Your order for "${product.name}" is pending admin delivery to UID: ${effectiveUid}.`,
      orderId,
      remainingCoinBalance: newCoinBal,
      remainingWalletBalance: newWalletBal,
      discountAmount,
    });
  } catch (error: any) {
    console.error('[POST /api/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process shop purchase.' }, { status: 500 });
  }
}
