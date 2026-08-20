import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, hasPermission } from '@/lib/admin-auth';
import { DEFAULT_SHOP_PRODUCTS, ShopProduct } from '@/lib/types';

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
      key: 'GAMING_SHOP_ITEMS',
      value: JSON.stringify(products),
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const products = await getDynamicProducts();

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
      stats: {
        totalOrders: orders.length,
        totalCashRevenue,
        totalCoinsSpent,
        completedDeliveries: orders.filter(o => o.status === 'VERIFIED').length,
        pendingDeliveries: orders.filter(o => o.status === 'PENDING').length,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/admin/shop]', error);
    return NextResponse.json({ products: DEFAULT_SHOP_PRODUCTS, orders: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, product, productId, products: newProductsList } = body;

    let currentProducts = await getDynamicProducts();

    if (action === 'ADD_PRODUCT' && product) {
      const newProduct: ShopProduct = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: product.name || 'New Gaming Item',
        description: product.description || '',
        category: product.category || 'DIAMONDS',
        currencyType: product.currencyType || 'BOTH',
        priceCoins: Number(product.priceCoins) || 0,
        priceBdt: Number(product.priceBdt) || 0,
        diamonds: product.diamonds ? Number(product.diamonds) : undefined,
        bonusDiamonds: product.bonusDiamonds ? Number(product.bonusDiamonds) : undefined,
        icon: product.icon || '🛍️',
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
      return NextResponse.json({ success: true, message: 'Shop product created successfully!', product: newProduct });
    }

    if (action === 'UPDATE_PRODUCT' && product && product.id) {
      currentProducts = currentProducts.map(p => {
        if (p.id === product.id) {
          return {
            ...p,
            ...product,
            priceCoins: Number(product.priceCoins) || 0,
            priceBdt: Number(product.priceBdt) || 0,
            diamonds: product.diamonds ? Number(product.diamonds) : undefined,
            bonusDiamonds: product.bonusDiamonds ? Number(product.bonusDiamonds) : undefined,
            stock: product.stock !== undefined && product.stock !== '' ? Number(product.stock) : undefined,
            isFeaturedOnHome: Boolean(product.isFeaturedOnHome),
          };
        }
        return p;
      });

      await saveDynamicProducts(currentProducts);
      return NextResponse.json({ success: true, message: 'Shop product updated successfully!' });
    }

    if (action === 'DELETE_PRODUCT' && productId) {
      currentProducts = currentProducts.filter(p => p.id !== productId);
      await saveDynamicProducts(currentProducts);
      return NextResponse.json({ success: true, message: 'Product deleted from shop inventory.' });
    }

    if (action === 'TOGGLE_ACTIVE' && productId) {
      currentProducts = currentProducts.map(p => {
        if (p.id === productId) {
          return { ...p, isActive: !p.isActive };
        }
        return p;
      });
      await saveDynamicProducts(currentProducts);
      return NextResponse.json({ success: true, message: 'Product status updated.' });
    }

    if (action === 'TOGGLE_HOME_FEATURED' && productId) {
      currentProducts = currentProducts.map(p => {
        if (p.id === productId) {
          return { ...p, isFeaturedOnHome: !p.isFeaturedOnHome };
        }
        return p;
      });
      await saveDynamicProducts(currentProducts);
      return NextResponse.json({ success: true, message: 'Homepage featured status updated.' });
    }

    if (action === 'RESET_DEFAULTS') {
      await saveDynamicProducts(DEFAULT_SHOP_PRODUCTS);
      return NextResponse.json({ success: true, message: 'Shop inventory reset to default items.', products: DEFAULT_SHOP_PRODUCTS });
    }

    if (action === 'SAVE_ALL' && Array.isArray(newProductsList)) {
      await saveDynamicProducts(newProductsList);
      return NextResponse.json({ success: true, message: 'All shop products saved!' });
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

    const body = await request.json();
    const { orderId, action, redeemCode } = body;

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

    if (action === 'DELIVER') {
      const codeNote = redeemCode ? ` [Voucher: ${redeemCode}]` : ' [Delivered to FF UID]';
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: `${order.notes || ''}${codeNote}`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Extract item name and UID from notes if available
      const notesStr = order.notes || '';
      const itemMatch = notesStr.match(/\[Shop Order\]\s*([^|]+)/i);
      const uidMatch = notesStr.match(/UID:\s*([^|]+)/i);
      const itemName = itemMatch ? itemMatch[1].trim() : 'Shop Item';
      const targetUid = uidMatch ? uidMatch[1].trim() : '';

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

      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'REJECTED',
          notes: `${order.notes || ''} [CANCELLED & REFUNDED ${refundAmount} ${isCoins ? 'Coins' : 'BDT'}]`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);

      const notesStr = order.notes || '';
      const itemMatch = notesStr.match(/\[Shop Order\]\s*([^|]+)/i);
      const itemName = itemMatch ? itemMatch[1].trim() : 'Shop Item';

      // Send notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: order.userId,
          title: `❌ Shop Order Cancelled & Refunded: ${itemName}`,
          message: `Your shop order for "${itemName}" was cancelled by admin. 100% of your payment (${refundAmount} ${isCoins ? 'Coins 🪙' : '৳ BDT'}) has been refunded back to your account balance.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      return NextResponse.json({ success: true, message: 'Order refunded and cancelled.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/admin/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update order.' }, { status: 500 });
  }
}
