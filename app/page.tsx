'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Trophy, 
  Award, 
  ShieldCheck, 
  Zap, 
  Users, 
  Sparkles, 
  ChevronRight, 
  Gamepad2, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Wallet,
  Bell,
  Timer,
  Clock
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HomeBannerSlider from '@/components/home/HomeBannerSlider';
import { Tournament, Announcement } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';

export default function HomePage() {
  const { t, isBangla } = useLanguage();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('helian_site_settings');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });

  // Real-time Monthly Event Reset Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    function calculateTimeLeft() {
      const now = new Date();
      let target: Date;
      if (siteSettings.ref_reset_date) {
        target = new Date(siteSettings.ref_reset_date);
      } else {
        // Automatically target the 1st of next month at 00:00:00
        target = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      }

      let diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        // If passed, cycle to subsequent month
        const nextMonthTarget = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
        diff = Math.max(0, nextMonthTarget.getTime() - now.getTime());
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculateTimeLeft();
    const timerInterval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timerInterval);
  }, [siteSettings.ref_reset_date]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const settings = data.settings || {};
          setSiteSettings(settings);
          if (typeof window !== 'undefined') {
            localStorage.setItem('helian_site_settings', JSON.stringify(settings));
          }
        }
      } catch (err) {
        console.warn('Failed to load site settings:', err);
      }
    };

    const loadTournaments = async () => {
      try {
        const response = await fetch('/api/tournaments');
        if (!response.ok) return;
        const payload = await response.json();
        setTournaments(payload.tournaments || []);
      } catch {
        setTournaments([]);
      }
    };

    const loadAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements?category=TOURNAMENT');
        if (res.ok) {
          const payload = await res.json();
          if (payload.announcements && payload.announcements.length > 0) {
            setAnnouncements(payload.announcements);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load announcements:', err);
      }
    };

    void loadSettings();
    void loadTournaments();
    void loadAnnouncements();
  }, []);

  return (
    <div className="flex flex-col font-body w-full">
      <Navbar />

      {/* Hero Banner Section (3-Banner Grid on PC / 1-Banner on Mobile) */}
      <section className="relative pt-4 pb-12 overflow-hidden border-b border-slate-200 bg-slate-50/50">
        {/* Background Gradients & Particle Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-red/10 via-brand-orange/10 to-brand-purple/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* 3-Banner Carousel Slider matching User Mockup */}
        <HomeBannerSlider />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Referral Rewards & Monthly Event Crusade Banner (Unified in Home Hero Section) */}
          <div className="mt-12 rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white border-2 border-orange-500/40 shadow-xl shadow-orange-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Bar: Title + Live Countdown + Actions */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-brand-red text-white tracking-widest inline-flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3 animate-pulse" />
                    <span>{siteSettings.ref_banner_badge || 'MONTHLY EVENT'}</span>
                  </span>

                  {/* High-Contrast Resets-in Pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-orange-500/40 text-orange-400 text-xs font-mono font-bold shadow-sm">
                    <Timer className="w-3.5 h-3.5 text-brand-orange animate-spin" />
                    <span className="text-[10px] text-slate-300 font-sans uppercase font-bold">{isBangla ? 'রিসেট:' : 'RESETS IN:'}</span>
                    <span className="text-white font-black">
                      {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m <span className="text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                    </span>
                  </div>
                </div>

                <h2 className="font-heading font-black text-xl sm:text-2xl text-white leading-tight">
                  {siteSettings.ref_banner_title || 'REFERRAL REWARDS CRUSADE'}
                </h2>
                <p className="text-xs text-slate-300 max-w-xl">
                  {siteSettings.ref_banner_desc || 'Invite friends to Black Rock Arena. Rewards credit to your Promo Wallet to join tournaments for free!'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <Link
                  href={siteSettings.ref_btn_1_link || '/profile'}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 text-white font-heading font-black text-xs shadow-neon-red transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>{siteSettings.ref_btn_1_text || 'GET REFERRAL LINK'}</span>
                </Link>

                <Link
                  href={siteSettings.ref_btn_2_link || '/lfg'}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading font-bold text-xs border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4 text-brand-cyan" />
                  <span>{siteSettings.ref_btn_2_text || 'FIND SQUAD (LFG)'}</span>
                </Link>
              </div>
            </div>

            {/* Compact Milestone Stages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 relative z-10">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-inner space-y-1 text-center hover:border-orange-500/40 transition-colors">
                <div className="text-[10px] text-slate-400 font-bold uppercase">10 Referrals</div>
                <div className="text-lg font-heading font-black text-yellow-400">50 Coins 🪙</div>
                <div className="text-[10px] text-slate-500 font-mono">Stage 1 Reward</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-inner space-y-1 text-center hover:border-orange-500/40 transition-colors">
                <div className="text-[10px] text-slate-400 font-bold uppercase">50 Referrals</div>
                <div className="text-lg font-heading font-black text-yellow-400">100 Coins 🪙</div>
                <div className="text-[10px] text-slate-500 font-mono">Stage 2 Reward</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-inner space-y-1 text-center hover:border-orange-500/40 transition-colors">
                <div className="text-[10px] text-slate-400 font-bold uppercase">100 Referrals</div>
                <div className="text-lg font-heading font-black text-yellow-400">200 Coins 🪙</div>
                <div className="text-[10px] text-slate-500 font-mono">Stage 3 Reward</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-brand-red/30 to-brand-orange/30 border-2 border-brand-orange/70 shadow-neon-orange space-y-1 text-center">
                <div className="text-[10px] text-brand-gold font-bold uppercase">300 Referrals</div>
                <div className="text-lg font-heading font-black text-white">৳ 500 CASH 🔥</div>
                <div className="text-[10px] text-brand-orange font-mono font-bold">Grand Prize</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Recent Announcements Section */}
      {announcements.length > 0 && (
        <section className="py-12 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center space-x-2 text-brand-red text-xs font-bold uppercase tracking-widest mb-4">
              <Bell className="w-4 h-4" />
              <span>Latest Tournament Announcements</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col">
                  {ann.imageUrl && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4">
                      <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">{ann.title}</h3>
                  <p className="text-slate-600 text-sm flex-1">{ann.content}</p>
                  
                  {ann.link && (
                    <Link 
                      href={ann.link}
                      className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold text-xs text-center hover:opacity-90 transition-opacity"
                    >
                      VIEW TOURNAMENT SLOT
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}



      <Footer />
    </div>
  );
}
