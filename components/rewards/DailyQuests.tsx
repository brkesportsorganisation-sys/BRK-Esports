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
  DollarSign
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
        setClaimFeedback(data.message || 'Reward claimed!');
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }
        setTimeout(() => setClaimFeedback(''), 5000);
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
    <div className="p-6 md:p-8 bg-slate-900/70 border border-amber-500/30 rounded-3xl space-y-6 shadow-2xl shadow-amber-950/20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              7-Day Daily Login Streak
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold">
                FREE BONUS
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Log in every day to collect free coins, lucky spin tickets, and real cash!
            </p>
          </div>
        </div>

        {canClaim ? (
          <button
            onClick={handleClaimStreak}
            disabled={isClaiming || !currentUser}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            Claim Day {currentStreakDay} Reward
          </button>
        ) : (
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4" />
            Claimed for Today!
          </div>
        )}
      </div>

      {claimFeedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {claimFeedback}
        </div>
      )}

      {/* 7-Day Visual Streak Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {streakRewards.map((reward) => {
          const isPassed = reward.day < currentStreakDay || (!canClaim && reward.day === currentStreakDay);
          const isCurrent = reward.day === currentStreakDay && canClaim;
          const isDay7 = reward.day === 7;

          return (
            <div
              key={reward.day}
              className={`p-4 rounded-2xl border text-center transition-all space-y-2 relative overflow-hidden ${
                isCurrent
                  ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 border-amber-500 shadow-lg shadow-amber-500/20 scale-105'
                  : isPassed
                  ? 'bg-slate-950/80 border-emerald-500/40 opacity-80'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-60'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Day {reward.day}
              </div>

              <div className="my-2">
                {isDay7 ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center mx-auto shadow-md">
                    <DollarSign className="w-5 h-5 font-black" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto border border-slate-700">
                    <Coins className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="text-xs font-black text-white truncate">
                {reward.label}
              </div>

              {isPassed && (
                <div className="absolute top-1 right-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
