'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Coins, 
  Gift, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
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

export default function DailyQuests() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
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
        setCanClaim(Boolean(data.canClaimStreak));
        setRemainingSeconds(data.remainingSeconds || 0);
      }
    } catch (err) {
      console.warn('Failed to load daily login data:', err);
    }
  };

  const syncUserData = (userOverride?: User | null) => {
    const user = userOverride !== undefined ? userOverride : db.getCurrentUser();
    setCurrentUser(user);

    if (user?.id) {
      if (user.lastStreakClaimDate) {
        const lastClaimTime = new Date(user.lastStreakClaimDate).getTime();
        const timeSince = Date.now() - lastClaimTime;
        const cooldownMs = 24 * 60 * 60 * 1000;

        if (timeSince < cooldownMs) {
          setCanClaim(false);
          setRemainingSeconds(Math.max(0, Math.ceil((cooldownMs - timeSince) / 1000)));
        } else {
          setCanClaim(true);
          setRemainingSeconds(0);
        }
      } else {
        setCanClaim(true);
        setRemainingSeconds(0);
      }
      loadQuestData(user.id);
    } else {
      setCanClaim(false);
    }
  };

  useEffect(() => {
    syncUserData();

    const handleUserUpdate = () => {
      syncUserData();
    };

    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
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
    if (totalSec <= 0) return '00:00:00';
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  // Main Claim Handler for 20 Coins
  const handleClaimReward = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (!canClaim) {
      setShowTryTomorrowModal(true);
      return;
    }

    setIsClaiming(true);
    setClaimFeedback('');

    try {
      const res = await fetch('/api/user/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          action: 'CLAIM_DAILY_LOGIN',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCanClaim(false);
        setRemainingSeconds(24 * 60 * 60);
        setClaimFeedback(`অভিনন্দন! আপনার একাউন্টে ২০ কয়েন সফলভাবে যোগ করা হয়েছে! 🎉`);

        if (data.user) {
          db.setCurrentUser(data.user);
          setCurrentUser(data.user);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('user-updated'));
            window.dispatchEvent(new Event('storage'));
          }
        } else {
          // Local fallback update
          const updated = {
            ...currentUser,
            coinBalance: Number(currentUser.coinBalance || 0) + 20,
            lastStreakClaimDate: new Date().toISOString(),
          };
          db.setCurrentUser(updated);
          db.updateUser(currentUser.id, updated);
          setCurrentUser(updated);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('user-updated'));
            window.dispatchEvent(new Event('storage'));
          }
        }

        triggerToast(`🎉 অভিনন্দন! ২০ ফ্রি কয়েন আপনার একাউন্টে যোগ হয়েছে!`, 'success');
        setTimeout(() => setClaimFeedback(''), 7000);
      } else {
        if (data.remainingSeconds) {
          setCanClaim(false);
          setRemainingSeconds(data.remainingSeconds);
        }
        setShowTryTomorrowModal(true);
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Error claiming daily reward. Please try again.', 'warning');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="relative p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl space-y-5 shadow-xs text-slate-900 font-sans">
      
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
            className="ml-auto p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Daily Login Reward Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        
        {/* Left Side: Icon & Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-md border-2 border-amber-300 shrink-0">
            <Coins className="w-7 h-7 animate-pulse text-slate-950" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading tracking-tight">
                Daily Login Reward
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>+20 FREE COINS</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              প্রতি ২৪ ঘণ্টা পর পর লগইন করে ফ্রিতে ২০ কয়েন ক্লেইম করুন! (Claim 20 free coins once every 24 hours)
            </p>
          </div>
        </div>

        {/* Right Side: Dynamic Action Button */}
        <div className="shrink-0 flex items-center">
          {!currentUser ? (
            /* State 1: Guest / Not Logged In */
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন করে ক্লেইম করুন</span>
            </button>
          ) : canClaim ? (
            /* State 2: Logged in & Ready to claim 20 Coins */
            <button
              onClick={handleClaimReward}
              disabled={isClaiming}
              className="w-full md:w-auto px-7 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:scale-[1.02] active:scale-[0.98]"
            >
              {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              <span>Claim +20 Daily Coins</span>
            </button>
          ) : (
            /* State 3: Already Claimed Today (Shows 24h Countdown) */
            <button
              onClick={() => setShowTryTomorrowModal(true)}
              className="w-full md:w-auto px-5 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl transition-all shadow-2xs flex items-center justify-between sm:justify-start gap-3 cursor-pointer group select-none"
              title="Already claimed today. Click to see details."
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">
                    Today's 20 Coins Claimed
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-700 font-bold rounded">
                    আজকেরটি সম্পন্ন
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono font-bold flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-600 animate-spin [animation-duration:8s]" />
                  <span>Next: <strong className="text-amber-600">{formatTimeRemaining(remainingSeconds)}</strong></span>
                </div>
              </div>
            </button>
          )}
        </div>

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

      {/* ========================================================================= */}
      {/* MODAL 1: LOGIN REQUIRED MODAL                                             */}
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
              <div className="w-14 h-14 bg-gradient-to-tr from-amber-500/20 to-orange-500/30 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                একাউন্টে লগইন প্রয়োজন
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                ডেইলি ফ্রি ২০ কয়েন ক্লেইম করতে অনুগ্রহ করে আপনার একাউন্টে লগইন করুন অথবা একটি নতুন একাউন্ট খুলুন।
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-1.5 text-xs text-slate-700">
              <div className="font-black text-amber-800 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-600" /> প্রতিদিন ফ্রি ২০ কয়েন বোনাস
              </div>
              <p className="text-[11px] text-slate-600">
                প্রতিদিন মাত্র ১ বার লগইন করে নিশ্চিত ফ্রি ২০ কয়েন ক্লেইম করুন এবং আপনার কয়েন ব্যালেন্স দিয়ে স্পিন বা টুর্নামেন্টে অংশ নিন।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/login?redirect=/ads"
                onClick={() => setShowLoginModal(false)}
                className="py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl text-center shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>লগইন করুন</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setShowLoginModal(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl text-center border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন একাউন্ট</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRY AGAIN TOMORROW MODAL                                         */}
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
                আজকের দিনের <strong>২০ ফ্রি কয়েন</strong> ইতিমধ্যে আপনি সফলভাবে ক্লেইম করেছেন। প্রতিদিন সর্বোচ্চ ১ বার ক্লেইম করা যায়।
              </p>
            </div>

            {/* Countdown Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                পরবর্তী ক্লেইম আনলক হতে সময় বাকি
              </span>
              <div className="text-2xl font-black font-mono text-amber-600">
                {formatTimeRemaining(remainingSeconds)}
              </div>
              <p className="text-[10px] text-slate-500">
                কাউন্টডাউন শেষ হলে আগামীকাল আবার ২০ কয়েন ক্লেইম করতে পারবেন।
              </p>
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
