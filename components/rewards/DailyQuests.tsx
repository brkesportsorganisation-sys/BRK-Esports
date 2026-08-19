'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  Coins, 
  Gift, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  DollarSign, 
  Clock, 
  Lock, 
  LogIn, 
  UserPlus, 
  X, 
  AlertCircle, 
  PartyPopper,
  Info
} from 'lucide-react';
import { db } from '@/lib/db';
import { User } from '@/lib/types';

interface StreakReward {
  day: number;
  label: string;
  type: string;
  value: number;
}

const DEFAULT_STREAK_REWARDS: StreakReward[] = [
  { day: 1, label: '+15 Coins', type: 'COINS', value: 15 },
  { day: 2, label: '+25 Coins', type: 'COINS', value: 25 },
  { day: 3, label: '+40 Coins + Spin Ticket', type: 'COINS', value: 40 },
  { day: 4, label: '+50 Coins', type: 'COINS', value: 50 },
  { day: 5, label: '+75 Coins', type: 'COINS', value: 75 },
  { day: 6, label: '+100 Mega Coins', type: 'COINS', value: 100 },
  { day: 7, label: '৳10 Real Cash Bonus', type: 'WALLET', value: 10 },
];

export default function DailyQuests() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStreakDay, setCurrentStreakDay] = useState(1);
  const [canClaim, setCanClaim] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [streakRewards, setStreakRewards] = useState<StreakReward[]>(DEFAULT_STREAK_REWARDS);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState('');
  
  // Modals & Feedback State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTryTomorrowModal, setShowTryTomorrowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Helper to show temporary toast
  const triggerToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadQuestData = async (uid: string) => {
    try {
      const res = await fetch(`/api/user/quests?userId=${uid}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCurrentStreakDay(data.currentStreakDay || 1);
        setCanClaim(Boolean(data.canClaimStreak));
        setRemainingSeconds(data.remainingSeconds || 0);
        if (data.streakRewards && data.streakRewards.length > 0) {
          setStreakRewards(data.streakRewards);
        }
      }
    } catch (err) {
      console.warn('Failed to load quest data:', err);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);

    if (user?.id) {
      // Immediate local check to prevent active claim button flash
      if (user.lastStreakClaimDate) {
        const lastClaimTime = new Date(user.lastStreakClaimDate).getTime();
        const timeSince = Date.now() - lastClaimTime;
        const cooldownMs = 24 * 60 * 60 * 1000;

        if (timeSince < cooldownMs) {
          setCanClaim(false);
          setRemainingSeconds(Math.max(0, Math.ceil((cooldownMs - timeSince) / 1000)));
          setCurrentStreakDay(user.currentStreak || 1);
        } else {
          setCanClaim(true);
          setRemainingSeconds(0);
          if (timeSince > 48 * 60 * 60 * 1000) {
            setCurrentStreakDay(1);
          } else {
            setCurrentStreakDay(((user.currentStreak || 0) % 7) + 1);
          }
        }
      } else {
        setCanClaim(true);
        setCurrentStreakDay(user.currentStreak || 1);
      }

      loadQuestData(user.id);
    } else {
      setCanClaim(false);
      setCurrentStreakDay(1);
    }
  }, []);

  // 1-second interval for 24-hour countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClaim(true);
          if (currentUser?.id) {
            loadQuestData(currentUser.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, currentUser]);

  // Format seconds to HH:MM:SS
  const formatTimeRemaining = (totalSec: number) => {
    if (totalSec <= 0) return '00h 00m 00s';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  };

  // Main Claim Handler
  const handleClaimStreak = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (!canClaim) {
      setShowTryTomorrowModal(true);
      return;
    }

    if (isClaiming) return;

    setIsClaiming(true);
    setClaimFeedback('');

    try {
      const res = await fetch('/api/user/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          action: 'CLAIM_STREAK',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCanClaim(false);
        setCurrentStreakDay(data.currentStreakDay);
        setRemainingSeconds(data.remainingSeconds || 86400);
        setClaimFeedback(data.message || `Day ${data.currentStreakDay} reward claimed successfully! 🎉`);

        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
          // Dispatch event so other components update balances instantly
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('user-updated'));
            window.dispatchEvent(new Event('storage'));
          }
        }

        triggerToast(`🎉 অভিনন্দন! Day ${data.currentStreakDay} রিওয়ার্ড আপনার একাউন্টে যোগ হয়েছে!`, 'success');
        setTimeout(() => setClaimFeedback(''), 7000);
      } else {
        // Backend blocked claim (e.g. within 24h)
        if (data.remainingSeconds) {
          setCanClaim(false);
          setRemainingSeconds(data.remainingSeconds);
        }
        setShowTryTomorrowModal(true);
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Error claiming reward. Please try again.', 'warning');
    } finally {
      setIsClaiming(false);
    }
  };

  // Click handler on the claimed/unavailable button
  const handleAlreadyClaimedClick = () => {
    setShowTryTomorrowModal(true);
  };

  // Click on visual cards for friendly feedback
  const handleCardClick = (rewardDay: number) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    const isPassed = rewardDay < currentStreakDay || (!canClaim && rewardDay === currentStreakDay);
    const isCurrent = rewardDay === currentStreakDay && canClaim;

    if (isPassed) {
      triggerToast(`✓ Day ${rewardDay} রিওয়ার্ড ইতিমধ্যে সফলভাবে ক্লেইম করা হয়েছে।`, 'info');
    } else if (isCurrent) {
      handleClaimStreak();
    } else {
      triggerToast(`🔒 Day ${rewardDay} লক করা রয়েছে। ধারাবাহিক লগইন বজায় রেখে পর্যায়ক্রমে আনলক করুন!`, 'warning');
    }
  };

  const nextDay = (currentStreakDay % 7) + 1;
  const nextReward = streakRewards.find(r => r.day === nextDay) || streakRewards[0];

  return (
    <div className="relative p-6 md:p-8 bg-white border border-slate-200/90 rounded-3xl space-y-6 shadow-sm text-slate-900 font-sans">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-bounce transition-all ${
          toastMessage.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : toastMessage.type === 'warning'
            ? 'bg-amber-600 text-white border-amber-500'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toastMessage.type === 'success' ? (
            <PartyPopper className="w-5 h-5 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <Info className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-bold leading-relaxed">{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-auto p-1 rounded-lg hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-brand-red/10 to-brand-orange/15 text-brand-orange border border-orange-200 rounded-2xl shadow-xs shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 font-heading tracking-tight">
                7-Day Daily Login Streak
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-brand-orange font-black">
                FREE BONUS
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              প্রতি ২৪ ঘণ্টা পর পর লগইন করে ফ্রি রিওয়ার্ড ক্লেইম করুন! (Claim every 24 hours)
            </p>
          </div>
        </div>

        {/* Dynamic Claim Button / State */}
        {!currentUser ? (
          /* State 1: Guest / Not Logged In */
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Login to Claim"
          >
            <LogIn className="w-4 h-4" />
            <span>লগইন করে ক্লেইম করুন</span>
          </button>
        ) : canClaim ? (
          /* State 2: Logged in & Available to claim today */
          <button
            onClick={handleClaimStreak}
            disabled={isClaiming}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-brand-red via-brand-orange to-amber-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-neon-orange flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:scale-[1.02] active:scale-[0.98]"
          >
            {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            <span>Claim Day {currentStreakDay} Reward</span>
          </button>
        ) : (
          /* State 3: Logged in & Already claimed today (Unavailable / Claimed Style) */
          <button
            onClick={handleAlreadyClaimedClick}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-300/80 text-slate-700 rounded-xl transition-all shadow-2xs flex items-center justify-between sm:justify-start gap-3 cursor-pointer group select-none"
            title="Already claimed today. Click to see details."
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-800">
                    Day {currentStreakDay} Claimed
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-700 font-extrabold rounded">
                    আজকেরটি সম্পন্ন
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono font-bold flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-brand-orange animate-spin [animation-duration:8s]" />
                  <span>Next: <strong className="text-brand-orange">{formatTimeRemaining(remainingSeconds)}</strong></span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-brand-orange font-bold underline group-hover:opacity-80 sm:hidden">
              Try Tomorrow
            </span>
          </button>
        )}
      </div>

      {/* Success Feedback Banner */}
      {claimFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fadeIn shadow-2xs">
          <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
            <Sparkles className="w-4 h-4 shrink-0" />
          </div>
          <span>{claimFeedback}</span>
        </div>
      )}

      {/* 7-Day Visual Streak Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {streakRewards.map((reward) => {
          // Passed/Claimed days:
          const isPassed = reward.day < currentStreakDay || (!canClaim && reward.day === currentStreakDay && !!currentUser);
          const isCurrent = reward.day === currentStreakDay && canClaim && !!currentUser;
          const isDay7 = reward.day === 7;

          return (
            <div
              key={reward.day}
              onClick={() => handleCardClick(reward.day)}
              className={`p-4 rounded-2xl border text-center transition-all space-y-2 relative overflow-hidden cursor-pointer select-none ${
                isCurrent
                  ? 'bg-gradient-to-b from-orange-50 to-amber-50/70 border-2 border-brand-orange shadow-md scale-105 ring-2 ring-brand-orange/20'
                  : isPassed
                  ? 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                  : 'bg-slate-50/90 border-slate-200 text-slate-500 opacity-80 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              {/* Day Header Badge */}
              <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Day {reward.day}</span>
              </div>

              {/* Reward Icon */}
              <div className="my-2">
                {isDay7 ? (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto shadow-xs ${
                    isPassed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-tr from-brand-red to-brand-orange text-white'
                  }`}>
                    <DollarSign className="w-5 h-5 font-black" />
                  </div>
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto border shadow-2xs ${
                    isPassed 
                      ? 'bg-emerald-100 text-emerald-600 border-emerald-300' 
                      : isCurrent 
                      ? 'bg-orange-500 text-white border-orange-400' 
                      : 'bg-white text-brand-orange border-slate-200'
                  }`}>
                    <Coins className={`w-4 h-4 ${isCurrent ? 'text-white' : isPassed ? 'text-emerald-600' : 'text-amber-500'}`} />
                  </div>
                )}
              </div>

              {/* Reward Value Label */}
              <div className="text-xs font-black text-slate-900 truncate">
                {reward.label}
              </div>

              {/* Status Indicator */}
              {isPassed ? (
                <div className="absolute top-2 right-2 text-emerald-600 bg-emerald-100 rounded-full p-0.5 shadow-2xs" title="Claimed">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              ) : isCurrent ? (
                <div className="absolute top-2 right-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                  </span>
                </div>
              ) : (
                <div className="absolute top-2 right-2 text-slate-300">
                  <Lock className="w-3 h-3" />
                </div>
              )}

              {/* Status Tag */}
              <div className="pt-1">
                {isPassed ? (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block">
                    ✓ সম্পন্ন
                  </span>
                ) : isCurrent ? (
                  <span className="text-[9px] font-black text-brand-orange bg-orange-100 px-2 py-0.5 rounded-full inline-block animate-pulse">
                    আজকেরটি
                  </span>
                ) : (
                  <span className="text-[9px] font-medium text-slate-400">
                    লক করা
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: LOGIN REQUIRED MODAL (Account Protection)                        */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6 relative animate-scaleUp">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-tr from-brand-red/10 to-brand-orange/20 text-brand-orange rounded-2xl flex items-center justify-center mx-auto border border-orange-200 shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                একাউন্টে লগইন প্রয়োজন
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                ডেইলি ফ্রি রিওয়ার্ড (BRK কয়েন ও রিয়েল ক্যাশ বোনাস) ক্লেইম করতে অনুগ্রহ করে আপনার একাউন্টে লগইন করুন অথবা একটি নতুন একাউন্ট খুলুন।
              </p>
            </div>

            <div className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-4 space-y-1.5 text-xs text-slate-700">
              <div className="font-black text-brand-orange flex items-center gap-1.5">
                <Gift className="w-4 h-4" /> ৭-দিনের ধারাবাহিক লগইন অফার
              </div>
              <p className="text-[11px] text-slate-600">
                প্রতিদিন মাত্র ১ বার লগইন করে নিশ্চিত ফ্রি রিওয়ার্ড ক্লেইম করুন এবং আপনার ওয়ালেট ব্যালেন্স বৃদ্ধি করুন।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/login?redirect=/ads"
                onClick={() => setShowLoginModal(false)}
                className="py-3 px-4 bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-xs uppercase tracking-wider rounded-xl text-center shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>লগইন করুন</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setShowLoginModal(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl text-center border border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন একাউন্ট</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRY AGAIN TOMORROW MODAL (Strict 1-Claim-per-Day Feedback)      */}
      {/* ========================================================================= */}
      {showTryTomorrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6 relative animate-scaleUp">
            <button
              onClick={() => setShowTryTomorrowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Try Again Tomorrow!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                আজকের দিনের <strong>Day {currentStreakDay}</strong> রিওয়ার্ড ইতিমধ্যে আপনি সফলভাবে ক্লেইম করেছেন। প্রতিদিন সর্বোচ্চ ১ বার ক্লেইম করা যায়।
              </p>
            </div>

            {/* Countdown Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                পরবর্তী ক্লেইম আনলক হতে সময় বাকি
              </span>
              <div className="text-2xl font-black font-mono text-brand-orange">
                {formatTimeRemaining(remainingSeconds)}
              </div>
              <p className="text-[10px] text-slate-500">
                কাউন্টডাউন শেষ হলে আগামীকাল পরবর্তী রিওয়ার্ড ক্লেইম করতে পারবেন।
              </p>
            </div>

            {/* Next Day Reward Preview */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                  {nextDay}
                </div>
                <div>
                  <div className="font-bold text-slate-900">Next: Day {nextDay} Reward</div>
                  <div className="text-[11px] text-emerald-700 font-black">{nextReward.label}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-full font-bold">
                Upcoming
              </span>
            </div>

            <button
              onClick={() => setShowTryTomorrowModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              ঠিক আছে (Got it)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
