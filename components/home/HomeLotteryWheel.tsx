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
        setFeedbackMsg(`আপনার পর্যাপ্ত কয়েন নেই। স্পিন করতে কমপক্ষে ${spinCoinCost} কয়েন প্রয়োজন।`);
        return;
      }
    } else {
      if ((currentUser.walletBalance || 0) < spinCashCost) {
        setFeedbackMsg(`আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। স্পিন করতে কমপক্ষে ৳${spinCashCost} প্রয়োজন।`);
        return;
      }
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
        const targetIndex = data.rewardIndex !== undefined ? data.rewardIndex : 0;
        const totalItems = lotteryRewards.length || 8;
        const segmentAngle = 360 / totalItems;

        // Pointer is at the top (0 degrees).
        const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2);
        const fullSpins = 360 * 5;
        const currentMod = wheelRotation % 360;
        const delta = ((targetAngle - currentMod + 360) % 360);
        const finalRotation = wheelRotation + fullSpins + delta;

        setWheelRotation(finalRotation);

        setTimeout(() => {
          setIsSpinning(false);
          setSpinResult(wonItem);
          setShowWinModal(true);
          if (currentUser?.id) void refreshUser(currentUser.id);
        }, 4600);
      } else {
        setIsSpinning(false);
        setFeedbackMsg(data.message || 'স্পিন সম্পন্ন করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      setIsSpinning(false);
      setFeedbackMsg(err?.message || 'Error occurred while spinning wheel.');
    }
  };

  return (
    <div id="home-lottery-section" className="mt-4 sm:mt-6 rounded-3xl p-5 sm:p-8 bg-white border border-purple-200 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-center space-y-5">
      
      {/* Top Header matching Rewards page style */}
      <div className="space-y-1 max-w-lg mx-auto">
        <span className="text-xs font-bold text-purple-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          High-Reward Lucky Draw
        </span>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 font-heading tracking-tight">
          Spin & Win Real Cash & Diamonds
        </h2>
        
        {/* User Balance & Cost Pill */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {currentUser && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1 text-amber-600 font-black">
                <Coins className="w-3.5 h-3.5" /> {(currentUser.coinBalance || 0).toLocaleString()} Coins
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-emerald-600 font-black">
                <DollarSign className="w-3.5 h-3.5" /> ৳{(currentUser.walletBalance || 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

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

        {/* Center Spin Hub Button */}
        <button
          type="button"
          disabled={isSpinning || !isLotteryActive}
          onClick={() => handleSpinWheel(spinPaymentMode === 'CASH_ONLY' ? 'CASH' : 'COINS')}
          className="absolute z-20 w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-xl border-4 border-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCw className={`w-4 h-4 mb-0.5 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? '...' : 'SPIN'}</span>
        </button>
      </div>

      {/* Dual Spin Buttons (Coin Spin + Taka/Money Spin) */}
      <div className="w-full max-w-md flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
        
        {/* 1. Spin with Coins Button */}
        {(spinPaymentMode === 'BOTH' || spinPaymentMode === 'COINS_ONLY') && (
          <button
            type="button"
            disabled={isSpinning || !isLotteryActive}
            onClick={() => handleSpinWheel('COINS')}
            className="flex-1 w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Coins className="w-4 h-4" />
            <span>Spin with Coins ({spinCoinCost} 🪙)</span>
          </button>
        )}

        {/* 2. Spin with Taka / Cash Button */}
        {(spinPaymentMode === 'BOTH' || spinPaymentMode === 'CASH_ONLY') && (
          <button
            type="button"
            disabled={isSpinning || !isLotteryActive}
            onClick={() => handleSpinWheel('CASH')}
            className="flex-1 w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4" />
            <span>Spin with Taka (৳{spinCashCost} 💵)</span>
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
                  {spinResult.type === 'TRY_AGAIN' ? 'BETTER LUCK NEXT TIME' : '🎉 CONGRATULATIONS!'}
                </span>
                <h3 className="font-heading font-black text-2xl text-slate-900 leading-tight">
                  {spinResult.label}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {spinResult.type === 'TRY_AGAIN'
                    ? 'Do not give up! Spin again or complete daily quests for more chances.'
                    : 'Your prize reward has been credited directly to your account!'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWinModal(false)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                CLAIM & CONTINUE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
