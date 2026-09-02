'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import ShopBannerSlider from '@/components/shop/ShopBannerSlider';
import { db } from '@/lib/db';
import { initialBanners } from '@/lib/mock-data';
import { User, ShopProduct, DEFAULT_SHOP_PRODUCTS, Banner } from '@/lib/types';
import { 
  Diamond, 
  Sparkles, 
  Crown, 
  Zap, 
  Check, 
  Coins, 
  DollarSign, 
  ShieldCheck, 
  Loader2, 
  ArrowRight, 
  Gift, 
  Search, 
  ShoppingCart, 
  Tag, 
  Package, 
  Layers, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Clock, 
  Ticket,
  Shirt,
  Percent,
  CheckCheck,
  History,
  Copy
} from 'lucide-react';

export default function GamingShopPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>(DEFAULT_SHOP_PRODUCTS);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<'STORE' | 'MY_ORDERS'>('STORE');
  const [shopBanners, setShopBanners] = useState<Banner[]>([]);
  const [slideInterval, setSlideInterval] = useState<number>(4000);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'COINS' | 'WALLET'>('ALL');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Purchase Modal State
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'COINS'>('COINS');
  const [playerUid, setPlayerUid] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent?: number; discountAmountBdt?: number; minOrderBdt?: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string; orderId?: string; discountAmount?: number } | null>(null);

  const loadShopProducts = async () => {
    try {
      const user = db.getCurrentUser();
      const url = user?.id ? `/api/shop?userId=${user.id}` : '/api/shop';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
        if (data.userOrders && Array.isArray(data.userOrders)) {
          setUserOrders(data.userOrders);
        }
      }
    } catch (err) {
      console.warn('Failed to load shop items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/banners', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        let freshBanners: Banner[] = [];

        if (data.shopBanners && Array.isArray(data.shopBanners) && data.shopBanners.length > 0) {
          freshBanners = data.shopBanners.filter((b: Banner) => b.isActive);
        } else if (data.shopBanner && data.shopBanner.isActive) {
          freshBanners = [data.shopBanner];
        } else if (data.banners && Array.isArray(data.banners)) {
          freshBanners = data.banners.filter((b: Banner) => b.placement === 'SHOP_BANNER' && b.isActive);
        }

        if (freshBanners.length > 0) {
          setShopBanners(freshBanners);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('ezbd_shop_banners', JSON.stringify(freshBanners));
            }
          } catch {}
        }

        if (data.settings?.autoSlideInterval) {
          setSlideInterval(data.settings.autoSlideInterval);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch latest shop banners:', err);
    }
  }, []);

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.freeFireUid) {
      setPlayerUid(user.freeFireUid);
    }
    if (user?.inGameName) {
      setInGameName(user.inGameName);
    }

    // Try reading cached banners from localStorage first
    try {
      if (typeof window !== 'undefined') {
        const localSaved = localStorage.getItem('ezbd_shop_banners');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setShopBanners(parsed);
          }
        }
      }
    } catch {}

    const localUser = db.getCurrentUser();
    if (localUser) {
      setCurrentUser(localUser);
      if (localUser.freeFireUid) setPlayerUid(localUser.freeFireUid);
      if (localUser.inGameName) setInGameName(localUser.inGameName);
      if (localUser.phone || (localUser as any).whatsApp || (localUser as any).whatsapp) setPhoneNumber(localUser.phone || (localUser as any).whatsApp || (localUser as any).whatsapp || '');
      if (localUser.id) {
        fetch(`/api/auth/me?id=${localUser.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setCurrentUser(data.user);
              db.setCurrentUser(data.user);
              if (data.user.freeFireUid) setPlayerUid(data.user.freeFireUid);
              if (data.user.inGameName) setInGameName(data.user.inGameName);
              if (data.user.phone || data.user.whatsapp) setPhoneNumber(data.user.phone || data.user.whatsapp || '');
            }
          })
          .catch(() => {});
      }
    }

    fetchLatestBanners();
    loadShopProducts();
  }, [fetchLatestBanners]);

  const openPurchaseModal = (product: ShopProduct) => {
    setSelectedProduct(product);
    setPurchaseResult(null);
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');

    if (product.currencyType === 'COINS') {
      setPaymentMethod('COINS');
    } else if (product.currencyType === 'WALLET') {
      setPaymentMethod('WALLET');
    } else {
      const hasCoins = (currentUser?.coinBalance || 0) >= (product.priceCoins || 0);
      setPaymentMethod(hasCoins ? 'COINS' : 'WALLET');
    }
  };

  const calcDiscount = () => {
    if (!appliedCoupon || !selectedProduct) return 0;
    const base = selectedProduct.priceBdt || 0;
    if (appliedCoupon.minOrderBdt && base < appliedCoupon.minOrderBdt) return 0;
    if (appliedCoupon.discountPercent) {
      return Math.round((base * appliedCoupon.discountPercent) / 100);
    }
    if (appliedCoupon.discountAmountBdt) {
      return Math.min(base, appliedCoupon.discountAmountBdt);
    }
    return 0;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await fetch(`/api/shop?coupon=${encodeURIComponent(couponCode.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.coupon) {
        if (selectedProduct && data.coupon.minOrderBdt && selectedProduct.priceBdt < data.coupon.minOrderBdt) {
          setCouponError(`Min. spend of ৳${data.coupon.minOrderBdt} required for this coupon.`);
          setAppliedCoupon(null);
          return;
        }
        setAppliedCoupon(data.coupon);
      } else {
        setCouponError(data.message || 'Invalid or expired coupon code.');
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('Failed to validate coupon code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    if (!selectedProduct) return;

    if (selectedProduct.deliveryType === 'FF_UID' && (!playerUid || playerUid.trim().length < 5)) {
      alert('Please enter a valid Free Fire Player UID!');
      return;
    }

    if (selectedProduct.deliveryType === 'PHYSICAL' && (!shippingAddress || shippingAddress.trim().length < 5)) {
      alert('Please enter your shipping delivery address!');
      return;
    }

    setIsPurchasing(true);
    setPurchaseResult(null);

    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          productId: selectedProduct.id,
          paymentMethod,
          playerUid: playerUid.trim(),
          inGameName: inGameName.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPurchaseResult({
          success: true,
          message: data.message || 'Item purchased successfully!',
          orderId: data.orderId,
          discountAmount: data.discountAmount,
        });

        const updated = {
          ...currentUser,
          coinBalance: data.remainingCoinBalance !== undefined ? data.remainingCoinBalance : currentUser.coinBalance,
          walletBalance: data.remainingWalletBalance !== undefined ? data.remainingWalletBalance : currentUser.walletBalance,
        };
        setCurrentUser(updated);
        db.setCurrentUser(updated);

        // Reload user orders
        await loadShopProducts();
      } else {
        setPurchaseResult({
          success: false,
          message: data.message || 'Failed to complete order. Please check balance.',
        });
      }
    } catch (err: any) {
      setPurchaseResult({
        success: false,
        message: err.message || 'Network error processing purchase.',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    
    let matchesCurrency = true;
    if (currencyFilter === 'COINS') {
      matchesCurrency = p.currencyType === 'COINS' || p.currencyType === 'BOTH';
    } else if (currencyFilter === 'WALLET') {
      matchesCurrency = p.currencyType === 'WALLET' || p.currencyType === 'BOTH';
    }

    const matchesQuery = searchQuery.trim() === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesCurrency && matchesQuery;
  });

  const categories = [
    { id: 'ALL', label: 'All Items', icon: Package },
    { id: 'DIAMONDS', label: 'FF Diamonds', icon: Diamond },
    { id: 'PASSES', label: 'Memberships', icon: Crown },
    { id: 'SKINS', label: 'Evo & Skins', icon: Gift },
    { id: 'CRATES', label: 'Airdrop & Crates', icon: Sparkles },
    { id: 'VOUCHERS', label: 'Gift Vouchers', icon: Ticket },
    { id: 'MERCH', label: 'Esports Merch', icon: Shirt },
  ];

  // Helper parsing notes
  const parseOrderDetails = (notes: string) => {
    const itemMatch = notes.match(/\[Shop Order\]\s*([^|]+)/i);
    const uidMatch = notes.match(/UID:\s*([^|]+)/i);
    const voucherMatch = notes.match(/\[Voucher:\s*([^\]]+)\]/i);

    return {
      itemName: itemMatch ? itemMatch[1].trim() : 'Shop Package',
      uid: uidMatch ? uidMatch[1].trim() : '',
      voucherCode: voucherMatch ? voucherMatch[1].trim() : null,
    };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-body flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Multi-Banner Auto-Slider & Quick Balances */}
        <ShopBannerSlider
          banners={shopBanners}
          currentUser={currentUser}
          slideInterval={slideInterval}
        />

        {/* Main Tab Navigation: Store vs My Purchases */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('STORE')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-heading font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'STORE'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-brand-orange" />
              <span>Shop Catalog ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('MY_ORDERS')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-heading font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'MY_ORDERS'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 text-emerald-500" />
              <span>My Purchases ({userOrders.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Secure Free Fire Player UID Top-Up</span>
          </div>
        </div>

        {activeMainTab === 'STORE' ? (
          <>
            {/* Search & Filter Controls */}
            <div className="space-y-4">
              
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search diamonds, memberships, vouchers, passes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-orange shadow-2xs font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Currency Filter */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs w-full sm:w-auto">
                  <button
                    onClick={() => setCurrencyFilter('ALL')}
                    className={`flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currencyFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Currencies
                  </button>
                  <button
                    onClick={() => setCurrencyFilter('COINS')}
                    className={`flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      currencyFilter === 'COINS'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>🪙 Coin Shop</span>
                  </button>
                  <button
                    onClick={() => setCurrencyFilter('WALLET')}
                    className={`flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      currencyFilter === 'WALLET'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>৳ Taka (Wallet)</span>
                  </button>
                </div>

              </div>

              {/* Category Filter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-2.5 rounded-2xl text-xs font-heading font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer text-center w-full shadow-2xs ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-orange-500/20 scale-[1.02]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-brand-orange'}`} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto" />
                <div className="text-xs text-slate-500 font-bold">Loading gaming shop packages...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-4">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
                <div>
                  <h3 className="font-heading font-black text-slate-800 text-lg">No Items Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    No shop items match your search or filter criteria. Try selecting another category.
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedCategory('ALL'); setCurrencyFilter('ALL'); setSearchQuery(''); }}
                  className="px-5 py-2.5 rounded-xl bg-brand-orange text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const discount = product.originalPriceBdt && product.originalPriceBdt > product.priceBdt
                    ? Math.round(((product.originalPriceBdt - product.priceBdt) / product.originalPriceBdt) * 100)
                    : null;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-3xl border border-slate-200 hover:border-brand-orange/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                    >
                      {/* Badge / Discount Tag */}
                      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                        {product.badge && (
                          <div className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md">
                            {product.badge}
                          </div>
                        )}
                        {discount && (
                          <div className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-md font-mono">
                            SAVE {discount}%
                          </div>
                        )}
                      </div>

                      {/* Top Image Box (1:1 Aspect Ratio) */}
                      <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
                        <Image
                          src={product.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500'}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Body Content */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        
                        <div className="space-y-1.5">
                          <h3 className="font-heading font-black text-slate-900 text-base leading-tight group-hover:text-brand-orange transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {product.description || 'Instant Free Fire game delivery directly to your account ID.'}
                          </p>
                        </div>

                        {/* Pricing Box */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                          
                          {(product.currencyType === 'WALLET' || product.currencyType === 'BOTH') && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-semibold">Cash / Wallet:</span>
                              <div className="flex items-center gap-1.5">
                                <strong className="text-emerald-600 font-black text-sm">
                                  ৳ {product.priceBdt.toLocaleString()}
                                </strong>
                                {product.originalPriceBdt && product.originalPriceBdt > product.priceBdt && (
                                  <span className="text-slate-400 line-through text-[11px] font-mono">
                                    ৳{product.originalPriceBdt}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {(product.currencyType === 'COINS' || product.currencyType === 'BOTH') && (
                            <div className={`flex items-center justify-between text-xs ${
                              product.currencyType === 'BOTH' ? 'border-t border-slate-200 pt-1.5' : ''
                            }`}>
                              <span className="text-slate-500 font-semibold flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-amber-500" />
                                <span>Coins:</span>
                              </span>
                              <strong className="text-amber-600 font-black text-sm">
                                {product.priceCoins.toLocaleString()} 🪙
                              </strong>
                            </div>
                          )}

                        </div>

                        {/* CTA Button */}
                        <button
                          onClick={() => openPurchaseModal(product)}
                          className={`w-full py-3 px-4 rounded-2xl font-heading font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            product.currencyType === 'COINS'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                              : 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                          }`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>
                            {product.currencyType === 'COINS' ? 'Redeem With Coins' : 'Top-Up / Buy Now'}
                          </span>
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* MY PURCHASES TAB */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-heading font-black text-lg text-slate-900">My Top-Up Orders & History</h2>
                <p className="text-xs text-slate-500">Track real-time delivery status of your diamond packages and redeem codes.</p>
              </div>
              <button
                onClick={loadShopProducts}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Refresh
              </button>
            </div>

            {userOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No Orders Placed Yet</p>
                <p>Items you purchase from the shop will appear here for live tracking.</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* ── MOBILE VIEW: Clean, Stacked Cards (NO Horizontal Scroll!) ── */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {userOrders.map((order) => {
                    const details = parseOrderDetails(order.notes || '');

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 shadow-2xs"
                      >
                        {/* Top: Name & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-heading font-black text-sm text-slate-900 leading-tight">
                              {details.itemName}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>

                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 flex-shrink-0 ${
                            order.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : order.status === 'PROCESSING'
                              ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                              : order.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {order.status === 'VERIFIED' ? 'DELIVERED ✅' : order.status === 'PENDING' ? 'PENDING ⏳' : order.status}
                          </span>
                        </div>

                        {/* Middle: UID & Amount */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Player UID</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="font-mono font-bold text-slate-900">{details.uid || 'N/A'}</span>
                              {details.uid && (
                                <button
                                  onClick={() => handleCopy(details.uid, `uid_mob_${order.id}`)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5"
                                  title="Copy UID"
                                >
                                  {copiedOrderId === `uid_mob_${order.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Amount Paid</span>
                            <span className="font-heading font-black text-sm text-emerald-600">
                              {order.method === 'COINS' ? `${order.amount} 🪙` : `৳${order.amount}`}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Voucher Code (if delivered) */}
                        {details.voucherCode && (
                          <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[9px] text-slate-400 block uppercase font-bold">Digital Redeem Code</span>
                              <span className="font-mono font-bold text-emerald-400">{details.voucherCode}</span>
                            </div>

                            <button
                              onClick={() => handleCopy(details.voucherCode || '', order.id)}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold flex items-center gap-1"
                            >
                              {copiedOrderId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedOrderId === order.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── DESKTOP VIEW: Spacious Table ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Item</th>
                        <th className="p-3">UID</th>
                        <th className="p-3">Amount Paid</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Voucher / Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userOrders.map((order) => {
                        const details = parseOrderDetails(order.notes || '');

                        return (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                              {new Date(order.createdAt).toLocaleDateString([], { dateStyle: 'short' })}
                            </td>
                            <td className="p-3 font-bold text-slate-900">{details.itemName}</td>
                            <td className="p-3 font-mono text-slate-700 font-bold">{details.uid || '-'}</td>
                            <td className="p-3 font-mono font-bold text-emerald-600 whitespace-nowrap">
                              {order.method === 'COINS' ? `${order.amount} 🪙` : `৳${order.amount}`}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                                order.status === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : order.status === 'PROCESSING'
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : order.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {order.status === 'VERIFIED' ? 'DELIVERED ✅' : order.status === 'PENDING' ? 'PENDING ⏳' : order.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {details.voucherCode ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs">
                                  <span>{details.voucherCode}</span>
                                  <button
                                    onClick={() => handleCopy(details.voucherCode || '', order.id)}
                                    className="text-slate-400 hover:text-white"
                                    title="Copy Code"
                                  >
                                    {copiedOrderId === order.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Buy / Redeem Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {selectedProduct.imageUrl ? (
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                    <Image
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center text-lg shadow-xs shrink-0">
                    {selectedProduct.category === 'DIAMONDS' ? '💎' : selectedProduct.icon || '🛍️'}
                  </div>
                )}
                <div>
                  <h3 className="font-heading font-black text-base sm:text-lg text-slate-900 leading-tight">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-slate-500">Official Gaming Shop Item</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Purchase Result Message */}
            {purchaseResult ? (
              <div className={`p-6 rounded-2xl border text-center space-y-3.5 ${
                purchaseResult.success 
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                {purchaseResult.success ? (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
                    <Clock className="w-7 h-7" />
                  </div>
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
                )}
                
                <div className="space-y-1.5">
                  <h4 className="font-heading font-black text-lg text-slate-900">
                    {purchaseResult.success ? 'Order Placed (Pending) ⏳' : 'Purchase Failed'}
                  </h4>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-sm mx-auto">
                    {purchaseResult.message}
                  </p>

                  {purchaseResult.success && (
                    <div className="p-3.5 bg-white/90 rounded-2xl border border-amber-200/80 text-[11px] text-slate-600 space-y-1.5 text-left mt-2 shadow-2xs">
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-500">Order ID:</span>
                        <strong className="text-slate-900">{purchaseResult.orderId}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className="font-bold text-amber-600">Pending Admin Verification ⏳</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-100 leading-normal">
                        অ্যাডমিন প্যানেল থেকে কনফার্ম হওয়া মাত্রই আইটেমটি আপনার গেমে ডেলিভারি হবে এবং আপনার ইন-অ্যাপ নোটিফিকেশনে কনফার্মেশন মেসেজ চলে যাবে।
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setSelectedProduct(null); setActiveMainTab('MY_ORDERS'); }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  View in My Orders
                </button>
              </div>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-5">
                
                {/* Product Summary Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Category:</span>
                    <strong className="text-slate-800 font-bold">{selectedProduct.category}</strong>
                  </div>
                  {selectedProduct.category === 'DIAMONDS' && selectedProduct.diamonds && Number(selectedProduct.diamonds) > 0 && (
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Diamonds:</span>
                      <strong className="text-cyan-600 font-bold">{selectedProduct.diamonds} 💎</strong>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Delivery Method:</span>
                    <strong className="text-slate-800 font-bold">
                      {selectedProduct.deliveryType === 'FF_UID' ? 'Direct Free Fire UID' : selectedProduct.deliveryType === 'PHYSICAL' ? 'Courier Shipping' : 'In-App Redeem Code'}
                    </strong>
                  </div>
                </div>

                {/* Free Fire Player UID Input */}
                {selectedProduct.deliveryType === 'FF_UID' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Free Fire Player UID (প্লেয়ার আইডি) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2172143722"
                      value={playerUid}
                      onChange={(e) => setPlayerUid(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                    />
                  </div>
                )}

                {/* Physical Shipping Address */}
                {selectedProduct.deliveryType === 'PHYSICAL' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Shipping Delivery Address *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="House, Road, City, Police Station..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white"
                    />
                  </div>
                )}

                {/* Contact Phone / WhatsApp Number Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Contact / WhatsApp Mobile Number (মোবাইল নম্বর) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 01847853867"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    অর্ডার ডেলিভারি আপডেট বা কুরিয়ার পার্সেল ট্র্যাকিংয়ের জন্য সচল মোবাইল নম্বর দিন।
                  </span>
                </div>

                {/* Promo Coupon Code */}
                {paymentMethod === 'WALLET' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                      <span>Promo / Coupon Code</span>
                      {appliedCoupon && (
                        <span className="text-emerald-600 font-bold text-[10px]">
                          ✅ Code Applied ({appliedCoupon.code})
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. BOOYAH50"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-brand-orange"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {couponLoading ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[10px] text-red-600 font-medium">{couponError}</p>
                    )}
                  </div>
                )}

                {/* Payment Option Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Choose Payment Currency
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {(selectedProduct.currencyType === 'COINS' || selectedProduct.currencyType === 'BOTH') && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COINS')}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          paymentMethod === 'COINS'
                            ? 'border-amber-500 bg-amber-50/60 text-amber-950 shadow-md ring-2 ring-amber-400/30'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase text-amber-700 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            <span>EZBD Coins</span>
                          </span>
                          {paymentMethod === 'COINS' && <Check className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="text-base font-heading font-black text-amber-600">
                          {selectedProduct.priceCoins.toLocaleString()} 🪙
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Your Coins: <strong>{(currentUser?.coinBalance || 0).toLocaleString()}</strong>
                        </div>
                      </button>
                    )}

                    {(selectedProduct.currencyType === 'WALLET' || selectedProduct.currencyType === 'BOTH') && (() => {
                      const discount = calcDiscount();
                      const payable = Math.max(1, selectedProduct.priceBdt - discount);
                      return (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('WALLET')}
                          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            paymentMethod === 'WALLET'
                              ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 shadow-md ring-2 ring-emerald-400/30'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Wallet Cash</span>
                            </span>
                            {paymentMethod === 'WALLET' && <Check className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-heading font-black text-emerald-600">
                              ৳ {payable.toLocaleString()}
                            </span>
                            {discount > 0 && (
                              <span className="text-slate-400 line-through text-xs font-mono">
                                ৳{selectedProduct.priceBdt}
                              </span>
                            )}
                          </div>
                          {discount > 0 && (
                            <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                              🎉 You save ৳{discount} ({appliedCoupon?.code})
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-1">
                            Your Balance: <strong>৳{(currentUser?.walletBalance || 0).toLocaleString()}</strong>
                          </div>
                        </button>
                      );
                    })()}

                  </div>
                </div>

                {/* Confirm Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPurchasing}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isPurchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Confirm & Buy Now</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
