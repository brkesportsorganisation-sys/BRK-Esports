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
  ArrowRight
} from 'lucide-react';
import { db } from '@/lib/db';
import { User } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';

export default function ReferralSection() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
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

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);

    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
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

  const referralUrl = typeof window !== 'undefined' && currentUser?.referralCode
    ? `${window.location.origin}/register?ref=${currentUser.referralCode}`
    : '';

  return (
    <div id="referral-rewards-section" className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-white via-red-50/40 to-orange-50/50 text-slate-900 border-2 border-red-200/90 shadow-md shadow-red-500/5 relative overflow-hidden">
      
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
            {siteSettings.ref_banner_desc || 'Invite friends to Black Rock Arena. Rewards credit to your Promo Wallet to join tournaments for free!'}
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
        <div className="mt-4 p-3.5 sm:p-4 bg-white/95 rounded-2xl border border-red-200/90 shadow-sm flex flex-col sm:flex-row items-center gap-3 relative z-10">
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
                  window.open(`https://wa.me/?text=Join me on BRK Esports and compete in tournaments! ${referralUrl}`, '_blank');
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
        <div className="mt-4 p-3.5 sm:p-4 bg-white/95 rounded-2xl border border-red-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
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

    </div>
  );
}
