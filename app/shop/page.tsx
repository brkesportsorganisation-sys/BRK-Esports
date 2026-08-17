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
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 p-6 md:p-10 shadow-2xl shadow-cyan-950/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                <Diamond className="w-3.5 h-3.5 animate-pulse" />
                INSTANT DIAMOND TOP-UP & REDEEM HUB
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Free Fire <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400">Diamonds Store</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                Use your tournament winning cash or BRK Coins to buy official Free Fire Diamonds, Weekly Memberships, and Level Up Passes with instant UID delivery!
              </p>
            </div>

            {currentUser && (
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 md:p-5 flex items-center gap-6 shadow-lg flex-shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Wallet</span>
                  <div className="text-xl md:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-5 h-5" />
                    ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-slate-800" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Coins</span>
                  <div className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-1.5">
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
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
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
              className="p-6 bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 rounded-3xl space-y-5 transition-all shadow-xl hover:shadow-cyan-950/20 group relative overflow-hidden"
            >
              {product.badge && (
                <div className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md">
                  {product.badge}
                </div>
              )}

              {/* Product Header */}
              <div className="flex items-center gap-3">
                <div className="text-3xl p-3 bg-slate-950 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform">
                  {product.icon}
                </div>
                <div>
                  <h3 className="font-black text-sm text-white leading-tight">{product.name}</h3>
                  {product.bonusDiamonds && (
                    <span className="text-[10px] text-amber-400 font-bold block">
                      +{product.bonusDiamonds} Bonus 💎 Included
                    </span>
                  )}
                </div>
              </div>

              {/* Price Badges */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cash Price:</span>
                  <strong className="text-emerald-400 font-black text-sm">৳ {product.priceBdt}</strong>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-400">Or Pay with Coins:</span>
                  <strong className="text-amber-400 font-black flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    {product.priceCoins.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Buy CTA */}
              <button
                onClick={() => setSelectedProduct(product)}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl shadow-cyan-950/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Diamond className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">Purchase {selectedProduct.name}</h3>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {orderSuccessMsg ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                <Check className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-emerald-400 text-sm">{orderSuccessMsg}</h4>
              </div>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Free Fire UID (Player ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 192837465"
                    value={playerUid}
                    onChange={(e) => setPlayerUid(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Payment Option</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('WALLET')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                        paymentMethod === 'WALLET'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400">Wallet Balance</div>
                      <div className="text-sm font-black">৳ {selectedProduct.priceBdt}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COINS')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${
                        paymentMethod === 'COINS'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400">BRK Coins</div>
                      <div className="text-sm font-black">{selectedProduct.priceCoins.toLocaleString()} 🪙</div>
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPurchasing || !playerUid.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-50"
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
      <MobileBottomNav />
    </div>
  );
}
