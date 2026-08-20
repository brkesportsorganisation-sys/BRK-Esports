'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Gift, 
  RotateCw, 
  Coins, 
  DollarSign, 
  Diamond, 
  Award, 
  CheckCircle2, 
  X, 
  ArrowRight,
  Flame,
  PlaySquare,
  Zap
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
  const handleSpinWheel = async () => {
    if (isSpinning) return;

    if (!currentUser) {
      window.location.href = '/login?redirect=/';
      return;
    }

    if ((currentUser.coinBalance || 0) < spinCoinCost) {
      setFeedbackMsg(`You need at least ${spinCoinCost} Coins to spin. Watch video ads or complete quests to earn coins!`);
      return;
    }

    setFeedbackMsg('');
    setIsSpinning(true);
    setHasStartedActiveSpin(true);

    try {
      const res = await fetch('/api/ads/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const wonItem = data.reward as LotteryRewardItem;
        const targetIndex = data.rewardIndex !== undefined ? data.rewardIndex : 0;
        const totalItems = lotteryRewards.length || 8;
        const segmentAngle = 360 / totalItems;

        // Pointer is at the top (0 degrees).
        // Target angle calculation so pointer lands in middle of won segment:
        const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2);
        const fullSpins = 360 * 5; // 5 full rotations for dramatic excitement
        const currentMod = wheelRotation % 360;
        const delta = ((targetAngle - currentMod + 360) % 360);
        const finalRotation = wheelRotation + fullSpins + delta;

        setWheelRotation(finalRotation);

        // Wait for spin animation (4.5s) to finish
        setTimeout(() => {
          setIsSpinning(false);
          setSpinResult(wonItem);
          setShowWinModal(true);
          if (currentUser?.id) void refreshUser(currentUser.id);
        }, 4600);
      } else {
        setIsSpinning(false);
        setFeedbackMsg(data.message || 'Failed to spin lottery wheel.');
      }
    } catch (err: any) {
      setIsSpinning(false);
      setFeedbackMsg(err?.message || 'Error occurred while spinning wheel.');
    }
  };

  return (
    <div id="home-lottery-section" className="mt-4 sm:mt-6 rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white border-2 border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
      
      {/* Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row: Title + User Balance + Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-purple-800/40 relative z-10">
        <div className="space-y-1.5 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white tracking-widest inline-flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3 animate-pulse" />
              <span>LUCKY LOTTERY DRAW</span>
            </span>

            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-900/60 border border-purple-400/30 text-purple-200">
              🪙 Cost: <strong className="text-amber-400 font-black">{spinCoinCost} Coins</strong> / Spin
            </span>
          </div>

          <h2 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-white tracking-wide">
            SPIN & WIN REAL CASH & DIAMONDS
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 max-w-xl">
            Test your luck every day! Win instant bKash Cash, Free Fire Diamond Vouchers, and Mega Bonus Coins.
          </p>
        </div>

        {/* User Balance & Free Coins Link */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-purple-900/50 backdrop-blur-md border border-purple-500/30 px-3.5 py-2 rounded-2xl shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[9px] text-purple-300 font-bold uppercase block">Your Coins</span>
                <div className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-1 font-heading">
                  <Coins className="w-4 h-4" />
                  {(currentUser.coinBalance || 0).toLocaleString()}
                </div>
              </div>
              <div className="h-7 w-[1px] bg-purple-700/50" />
              <div className="space-y-0.5">
                <span className="text-[9px] text-purple-300 font-bold uppercase block">Wallet Cash</span>
                <div className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-1 font-heading">
                  <DollarSign className="w-4 h-4" />
                  ৳{(currentUser.walletBalance || 0).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login?redirect=/"
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
            >
              Login to Play
            </Link>
          )}

          <Link
            href="/ads"
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
            title="Earn Free Coins by Watching Video Ads"
          >
            <PlaySquare className="w-4 h-4 text-amber-400" />
            <span>Earn Free Coins</span>
          </Link>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mt-3 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Wheel Center Area */}
      <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
        
        {/* Left / Center: Interactive SVG Wheel */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center mx-auto shrink-0">
          
          {/* Glowing Wheel Backdrop Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/30 to-amber-500/20 blur-xl pointer-events-none" />

          {/* Pointer Marker at the Top */}
          <div className="absolute -top-3 z-30 transform -translate-x-1/2 left-1/2 drop-shadow-2xl">
            <div 
              className="w-6 h-8 sm:w-7 sm:h-9 bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 border-t-2 border-white"
              style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            />
          </div>

          {/* Rotating SVG Wheel Container with Continuous Idle Spin or Active Transform */}
          <div
            className={`w-full h-full rounded-full border-4 border-amber-400/80 shadow-[0_0_30px_rgba(168,85,247,0.4)] relative overflow-hidden ${
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
                      fontSize="3.3"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {prize.label.length > 13 ? prize.label.slice(0, 11) + '..' : prize.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Central Interactive SPIN Hub Button */}
          <button
            type="button"
            disabled={isSpinning || !isLotteryActive}
            onClick={handleSpinWheel}
            className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xl border-4 border-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-75 cursor-pointer"
          >
            <RotateCw className={`w-5 h-5 mb-0.5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'SPINNING' : 'SPIN'}</span>
          </button>
        </div>

        {/* Right Info & Live Prize Highlights Box */}
        <div className="flex-1 w-full space-y-4">
          <div className="bg-slate-900/70 border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Available Jackpot Prizes</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-center space-y-1">
                <span className="text-lg block">💎</span>
                <div className="font-black text-cyan-300">100 Diamonds</div>
                <div className="text-[10px] text-purple-300/70">Instant UID</div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-center space-y-1">
                <span className="text-lg block">💵</span>
                <div className="font-black text-emerald-400">৳20 bKash Cash</div>
                <div className="text-[10px] text-purple-300/70">Direct Wallet</div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-center space-y-1">
                <span className="text-lg block">🪙</span>
                <div className="font-black text-amber-400">75 Mega Coins</div>
                <div className="text-[10px] text-purple-300/70">Shop & Entry</div>
              </div>
            </div>
          </div>

          {/* Primary Spin Action Button */}
          <button
            type="button"
            disabled={isSpinning || !isLotteryActive}
            onClick={handleSpinWheel}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:brightness-110 text-white font-heading font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl transition-all shadow-neon-orange disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Gift className="w-5 h-5" />
            <span>SPIN LUCKY WHEEL ({spinCoinCost} COINS)</span>
          </button>
        </div>

      </div>

      {/* Winning Result Modal */}
      <AnimatePresence>
        {showWinModal && spinResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-2xl max-w-sm w-full text-center space-y-5 text-slate-900 relative overflow-hidden"
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
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
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
