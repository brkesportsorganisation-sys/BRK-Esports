'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Flame, 
  Coins, 
  Gift, 
  CheckCircle2, 
  Sparkles, 
  Trophy, 
  ArrowRight,
  Check,
  Loader2,
  DollarSign,
  Clock,
  Lock
} from 'lucide-react';
import { db } from '@/lib/db';
import { User } from '@/lib/types';

interface StreakReward {
  day: number;
  label: string;
  type: string;
  value: number;
}

export default function DailyQuests() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStreakDay, setCurrentStreakDay] = useState(1);
  const [canClaim, setCanClaim] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [streakRewards, setStreakRewards] = useState<StreakReward[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState('');

  const loadQuestData = async (uid: string) => {
    try {
      const res = await fetch(`/api/user/quests?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentStreakDay(data.currentStreakDay || 1);
        setCanClaim(data.canClaimStreak ?? true);
        setRemainingSeconds(data.remainingSeconds || 0);
        setStreakRewards(data.streakRewards || []);
      }
    } catch (err) {
      console.warn('Failed to load quest data:', err);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.id) {
      loadQuestData(user.id);
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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // Format seconds to HH:MM:SS
  const formatTimeRemaining = (totalSec: number) => {
    if (totalSec <= 0) return '00:00:00';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  };

  const handleClaimStreak = async () => {
    if (!currentUser || isClaiming || !canClaim) return;
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

      if (res.ok) {
        setCanClaim(false);
        setCurrentStreakDay(data.currentStreakDay);
        setRemainingSeconds(data.remainingSeconds || 86400);
        setClaimFeedback(data.message || 'Reward claimed!');
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }
        setTimeout(() => setClaimFeedback(''), 6000);
      } else {
        alert(data.message || 'Failed to claim streak reward.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error claiming reward.');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-white border border-slate-200/90 rounded-3xl space-y-6 shadow-sm text-slate-900 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-brand-red/10 to-brand-orange/15 text-brand-orange border border-orange-200 rounded-2xl">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 font-heading">
                7-Day Daily Login Streak
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-brand-orange font-bold">
                FREE BONUS
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              প্রতি ২৪ ঘণ্টা পর পর লগইন করে ফ্রি রিওয়ার্ড ক্লেইম করুন! (Claim every 24 hours)
            </p>
          </div>
        </div>

        {canClaim ? (
          <button
            onClick={handleClaimStreak}
            disabled={isClaiming || !currentUser}
            className="px-6 py-3 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer animate-pulse"
          >
            {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            <span>Claim Day {currentStreakDay} Reward</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl self-start sm:self-auto shadow-2xs">
            <Clock className="w-4 h-4 text-brand-orange animate-spin [animation-duration:8s]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium uppercase">Next Claim in:</span>
              <span className="font-mono text-brand-orange font-black text-xs">
                {formatTimeRemaining(remainingSeconds)}
              </span>
            </div>
          </div>
        )}
      </div>

      {claimFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{claimFeedback}</span>
        </div>
      )}

      {/* 7-Day Visual Streak Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {streakRewards.map((reward) => {
          // Passed days: days before currentStreakDay, or currentStreakDay if already claimed today
          const isPassed = reward.day < currentStreakDay || (!canClaim && reward.day === currentStreakDay);
          const isCurrent = reward.day === currentStreakDay && canClaim;
          const isDay7 = reward.day === 7;

          return (
            <div
              key={reward.day}
              className={`p-4 rounded-2xl border text-center transition-all space-y-2 relative overflow-hidden ${
                isCurrent
                  ? 'bg-gradient-to-b from-orange-50 to-amber-50/60 border-2 border-brand-orange shadow-md scale-105 ring-2 ring-brand-orange/20'
                  : isPassed
                  ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500 opacity-75'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Day {reward.day}</span>
              </div>

              <div className="my-2">
                {isDay7 ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-red to-brand-orange text-white flex items-center justify-center mx-auto shadow-xs">
                    <DollarSign className="w-5 h-5 font-black" />
                  </div>
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto border shadow-2xs ${
                    isCurrent ? 'bg-orange-500 text-white border-orange-400' : 'bg-white text-brand-orange border-slate-200'
                  }`}>
                    <Coins className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-amber-500'}`} />
                  </div>
                )}
              </div>

              <div className="text-xs font-black text-slate-900 truncate">
                {reward.label}
              </div>

              {isPassed ? (
                <div className="absolute top-1.5 right-1.5 text-emerald-600 bg-white/80 rounded-full p-0.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              ) : !isCurrent ? (
                <div className="absolute top-1.5 right-1.5 text-slate-300">
                  <Lock className="w-3 h-3" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
