'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Gift, 
  RotateCw, 
  Coins, 
  DollarSign, 
  CheckCircle2, 
  X, 
  Flame
} from 'lucide-react';
import { db } from '@/lib/db';
import { User, LotteryRewardItem } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';

const DEFAULT_LOTTERY_REWARDS: LotteryRewardItem[] = [
  { id: '1', label: '15 Coins', type: 'COINS', value: 15, probabilityPercent: 30, currentWonCount: 0, color: '#F59E0B', isActive: true },
  { id: '2', label: '৳ 5 Real Cash', type: 'WALLET', value: 5, probabilityPercent: 15, maxWinnersLimit: 100, currentWonCount: 0, color: '#10B981', isActive: true },
  { id: '3', label: '35 Coins', type: 'COINS', value: 35, probabilityPercent: 20, currentWonCount: 0, color: '#EC4899', isActive: true },
  { id: '4', label: 'Try Again', type: 'TRY_AGAIN', value: 0, probabilityPercent: 15, currentWonCount: 0, color: '#64748B', isActive: true },
  { id: '5', label: '75 Mega Coins', type: 'COINS', value: 75, probabilityPercent: 10, currentWonCount: 0, color: '#8B5CF6', isActive: true },
  { id: '6', label: '৳ 20 bKash', type: 'WALLET', value: 20, probabilityPercent: 5, maxWinnersLimit: 25, currentWonCount: 0, color: '#3B82F6', isActive: true },
  { id: '7', label: '10 Coins', type: 'COINS', value: 10, probabilityPercent: 4, currentWonCount: 0, color: '#F97316', isActive: true },
  { id: '8', label: '💎 100 Diamonds', type: 'DIAMONDS', value: 100, probabilityPercent: 1, maxWinnersLimit: 5, currentWonCount: 0, color: '#06B6D4', isActive: true },
];

