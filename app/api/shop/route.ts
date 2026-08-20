import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { DEFAULT_SHOP_PRODUCTS, ShopProduct } from '@/lib/types';

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

export async function GET() {
  try {
    const products = await getDynamicProducts();
    const activeProducts = products.filter(p => p.isActive !== false);

    return NextResponse.json({
      success: true,
      products: activeProducts,
      allCount: products.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: true, products: DEFAULT_SHOP_PRODUCTS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productId, paymentMethod = 'WALLET', playerUid, inGameName } = body;

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
      return NextResponse.json({ message: 'Please enter a valid Free Fire Player UID.' }, { status: 400 });
    }

    // Validate payment method compatibility
    const isCoins = paymentMethod === 'COINS';
    if (isCoins && product.currencyType === 'WALLET') {
      return NextResponse.json({ message: 'This item can only be purchased with Wallet Cash (৳).' }, { status: 400 });
    }
    if (!isCoins && product.currencyType === 'COINS') {
      return NextResponse.json({ message: 'This item can only be purchased with BRK Coins (🪙).' }, { status: 400 });
    }

    // Verify user balance
    const { data: user, error: uErr } = await supabaseAdmin
      .from('User')
      .select('id, name, email, walletBalance, coinBalance, freeFireUid')
      .eq('id', userId)
      .single();

    if (uErr || !user) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    const requiredAmount = isCoins ? Number(product.priceCoins) : Number(product.priceBdt);
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
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    // Create Order Record in Payment table
    const orderId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveUid = playerUid || user.freeFireUid || 'N/A';
    
    await supabaseAdmin.from('Payment').insert([{
      id: orderId,
      userId,
      userName: user.name,
      userEmail: user.email,
      method: isCoins ? 'COINS' : 'WALLET',
      amount: requiredAmount,
      trxId: `SHOP-${Date.now().toString().slice(-6)}`,
      status: 'VERIFIED',
      notes: `[Shop Order] ${product.name} | Category: ${product.category} | Method: ${isCoins ? 'COINS' : 'WALLET'} | UID: ${effectiveUid} | IGN: ${inGameName || 'N/A'} | Delivery: ${product.deliveryType || 'FF_UID'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    // Send in-app confirmation notification (safely)
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await supabaseAdmin.from('Notification').insert([{
        id: notifId,
        userId,
        title: `Shop Purchase Successful: ${product.name} 🛍️`,
        message: `Your purchase of ${product.name} for ${isCoins ? requiredAmount + ' Coins' : '৳' + requiredAmount} is confirmed! Item is being delivered to your UID (${effectiveUid}).`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully purchased "${product.name}"! Delivered to UID: ${effectiveUid}`,
      orderId,
      remainingCoinBalance: newCoinBal,
      remainingWalletBalance: newWalletBal,
    });
  } catch (error: any) {
    console.error('[POST /api/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process shop purchase.' }, { status: 500 });
  }
}
