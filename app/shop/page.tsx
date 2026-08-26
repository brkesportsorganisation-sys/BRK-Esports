'use client';

import React, { useState, useEffect } from 'react';
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
  Ticket
} from 'lucide-react';

export default function GamingShopPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>(DEFAULT_SHOP_PRODUCTS);
  const [shopBanners, setShopBanners] = useState<Banner[]>(() => {
    const initial = initialBanners.filter(b => b.placement === 'SHOP_BANNER' && b.isActive);
    return initial.length > 0 ? initial : initialBanners.filter(b => b.placement === 'SHOP_BANNER');
  });
  const [slideInterval, setSlideInterval] = useState<number>(4000);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'COINS' | 'WALLET'>('ALL');
  
  // Purchase Modal State
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'COINS'>('COINS');
  const [playerUid, setPlayerUid] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);

  const loadShopProducts = async () => {
    try {
      const res = await fetch('/api/shop', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
    } catch (err) {
      console.warn('Failed to load shop items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.freeFireUid) {
      setPlayerUid(user.freeFireUid);
    }
    if (user?.inGameName) {
      setInGameName(user.inGameName);
    }

    // Load cached banners immediately to prevent any flicker / delay
    try {
      const cachedBanners = db.getBanners();
      const currentShopBanners = cachedBanners.filter(b => b.placement === 'SHOP_BANNER' && b.isActive);
      if (currentShopBanners.length > 0) {
        setShopBanners(currentShopBanners);
      }
      const settings = db.getBannerSettings();
      if (settings?.autoSlideInterval) {
        setSlideInterval(settings.autoSlideInterval);
      }
    } catch {}

    // Refresh user balance from /api/auth/me
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
          if (data.user.freeFireUid) setPlayerUid(data.user.freeFireUid);
          if (data.user.inGameName) setInGameName(data.user.inGameName);
        }
      })
      .catch(() => {});

    fetch('/api/banners')
      .then(res => res.json())
      .then(data => {
        if (data.shopBanners && Array.isArray(data.shopBanners) && data.shopBanners.length > 0) {
          setShopBanners(data.shopBanners);
        } else if (data.shopBanner) {
          setShopBanners([data.shopBanner]);
        }
        if (data.settings?.autoSlideInterval) {
          setSlideInterval(data.settings.autoSlideInterval);
        }
      })
      .catch(() => {});

    loadShopProducts();
  }, []);

  const openPurchaseModal = (product: ShopProduct) => {
    setSelectedProduct(product);
    setPurchaseResult(null);
    // Set initial preferred payment method
    if (product.currencyType === 'COINS') {
      setPaymentMethod('COINS');
    } else if (product.currencyType === 'WALLET') {
      setPaymentMethod('WALLET');
    } else {
      // If user has enough coins, default to coins; else wallet
      const hasCoins = (currentUser?.coinBalance || 0) >= (product.priceCoins || 0);
      setPaymentMethod(hasCoins ? 'COINS' : 'WALLET');
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
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPurchaseResult({
          success: true,
          message: data.message || 'Item purchased successfully!',
          orderId: data.orderId,
        });

        // Update local user balances
        const updated = {
          ...currentUser,
          coinBalance: data.remainingCoinBalance !== undefined ? data.remainingCoinBalance : currentUser.coinBalance,
          walletBalance: data.remainingWalletBalance !== undefined ? data.remainingWalletBalance : currentUser.walletBalance,
        };
        setCurrentUser(updated);
        db.setCurrentUser(updated);
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

  // Filter products by category, currency, and search query
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
    { id: 'SKINS', label: 'Skins & Codes', icon: Gift },
    { id: 'TICKETS', label: 'Match Passes', icon: Ticket },
    { id: 'CRATES', label: 'Mystery Crates', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-body flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── Hero Multi-Banner Auto-Slider & Quick Balances ── */}
        <ShopBannerSlider
          banners={shopBanners}
          currentUser={currentUser}
          slideInterval={slideInterval}
        />

        {/* ── Search & Filter Controls ── */}
        <div className="space-y-4">
          
          {/* Top Search & Currency Tabs */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search diamonds, memberships, skins, passes..."
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

            {/* Currency Filter Switcher (Wraps into multi-line if needed on mobile) */}
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

          {/* Category Filter Grid (Clean aligned 2-3 rows layout) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 sm:px-3 py-2.5 rounded-2xl text-xs font-heading font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer text-center w-full shadow-2xs ${
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

        {/* ── Products Grid ── */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto" />
            <div className="text-xs text-slate-500 font-bold">Loading gaming shop items...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-4">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <h3 className="font-heading font-black text-slate-800 text-lg">No Items Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No shop items match your search or filter criteria. Try selecting another category or resetting filters.
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
              const hasEnoughCoins = (currentUser?.coinBalance || 0) >= (product.priceCoins || 0);
              const hasEnoughCash = (currentUser?.walletBalance || 0) >= (product.priceBdt || 0);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-brand-orange/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                >
                  {/* Badge */}
                  {product.badge && (
                    <div className="absolute top-3 right-3 z-10 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md">
                      {product.badge}
                    </div>
                  )}

                  {/* Top Image Box */}
                  <div className="relative w-full h-44 bg-slate-900 overflow-hidden">
                    <Image
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500'}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    
                    {/* Category & Icon Tag */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-base shadow-sm">
                        {product.icon || '💎'}
                      </span>
                      <span className="text-[11px] font-bold text-white uppercase drop-shadow-sm font-heading">
                        {product.category}
                      </span>
                    </div>
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
                      
                      {/* Taka Price (if supported) */}
                      {(product.currencyType === 'WALLET' || product.currencyType === 'BOTH') && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <span>Cash / Wallet:</span>
                          </span>
                          <strong className="text-emerald-600 font-black text-sm">
                            ৳ {product.priceBdt.toLocaleString()}
                          </strong>
                        </div>
                      )}

                      {/* Coin Price (if supported) */}
                      {(product.currencyType === 'COINS' || product.currencyType === 'BOTH') && (
                        <div className={`flex items-center justify-between text-xs ${
                          product.currencyType === 'BOTH' ? 'border-t border-slate-200 pt-1.5' : ''
                        }`}>
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>Or Pay With Coins:</span>
                          </span>
                          <strong className="text-amber-600 font-black flex items-center gap-1 text-sm">
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
                        {product.currencyType === 'COINS' ? 'Redeem With Coins' : 'Buy / Redeem Now'}
                      </span>
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ── Buy / Redeem Modal ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center text-lg shadow-xs">
                  {selectedProduct.icon || '💎'}
                </div>
                <div>
                  <h3 className="font-heading font-black text-base sm:text-lg text-slate-900">
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
                  onClick={() => setSelectedProduct(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  Close
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
                  {selectedProduct.diamonds && (
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Diamonds Received:</span>
                      <strong className="text-cyan-600 font-bold">{selectedProduct.diamonds} 💎</strong>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Delivery Method:</span>
                    <strong className="text-slate-800 font-bold">
                      {selectedProduct.deliveryType === 'FF_UID' ? 'Direct Free Fire UID' : 'In-App Redeem Code'}
                    </strong>
                  </div>
                </div>

                {/* Free Fire Player UID Input */}
                {selectedProduct.deliveryType === 'FF_UID' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Free Fire Player UID (প্লেয়ার আইডি)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2172143722"
                      value={playerUid}
                      onChange={(e) => setPlayerUid(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      যে অ্যাকাউন্টে ডায়মন্ড বা আইটেমটি যাবে সেটির Free Fire UID সঠিকভাবে লিখুন।
                    </span>
                  </div>
                )}

                {/* Payment Option Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Choose Payment Currency (পেমেন্ট মাধ্যম বেছে নিন)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Pay with Coins Option */}
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

                    {/* Pay with Wallet Cash Option */}
                    {(selectedProduct.currencyType === 'WALLET' || selectedProduct.currencyType === 'BOTH') && (
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
                        <div className="text-base font-heading font-black text-emerald-600">
                          ৳ {selectedProduct.priceBdt.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Your Balance: <strong>৳{(currentUser?.walletBalance || 0).toLocaleString()}</strong>
                        </div>
                      </button>
                    )}

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
                    <span>Confirm & Pay</span>
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
