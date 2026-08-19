'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User } from '@/lib/types';
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
  ShoppingCart
} from 'lucide-react';
import { DIAMOND_PRODUCTS, DiamondProduct } from '@/lib/types';

export default function DiamondShopPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<DiamondProduct[]>(DIAMOND_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<DiamondProduct | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'COINS'>('WALLET');
  const [playerUid, setPlayerUid] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.freeFireUid) {
      setPlayerUid(user.freeFireUid);
    }
    if (user?.inGameName) {
      setInGameName(user.inGameName);
    }
  }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    if (!selectedProduct || !playerUid.trim()) return;

    setIsPurchasing(true);
    setOrderSuccessMsg('');

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
        setOrderSuccessMsg(data.message || 'Diamond order confirmed!');
        // Update user local balance
        const updated = { ...currentUser };
        if (paymentMethod === 'COINS') {
          updated.coinBalance = data.remainingBalance;
        } else {
          updated.walletBalance = data.remainingBalance;
        }
        setCurrentUser(updated);
        db.setCurrentUser(updated);
        setTimeout(() => {
          setSelectedProduct(null);
          setOrderSuccessMsg('');
        }, 4000);
      } else {
        alert(data.message || 'Failed to complete order.');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing purchase.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-cyan-50 via-white to-orange-50/40 border border-cyan-200/80 p-6 md:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100/70 border border-cyan-300 text-cyan-800 text-xs font-bold">
                <Diamond className="w-3.5 h-3.5 animate-pulse text-cyan-600" />
                INSTANT DIAMOND TOP-UP & REDEEM HUB
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-heading">
                Free Fire <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600">Diamonds Store</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-600 max-w-xl leading-relaxed">
                Use your tournament winning cash or BRK Coins to buy official Free Fire Diamonds, Weekly Memberships, and Level Up Passes with instant UID delivery!
              </p>
            </div>

            {currentUser && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-center gap-6 shadow-sm flex-shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Your Wallet</span>
                  <div className="text-xl md:text-2xl font-black text-emerald-600 flex items-center gap-1.5 font-heading">
                    <DollarSign className="w-5 h-5" />
                    ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-slate-200" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Your Coins</span>
                  <div className="text-xl md:text-2xl font-black text-amber-600 flex items-center gap-1.5 font-heading">
                    <Coins className="w-5 h-5" />
                    {(currentUser.coinBalance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'TOPUP', label: '💎 Diamond Packs' },
            { id: 'MEMBERSHIP', label: '👑 Memberships' },
            { id: 'SPECIAL', label: '⚡ Level Up Passes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white border-brand-red shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="p-6 bg-white border border-slate-200 hover:border-brand-orange/60 rounded-3xl space-y-5 transition-all shadow-sm hover:shadow-lg group relative overflow-hidden flex flex-col justify-between"
            >
              {product.badge && (
                <div className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                  {product.badge}
                </div>
              )}

              {/* Product Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl p-3 bg-slate-50 rounded-2xl border border-slate-200 group-hover:scale-110 transition-transform">
                    {product.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 leading-tight">{product.name}</h3>
                    {product.bonusDiamonds && (
                      <span className="text-[10px] text-amber-600 font-bold block">
                        +{product.bonusDiamonds} Bonus 💎 Included
                      </span>
                    )}
                  </div>
                </div>

                {/* Price Badges */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Cash Price:</span>
                    <strong className="text-emerald-600 font-black text-sm">৳ {product.priceBdt}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-1.5">
                    <span className="text-slate-500 font-semibold">Or Pay with Coins:</span>
                    <strong className="text-amber-600 font-black flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {product.priceCoins.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Buy CTA */}
              <button
                onClick={() => setSelectedProduct(product)}
                className="w-full py-3 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy / Redeem Now
              </button>
            </div>
          ))}
        </div>

      </main>

      {/* Buy Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-red-200/90 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Diamond className="w-5 h-5 text-brand-orange" />
                <h3 className="text-base font-black text-slate-900">Purchase {selectedProduct.name}</h3>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-900 cursor-pointer">✕</button>
            </div>

            {orderSuccessMsg ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <Check className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-700 text-sm">{orderSuccessMsg}</h4>
              </div>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Free Fire UID (Player ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192837465"
                    value={playerUid}
                    onChange={(e) => setPlayerUid(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-orange focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Payment Option</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('WALLET')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                        paymentMethod === 'WALLET'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 font-semibold">Wallet Balance</div>
                      <div className="text-sm font-black">৳ {selectedProduct.priceBdt}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COINS')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                        paymentMethod === 'COINS'
                          ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500 font-semibold">BRK Coins</div>
                      <div className="text-sm font-black">{selectedProduct.priceCoins.toLocaleString()} 🪙</div>
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPurchasing || !playerUid.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isPurchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm Top-Up
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
