'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  Timer, 
  Users, 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Facebook, 
  Link as LinkIcon,
  Sparkles,
  Trophy,
  ArrowRight,
  Lock,
  Unlock,
  Loader2,
  Coins,
  DollarSign,
  Award
} from 'lucide-react';
import { db } from '@/lib/db';
import { User } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';

export default function ReferralSection() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [claimingMilestoneId, setClaimingMilestoneId] = useState<number | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState('');
  const { isBangla } = useLanguage();

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Calculate monthly reset countdown
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      const difference = nextMonth.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

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
    } catch {}
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.id) void refreshUser(user.id);

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSiteSettings(data.settings);
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
    }

    void loadSettings();
  }, []);

  // Dynamic Milestone Configurations loaded from Admin Settings
  const m1Required = parseInt(siteSettings.ref_stage1_required || '10');
  const m1Reward   = parseInt(siteSettings.ref_stage1_reward   || '50');
  const m2Required = parseInt(siteSettings.ref_stage2_required || '50');
  const m2Reward   = parseInt(siteSettings.ref_stage2_reward   || '100');
  const m3Required = parseInt(siteSettings.ref_stage3_required || '100');
  const m3Reward   = parseInt(siteSettings.ref_stage3_reward   || '200');
  const m4Required = parseInt(siteSettings.ref_stage4_required || '300');
  const m4Reward   = parseInt(siteSettings.ref_stage4_reward   || '500');

  const referralMilestones = [
    { id: m1Required, stage: 1, required: m1Required, rewardAmount: m1Reward, rewardType: 'COIN' as const, label: `${m1Reward} Coins 🪙`, title: 'Bronze Pass' },
    { id: m2Required, stage: 2, required: m2Required, rewardAmount: m2Reward, rewardType: 'COIN' as const, label: `${m2Reward} Coins 🪙`, title: 'Silver Pass' },
    { id: m3Required, stage: 3, required: m3Required, rewardAmount: m3Reward, rewardType: 'COIN' as const, label: `${m3Reward} Coins 🪙`, title: 'Gold Pass' },
    { id: m4Required, stage: 4, required: m4Required, rewardAmount: m4Reward, rewardType: 'WALLET' as const, label: `৳${m4Reward} Real Cash 💵`, title: 'Diamond Jackpot' },
  ];

  const totalUserReferrals = Number(currentUser?.totalReferrals) || 0;
  const maxRequired = Math.max(m4Required, 1);
  const progressPercent = Math.min(100, Math.round((totalUserReferrals / maxRequired) * 100));

  const handleClaimMilestone = async (milestoneId: number, rewardType: 'COIN' | 'WALLET', rewardAmount: number) => {
    if (!currentUser || claimingMilestoneId !== null) return;
    setClaimingMilestoneId(milestoneId);
    setClaimSuccessMsg('');

    try {
      const res = await fetch('/api/user/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          milestoneId,
          rewardType,
          rewardAmount,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }
        setClaimSuccessMsg(data.message || (isBangla ? '🎉 রিওয়ার্ড সফলভাবে আপনার একাউন্টে যোগ হয়েছে!' : '🎉 Milestone reward claimed successfully!'));
        setTimeout(() => setClaimSuccessMsg(''), 6000);
      } else {
        alert(data.message || (isBangla ? 'রিওয়ার্ড ক্লেইম করা যায়নি।' : 'Failed to claim milestone reward.'));
      }
    } catch (err: any) {
      console.warn('Milestone claim API error:', err);
      alert(err.message || 'Network error claiming milestone.');
    } finally {
      setClaimingMilestoneId(null);
    }
  };

  const referralUrl = typeof window !== 'undefined' && currentUser?.referralCode
    ? `${window.location.origin}/register?ref=${currentUser.referralCode}`
    : '';

  return (
    <div id="referral-rewards-section" className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-white via-red-50/40 to-orange-50/50 text-slate-900 border-2 border-red-200/90 shadow-md shadow-red-500/5 relative overflow-hidden space-y-6">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-brand-red/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Title + Live Countdown + Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-200/90 relative z-10">
        <div className="space-y-1.5 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white tracking-widest inline-flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3 animate-pulse" />
              <span>{siteSettings.ref_banner_badge || 'MONTHLY EVENT • RESETS 1ST OF EVERY MONTH'}</span>
            </span>

            {/* High-Contrast Resets-in Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-red-200/80 text-orange-600 text-xs font-mono font-bold shadow-xs">
              <Timer className="w-3.5 h-3.5 text-brand-orange animate-spin" />
              <span className="text-[10px] text-slate-500 font-sans uppercase font-bold">{isBangla ? 'রিসেট:' : 'RESETS:'}</span>
              <span className="text-slate-900 font-black">
                {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m <span className="text-brand-orange">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </span>
            </div>
          </div>

          <h2 className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-slate-900 leading-tight">
            {siteSettings.ref_banner_title || 'REFERRAL REWARDS CRUSADE'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
            {siteSettings.ref_banner_desc || 'Invite friends to ESPORTS ZONE BD Arena. Rewards credit to your Promo Wallet to join tournaments for free!'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href={currentUser ? '/profile#referral' : '/login?redirect=/rewards'}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 text-white font-heading font-black text-xs shadow-neon-red transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>{currentUser ? (siteSettings.ref_btn_1_text || 'VIEW REFERRAL PASS') : 'GET REFERRAL LINK'}</span>
          </Link>

          <Link
            href={siteSettings.ref_btn_2_link || '/lfg'}
            className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-heading font-bold text-xs border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Users className="w-4 h-4 text-brand-orange" />
            <span>{siteSettings.ref_btn_2_text || 'FIND SQUAD (LFG)'}</span>
          </Link>
        </div>
      </div>

      {/* Active User's Referral Link Quick Share Box */}
      {currentUser?.referralCode ? (
        <div className="p-3.5 sm:p-4 bg-white/95 rounded-2xl border border-red-200/90 shadow-sm flex flex-col sm:flex-row items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0 self-start sm:self-auto">
            <Gift className="w-4 h-4 text-brand-red" />
            <span>আপনার রেফারেল লিংক:</span>
          </div>

          <div className="flex-1 w-full relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono focus:outline-none select-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                if (referralUrl) {
                  navigator.clipboard.writeText(referralUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (referralUrl) {
                  window.open(`https://wa.me/?text=Join me on ESPORTS ZONE BD and compete in tournaments! ${referralUrl}`, '_blank');
                }
              }}
              className="flex items-center justify-center w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (referralUrl) {
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`, '_blank');
                }
              }}
              className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
              title="Share on Facebook"
            >
              <Facebook className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 bg-white/95 rounded-2xl border border-red-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Gift className="w-4 h-4 text-brand-red" />
            <span>বন্ধুদের ইনভাইট করে ফ্রি প্রোমো কয়েন ও ওয়ালেট ক্যাশ আর্ন করতে লগইন করুন।</span>
          </div>
          <Link
            href="/login?redirect=/rewards"
            className="px-4 py-2 bg-gradient-to-r from-brand-red to-brand-orange text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs hover:brightness-110"
          >
            লগইন করুন
          </Link>
        </div>
      )}

      {claimSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {claimSuccessMsg}
          </span>
          <button onClick={() => setClaimSuccessMsg('')} className="p-1 hover:text-slate-900">✕</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          REFERRAL MILESTONES & REWARD PRIZES LADDER (কতো রেফারেল = কি প্রাইজ)
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-5 border border-slate-200 shadow-sm space-y-3.5 relative z-10">
        
        {/* Milestone Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-brand-orange flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>{isBangla ? 'রেফারেল মাইলস্টোন প্রাইজ লিস্ট' : 'Referral Milestone Rewards'}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold uppercase">
                  FREE PASS
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isBangla 
                  ? 'রেফারেল মাইলস্টোন পূরণ করে ক্যাশ ও কয়েন প্রাইজ সংগ্রহ করুন।' 
                  : 'Reach invite milestones to unlock Cash & Coin prizes.'}
              </p>
            </div>
          </div>

          {currentUser && (
            <div className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0">
              <span className="text-slate-500 font-bold text-[11px]">{isBangla ? 'মোট রেফারেল:' : 'Referrals:'}</span>
              <span className="font-mono font-black text-brand-orange text-xs sm:text-sm">{totalUserReferrals}</span>
            </div>
          )}
        </div>

        {/* 4-Tier Interactive Milestone Cards Grid - Compact 2x2 on Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {referralMilestones.map((milestone) => {
            const isUnlocked = totalUserReferrals >= milestone.required;
            const isClaimed = Boolean(currentUser?.claimedMilestones?.includes(milestone.id));
            const isGrandPrize = milestone.rewardType === 'WALLET';

            return (
              <div
                key={milestone.id}
                className={`p-2.5 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-1.5 relative overflow-hidden ${
                  isClaimed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : isUnlocked
                    ? isGrandPrize
                      ? 'bg-gradient-to-br from-red-50 to-orange-50 border border-brand-orange shadow-xs'
                      : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 shadow-xs'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className={`font-black uppercase px-1.5 py-0.5 rounded text-[9px] ${
                    isClaimed
                      ? 'bg-emerald-200/80 text-emerald-800'
                      : isUnlocked
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    Stage {milestone.stage}
                  </span>

                  <div>
                    {isClaimed ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5 text-[10px]">
                        <Check className="w-3 h-3 text-emerald-600" /> Done
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-orange-600 font-bold flex items-center gap-0.5 text-[10px] animate-pulse">
                        <Unlock className="w-3 h-3 text-orange-600" /> Ready
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-0.5 text-[10px]">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Prize Details */}
                <div className="py-0.5">
                  <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Users className="w-3 h-3 text-brand-orange" />
                    <span>{milestone.required} {isBangla ? 'টি রেফারেল' : 'Invites'}</span>
                  </div>

                  <div className="font-heading font-black text-xs sm:text-sm md:text-base text-slate-900 mt-0.5 leading-tight truncate">
                    {isGrandPrize ? (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">
                        {milestone.label}
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        {milestone.label}
                      </span>
                    )}
                  </div>

                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {isGrandPrize 
                      ? (isBangla ? 'মেইন ওয়ালেট ক্যাশ' : 'Cash Wallet credit') 
                      : (isBangla ? 'কয়েন ওয়ালেট জমা' : 'Coins Wallet')}
                  </p>
                </div>

                {/* Action / Claim Button */}
                <div className="pt-1.5 border-t border-slate-200/60">
                  {currentUser ? (
                    isClaimed ? (
                      <div className="w-full py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] text-center">
                        Claimed
                      </div>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleClaimMilestone(milestone.id, milestone.rewardType, milestone.rewardAmount)}
                        disabled={claimingMilestoneId === milestone.id}
                        className="w-full py-1 px-1.5 rounded-lg bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-[10px] uppercase shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all hover:brightness-110 active:scale-95"
                      >
                        {claimingMilestoneId === milestone.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>...</span>
                          </>
                        ) : (
                          <>
                            <Gift className="w-3 h-3" />
                            <span>{isBangla ? 'ক্লেইম' : 'Claim'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full py-1 rounded-lg bg-slate-100 text-slate-400 font-bold text-[9px] sm:text-[10px] text-center truncate">
                        {Math.max(0, milestone.required - totalUserReferrals)} more needed
                      </div>
                    )
                  ) : (
                    <Link
                      href="/login?redirect=/rewards"
                      className="w-full block py-1 px-1 rounded-lg bg-slate-900 text-white font-bold text-[9px] sm:text-[10px] text-center truncate"
                    >
                      লগইন করুন
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