export default function HomeLotteryWheel() {
  const { isBangla } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lotteryRewards, setLotteryRewards] = useState<LotteryRewardItem[]>(DEFAULT_LOTTERY_REWARDS);
  const [spinCoinCost, setSpinCoinCost] = useState(20);
  const [spinCashCost, setSpinCashCost] = useState(10);
  const [spinPaymentMode, setSpinPaymentMode] = useState<'COINS_ONLY' | 'CASH_ONLY' | 'BOTH'>('BOTH');
  const [isLotteryActive, setIsLotteryActive] = useState(true);
  
  // Wheel rotation & spin states
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [hasStartedActiveSpin, setHasStartedActiveSpin] = useState(false);
  const [spinResult, setSpinResult] = useState<LotteryRewardItem | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Load User and Settings
  const refreshUser = async (uid: string) => {
    try {
      const res = await fetch(`/api/auth/me?id=${uid}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.id) void refreshUser(user.id);

    async function loadSettings() {
      try {
        const res = await fetch('/api/ads', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSpinCoinCost(data.settings.spinCoinCost ?? 20);
            setSpinCashCost(data.settings.spinCashCost ?? 10);
            setSpinPaymentMode(data.settings.spinPaymentMode || 'BOTH');
            setIsLotteryActive(data.settings.isLotteryActive !== false);
            if (data.settings.lotteryRewards && data.settings.lotteryRewards.length > 0) {
              const active = data.settings.lotteryRewards.filter((r: any) => r.isActive);
              if (active.length > 0) setLotteryRewards(active);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load wheel settings:', err);
      }
    }

    void loadSettings();
  }, []);

  // Handle Wheel Spin
  const handleSpinWheel = async (method: 'COINS' | 'CASH' = 'COINS') => {
    if (isSpinning) return;

    if (!currentUser) {
      window.location.href = '/login?redirect=/';
      return;
    }

    if (method === 'COINS') {
      if ((currentUser.coinBalance || 0) < spinCoinCost) {
        setFeedbackMsg(isBangla ? `আপনার পর্যাপ্ত কয়েন নেই। স্পিন করতে কমপক্ষে ${spinCoinCost} কয়েন প্রয়োজন।` : `Insufficient coins. You need at least ${spinCoinCost} Coins to spin.`);
        return;
      }
    } else {
      if ((currentUser.walletBalance || 0) < spinCashCost) {
        setFeedbackMsg(isBangla ? `আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। স্পিন করতে কমপক্ষে ৳${spinCashCost} প্রয়োজন।` : `Insufficient balance. You need at least ৳${spinCashCost} to spin.`);
        return;
      }
    }

    const prevUser = { ...currentUser };

    // 1. Instant (0ms delay) Optimistic Balance Deduction
    const optimisticUser: User = {
      ...currentUser,
      coinBalance: method === 'COINS' 
        ? Math.max(0, (currentUser.coinBalance || 0) - spinCoinCost)
        : currentUser.coinBalance,
      walletBalance: method === 'CASH'
        ? Math.max(0, (currentUser.walletBalance || 0) - spinCashCost)
        : currentUser.walletBalance,
    };

    setCurrentUser(optimisticUser);
    db.setCurrentUser(optimisticUser);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet_balance_updated', { detail: optimisticUser }));
      window.dispatchEvent(new Event('storage'));
    }

    setFeedbackMsg('');
    setIsSpinning(true);
    setHasStartedActiveSpin(true);

    try {
      const res = await fetch('/api/ads/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, paymentMethod: method }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const wonItem = data.reward as LotteryRewardItem;
        
        // Find exact index of the won reward in current wheel's lotteryRewards list
        let targetIndex = lotteryRewards.findIndex((r) => r.id === wonItem?.id);
        if (targetIndex === -1) {
          targetIndex = lotteryRewards.findIndex((r) => r.label === wonItem?.label);
        }
        if (targetIndex === -1) {
          targetIndex = data.winningIndex ?? data.rewardIndex ?? 0;
        }

        const totalItems = lotteryRewards.length || 8;
        const segmentAngle = 360 / totalItems;

        // Pointer is at the top (12 o'clock / 0 degrees).
        // Each segment i is centered at (i * segmentAngle + segmentAngle / 2).
        // To align segment i with the top pointer, rotate by (360 - centerAngle).
        const targetAngle = (360 - (targetIndex * segmentAngle + segmentAngle / 2)) % 360;
        const fullSpins = 360 * 5; // 5 full dramatic rotations
        const currentMod = wheelRotation % 360;
        let delta = ((targetAngle - currentMod + 360) % 360);
        if (delta === 0) delta = 360;
        const finalRotation = wheelRotation + fullSpins + delta;

        setWheelRotation(finalRotation);

        setTimeout(() => {
          setIsSpinning(false);
          setSpinResult(wonItem);
          setShowWinModal(true);

          if (data.user) {
            setCurrentUser(data.user);
            db.setCurrentUser(data.user);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('wallet_balance_updated', { detail: data.user }));
              window.dispatchEvent(new Event('storage'));
            }
          } else if (currentUser?.id) {
            void refreshUser(currentUser.id);
          }
        }, 4700);
      } else {
        // Rollback balance on failure
        setCurrentUser(prevUser);
        db.setCurrentUser(prevUser);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet_balance_updated', { detail: prevUser }));
          window.dispatchEvent(new Event('storage'));
        }
        setIsSpinning(false);
        setFeedbackMsg(data.message || (isBangla ? 'স্পিন সম্পন্ন করা সম্ভব হয়নি।' : 'Failed to spin lottery wheel.'));
      }
    } catch (err: any) {
      // Rollback balance on exception
      setCurrentUser(prevUser);
      db.setCurrentUser(prevUser);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallet_balance_updated', { detail: prevUser }));
        window.dispatchEvent(new Event('storage'));
      }
      setIsSpinning(false);
      setFeedbackMsg(err?.message || (isBangla ? 'ত্রুটি ঘটেছে, পরে চেষ্টা করুন।' : 'Error occurred while spinning wheel.'));
    }
  };

  return (
    <div id="home-lottery-section" className="mt-4 sm:mt-6 rounded-3xl p-4 sm:p-6 bg-white border border-purple-200 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-center space-y-4">
      
      {feedbackMsg && (
        <div className="w-full max-w-md p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg('')} className="p-1 hover:text-slate-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Compact Wheel Container */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center my-1">
        
        {/* Top Pointer */}
        <div className="absolute -top-3 z-30 transform -translate-x-1/2 left-1/2 drop-shadow-xl">
          <div 
            className="w-6 h-8 bg-gradient-to-b from-amber-400 to-orange-500 clip-pointer" 
            style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} 
          />
        </div>

        {/* Rotating SVG Wheel with Continuous Smooth Idle Spin */}
        <div
          className={`w-full h-full rounded-full border-4 border-purple-400/80 shadow-xl relative overflow-hidden ${
            !hasStartedActiveSpin && !isSpinning ? 'animate-spin-slow' : ''
          }`}
          style={
            hasStartedActiveSpin
              ? {
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 4500ms cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
                }
              : undefined
          }
        >
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {lotteryRewards.map((prize, idx) => {
              const total = lotteryRewards.length || 8;
              const angle = 360 / total;
              const startAngle = idx * angle;
              const endAngle = startAngle + angle;

              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);

              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

              const midAngle = startAngle + angle / 2;
              const midRad = (midAngle * Math.PI) / 180;
              const textX = 50 + 32 * Math.cos(midRad);
              const textY = 50 + 32 * Math.sin(midRad);

              return (
                <g key={prize.id}>
                  <path
                    d={pathData}
                    fill={prize.color || (idx % 2 === 0 ? '#7C3AED' : '#4C1D95')}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="#ffffff"
                    fontSize="3.2"
                    fontWeight="900"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  >
                    {prize.label.length > 12 ? prize.label.slice(0, 10) + '..' : prize.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Center Spin Hub Cap (Clean metallic center pin without text/icon) */}
        <div
          className="absolute z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 shadow-xl border-3 sm:border-4 border-white flex items-center justify-center pointer-events-none ring-2 ring-purple-400/40"
        >
          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-white/40 shadow-inner" />
        </div>
      </div>

      {/* Dual Spin Buttons (Coin Spin + Taka/Money Spin) */}
      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 px-2">
        
        {/* 1. Spin with Coins Button */}
        {(spinPaymentMode === 'BOTH' || spinPaymentMode === 'COINS_ONLY') && (
          <button
            type="button"
            disabled={isSpinning || !isLotteryActive}
            onClick={() => handleSpinWheel('COINS')}
            className="group relative overflow-hidden py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-heading font-black rounded-2xl transition-all shadow-md hover:shadow-orange-500/30 active:scale-95 flex items-center justify-between gap-2.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                <Coins className="w-5 h-5 text-amber-100" />
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-tight tracking-wide whitespace-nowrap">
                  {isBangla ? 'কয়েন স্পিন' : 'COIN SPIN'}
                </div>
                <div className="text-[10px] text-amber-100/90 font-medium">
                  {isBangla ? 'কয়েন দিয়ে খেলুন' : 'Play with Coins'}
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-sm border border-white/20 text-xs font-black font-mono whitespace-nowrap shrink-0 shadow-inner">
              {spinCoinCost} 🪙
            </div>
          </button>
        )}

        {/* 2. Spin with Taka / Cash Button */}
        {(spinPaymentMode === 'BOTH' || spinPaymentMode === 'CASH_ONLY') && (
          <button
            type="button"
            disabled={isSpinning || !isLotteryActive}
            onClick={() => handleSpinWheel('CASH')}
            className="group relative overflow-hidden py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-heading font-black rounded-2xl transition-all shadow-md hover:shadow-emerald-600/30 active:scale-95 flex items-center justify-between gap-2.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-tight tracking-wide whitespace-nowrap">
                  {isBangla ? 'টাকা স্পিন' : 'CASH SPIN'}
                </div>
                <div className="text-[10px] text-emerald-100/90 font-medium">
                  {isBangla ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}
                </div>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-sm border border-white/20 text-xs font-black font-mono whitespace-nowrap shrink-0 shadow-inner">
              ৳{spinCashCost} 💵
            </div>
          </button>
        )}

      </div>

      {/* Winning Result Modal */}
      <AnimatePresence>
        {showWinModal && spinResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-white border-2 border-purple-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl text-slate-900 relative overflow-hidden"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30 text-4xl">
                {spinResult.type === 'DIAMONDS' ? '💎' : spinResult.type === 'WALLET' ? '💵' : spinResult.type === 'COINS' ? '🪙' : '🎯'}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-purple-600">
                  {spinResult.type === 'TRY_AGAIN' ? (isBangla ? 'আবার চেষ্টা করুন' : 'BETTER LUCK NEXT TIME') : (isBangla ? '🎉 অভিনন্দন!' : '🎉 CONGRATULATIONS!')}
                </span>
                <h3 className="font-heading font-black text-2xl text-slate-900 leading-tight">
                  {spinResult.label}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {spinResult.type === 'TRY_AGAIN'
                    ? (isBangla ? 'হাল ছাড়বেন না! আরও সুযোগ পেতে আবার স্পিন করুন।' : 'Do not give up! Spin again for more chances.')
                    : (isBangla ? 'আপনার পুরস্কারের রিওয়ার্ড সরাসরি আপনার একাউন্টে যোগ হয়েছে!' : 'Your prize reward has been credited directly to your account!')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWinModal(false)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                {isBangla ? 'পুরস্কার গ্রহণ করুন' : 'CLAIM & CONTINUE'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
