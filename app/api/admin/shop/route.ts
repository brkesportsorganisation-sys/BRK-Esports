import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, hasPermission, logAdminAction } from '@/lib/admin-auth';
import { DEFAULT_SHOP_PRODUCTS, ShopProduct, ShopCoupon } from '@/lib/types';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

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

async function saveDynamicProducts(products: ShopProduct[]) {
  const { error } = await supabaseAdmin
    .from('SiteSetting')
    .upsert({
      id: 'setting_GAMING_SHOP_ITEMS',
      key: 'GAMING_SHOP_ITEMS',
      value: JSON.stringify(products),
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
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
  return [
    {
      id: 'cp_welcome10',
      code: 'WELCOME10',
      discountPercent: 10,
      minOrderBdt: 100,
      maxUses: 500,
      usedCount: 14,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cp_diamond50',
      code: 'BOOYAH50',
      discountAmountBdt: 50,
      minOrderBdt: 500,
      maxUses: 100,
      usedCount: 28,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];
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

    const products = await getDynamicProducts();
    const coupons = await getCoupons();

    // Query Payment table for Shop & Diamond Orders
    const { data: payments, error } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .or('notes.ilike.%Shop Order%,notes.ilike.%Diamond Order%')
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);

    const orders = payments || [];
    const totalCashRevenue = orders
      .filter(o => o.method !== 'COINS' && o.status === 'VERIFIED')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const totalCoinsSpent = orders
      .filter(o => o.method === 'COINS' && o.status === 'VERIFIED')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    return NextResponse.json({
      success: true,
      products,
      orders,
      coupons,
      stats: {
        totalOrders: orders.length,
        totalCashRevenue,
        totalCoinsSpent,
        completedDeliveries: orders.filter(o => o.status === 'VERIFIED').length,
        processingDeliveries: orders.filter(o => o.status === 'PROCESSING').length,
        pendingDeliveries: orders.filter(o => o.status === 'PENDING').length,
        rejectedDeliveries: orders.filter(o => o.status === 'REJECTED').length,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/admin/shop]', error);
    return NextResponse.json({ products: DEFAULT_SHOP_PRODUCTS, orders: [], coupons: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const adminUsername = session?.sub || session?.email || 'admin';
    const body = await request.json();
    const { action, product, productId, products: newProductsList, coupon, couponId } = body;

    let currentProducts = await getDynamicProducts();
    let currentCoupons = await getCoupons();

    // Product actions
    if (action === 'ADD_PRODUCT' && product) {
      const isDiamondCat = (product.category || 'DIAMONDS') === 'DIAMONDS';
      const newProduct: ShopProduct = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: product.name || 'New Gaming Item',
        description: product.description || '',
        category: product.category || 'DIAMONDS',
        currencyType: product.currencyType || 'BOTH',
        priceCoins: Number(product.priceCoins) || 0,
        priceBdt: Number(product.priceBdt) || 0,
        originalPriceBdt: product.originalPriceBdt ? Number(product.originalPriceBdt) : undefined,
        diamonds: isDiamondCat && product.diamonds ? Number(product.diamonds) : undefined,
        bonusDiamonds: isDiamondCat && product.bonusDiamonds ? Number(product.bonusDiamonds) : undefined,
        icon: product.icon || (isDiamondCat ? '💎' : '🛍️'),
        imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
        badge: product.badge || '',
        stock: product.stock !== undefined && product.stock !== '' ? Number(product.stock) : undefined,
        isActive: product.isActive !== false,
        isFeaturedOnHome: Boolean(product.isFeaturedOnHome),
        deliveryType: product.deliveryType || 'FF_UID',
        createdAt: new Date().toISOString(),
      };

      currentProducts = [newProduct, ...currentProducts];
      await saveDynamicProducts(currentProducts);
      await logAdminAction(adminUsername, 'ADD_PRODUCT', `Added shop product: "${newProduct.name}" (৳${newProduct.priceBdt})`, 'SHOP_PRODUCT', newProduct.id);
      return NextResponse.json({ success: true, message: 'Shop product created successfully!', product: newProduct });
    }

    if (action === 'UPDATE_PRODUCT' && product && product.id) {
      const isDiamondCat = (product.category || 'DIAMONDS') === 'DIAMONDS';
      currentProducts = currentProducts.map(p => {
        if (p.id === product.id) {
          return {
            ...p,
            ...product,
            priceCoins: Number(product.priceCoins) || 0,
            priceBdt: Number(product.priceBdt) || 0,
            originalPriceBdt: product.originalPriceBdt ? Number(product.originalPriceBdt) : undefined,
            diamonds: isDiamondCat && product.diamonds ? Number(product.diamonds) : undefined,
            bonusDiamonds: isDiamondCat && product.bonusDiamonds ? Number(product.bonusDiamonds) : undefined,
            stock: product.stock !== undefined && product.stock !== '' ? Number(product.stock) : undefined,
            isFeaturedOnHome: Boolean(product.isFeaturedOnHome),
          };
        }
        return p;
      });

      await saveDynamicProducts(currentProducts);
      await logAdminAction(adminUsername, 'UPDATE_PRODUCT', `Updated shop product: "${product.name || product.id}"`, 'SHOP_PRODUCT', product.id);
      return NextResponse.json({ success: true, message: 'Shop product updated successfully!' });
    }

    if (action === 'DELETE_PRODUCT' && productId) {
      const deletedItem = currentProducts.find(p => p.id === productId);
      currentProducts = currentProducts.filter(p => p.id !== productId);
      await saveDynamicProducts(currentProducts);
      await logAdminAction(adminUsername, 'DELETE_PRODUCT', `Deleted shop product: "${deletedItem?.name || productId}"`, 'SHOP_PRODUCT', productId);
      return NextResponse.json({ success: true, message: 'Product deleted from shop inventory.' });
    }

    if (action === 'TOGGLE_ACTIVE' && productId) {
      let targetName = productId;
      currentProducts = currentProducts.map(p => {
        if (p.id === productId) {
          targetName = p.name;
          return { ...p, isActive: !p.isActive };
        }
        return p;
      });
      await saveDynamicProducts(currentProducts);
      await logAdminAction(adminUsername, 'TOGGLE_PRODUCT_STATUS', `Toggled active status for product: "${targetName}"`, 'SHOP_PRODUCT', productId);
      return NextResponse.json({ success: true, message: 'Product status updated.' });
    }

    if (action === 'TOGGLE_HOME_FEATURED' && productId) {
      let targetName = productId;
      currentProducts = currentProducts.map(p => {
        if (p.id === productId) {
          targetName = p.name;
          return { ...p, isFeaturedOnHome: !p.isFeaturedOnHome };
        }
        return p;
      });
      await saveDynamicProducts(currentProducts);
      await logAdminAction(adminUsername, 'TOGGLE_HOME_FEATURED', `Toggled homepage feature for: "${targetName}"`, 'SHOP_PRODUCT', productId);
      return NextResponse.json({ success: true, message: 'Homepage featured status updated.' });
    }

    if (action === 'RESET_DEFAULTS') {
      await saveDynamicProducts(DEFAULT_SHOP_PRODUCTS);
      await logAdminAction(adminUsername, 'RESET_SHOP_PRODUCTS', 'Reset shop catalog to default gaming inventory', 'SHOP_CATALOG');
      return NextResponse.json({ success: true, message: 'Shop inventory reset to default items.', products: DEFAULT_SHOP_PRODUCTS });
    }

    if (action === 'SAVE_ALL' && Array.isArray(newProductsList)) {
      await saveDynamicProducts(newProductsList);
      await logAdminAction(adminUsername, 'BULK_UPDATE_PRODUCTS', `Saved ${newProductsList.length} products to shop catalog`, 'SHOP_CATALOG');
      return NextResponse.json({ success: true, message: 'All shop products saved!' });
    }

    // Coupon actions
    if (action === 'ADD_COUPON' && coupon) {
      const cleanCode = String(coupon.code || '').trim().toUpperCase();
      if (!cleanCode) {
        return NextResponse.json({ message: 'Coupon code is required.' }, { status: 400 });
      }
      const newCoupon: ShopCoupon = {
        id: `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: cleanCode,
        discountPercent: coupon.discountPercent ? Number(coupon.discountPercent) : undefined,
        discountAmountBdt: coupon.discountAmountBdt ? Number(coupon.discountAmountBdt) : undefined,
        minOrderBdt: coupon.minOrderBdt ? Number(coupon.minOrderBdt) : undefined,
        maxUses: coupon.maxUses ? Number(coupon.maxUses) : undefined,
        usedCount: 0,
        expiryDate: coupon.expiryDate || undefined,
        isActive: coupon.isActive !== false,
        createdAt: new Date().toISOString(),
      };
      currentCoupons = [newCoupon, ...currentCoupons];
      await saveCoupons(currentCoupons);
      await logAdminAction(adminUsername, 'CREATE_COUPON', `Created promo coupon: ${cleanCode}`, 'COUPON', newCoupon.id);
      return NextResponse.json({ success: true, message: `Coupon "${cleanCode}" created!`, coupon: newCoupon });
    }

    if (action === 'DELETE_COUPON' && couponId) {
      currentCoupons = currentCoupons.filter(c => c.id !== couponId);
      await saveCoupons(currentCoupons);
      await logAdminAction(adminUsername, 'DELETE_COUPON', `Deleted coupon ID: ${couponId}`, 'COUPON', couponId);
      return NextResponse.json({ success: true, message: 'Coupon removed.' });
    }

    if (action === 'TOGGLE_COUPON' && couponId) {
      currentCoupons = currentCoupons.map(c => c.id === couponId ? { ...c, isActive: !c.isActive } : c);
      await saveCoupons(currentCoupons);
      await logAdminAction(adminUsername, 'TOGGLE_COUPON', `Toggled status for coupon ID: ${couponId}`, 'COUPON', couponId);
      return NextResponse.json({ success: true, message: 'Coupon status toggled.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[POST /api/admin/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update shop inventory.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const adminUsername = session?.sub || session?.email || 'admin';
    const body = await request.json();
    const { orderId, action, redeemCode, note } = body;

    if (!orderId || !action) {
      return NextResponse.json({ message: 'Order ID and action are required.' }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    // Extract item name and UID from notes if available
    const notesStr = order.notes || '';
    const itemMatch = notesStr.match(/\[Shop Order\]\s*([^|]+)/i);
    const uidMatch = notesStr.match(/UID:\s*([^|]+)/i);
    const itemName = itemMatch ? itemMatch[1].trim() : 'Shop Item';
    const targetUid = uidMatch ? uidMatch[1].trim() : '';

    if (action === 'PROCESSING') {
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'PROCESSING',
          notes: `${order.notes || ''} [Processing Started]`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Send notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: order.userId,
          title: `⏳ Order Processing: ${itemName}`,
          message: `Your shop order for "${itemName}" is currently being processed by our top-up team. Delivery in progress!`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      await logAdminAction(adminUsername, 'ORDER_PROCESSING', `Marked top-up order ${orderId} (${itemName}) as processing`, 'SHOP_ORDER', orderId);
      return NextResponse.json({ success: true, message: 'Order marked as processing.' });
    }

    if (action === 'DELIVER') {
      const codeNote = redeemCode ? ` [Voucher: ${redeemCode}]` : ' [Delivered to FF UID]';
      const adminNote = note ? ` [Admin: ${note}]` : '';
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: `${order.notes || ''}${codeNote}${adminNote}`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Send notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: order.userId,
          title: `✅ Shop Order Delivered: ${itemName}! 💎🎁`,
          message: redeemCode
            ? `Your shop order for "${itemName}" is confirmed and delivered! Redeem/Voucher Code: ${redeemCode}`
            : `Your order for "${itemName}" has been successfully verified & delivered to your account (UID: ${targetUid || 'Registered UID'})! Enjoy your game!`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      await logAdminAction(adminUsername, 'ORDER_DELIVERED', `Delivered top-up order ${orderId} (${itemName}) to player UID: ${targetUid || order.userId}`, 'SHOP_ORDER', orderId);
      return NextResponse.json({ success: true, message: 'Order marked as delivered and player notified.' });
    }

    if (action === 'REFUND') {
      // Refund balance back to user
      const isCoins = order.method === 'COINS';
      const refundAmount = Number(order.amount) || 0;

      const { data: user } = await supabaseAdmin
        .from('User')
        .select('id, walletBalance, coinBalance')
        .eq('id', order.userId)
        .single();

      if (user) {
        if (isCoins) {
          await supabaseAdmin
            .from('User')
            .update({ coinBalance: Number(user.coinBalance || 0) + refundAmount })
            .eq('id', user.id);
        } else {
          await supabaseAdmin
            .from('User')
            .update({ walletBalance: Number(user.walletBalance || 0) + refundAmount })
            .eq('id', user.id);
        }
      }

      const cancelReason = note ? ` (${note})` : '';
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'REJECTED',
          notes: `${order.notes || ''} [CANCELLED & REFUNDED ${refundAmount} ${isCoins ? 'Coins' : 'BDT'}${cancelReason}]`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Send notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: order.userId,
          title: `❌ Shop Order Cancelled & Refunded: ${itemName}`,
          message: `Your shop order for "${itemName}" was cancelled by admin${cancelReason}. 100% of your payment (${refundAmount} ${isCoins ? 'Coins 🪙' : '৳ BDT'}) has been refunded back to your account balance.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      await logAdminAction(adminUsername, 'ORDER_REFUNDED', `Cancelled & refunded order ${orderId} (${itemName}) - ${refundAmount} ${isCoins ? 'Coins' : 'BDT'}`, 'SHOP_ORDER', orderId);
      return NextResponse.json({ success: true, message: 'Order refunded and cancelled.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/admin/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update order.' }, { status: 500 });
  }
}
