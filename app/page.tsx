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
  Clock,
  Copy,
  Check,
  Link as LinkIcon,
  MessageCircle,
  Facebook,
  Gift,
  ShoppingBag,
  Coins,
  ShoppingCart
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HomeBannerSlider from '@/components/home/HomeBannerSlider';
import HomeLotteryWheel from '@/components/home/HomeLotteryWheel';
import { Tournament, Announcement, User, ShopProduct, Banner } from '@/lib/types';
import TournamentCard from '@/components/tournaments/TournamentCard';
import { db } from '@/lib/db';
import { useLanguage } from '@/lib/language-context';

import { initialTournaments } from '@/lib/mock-data';

function stripHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getGameBadge(game?: string, title?: string) {
  const g = (game || '').toUpperCase();
  const t = (title || '').toLowerCase();

  if (g === 'EFOOTBALL' || t.includes('efootball') || t.includes('pes')) {
    return { name: 'eFootball', icon: '⚽', color: 'bg-blue-600/90 text-white border-blue-400/40 shadow-blue-500/20' };
  }
  if (g === 'PUBG_MOBILE' || t.includes('pubg') || t.includes('bgmi')) {
    return { name: 'PUBG Mobile', icon: '🪖', color: 'bg-amber-600/90 text-white border-amber-400/40 shadow-amber-500/20' };
  }
  if (g === 'VALORANT' || t.includes('valorant')) {
    return { name: 'Valorant', icon: '🎯', color: 'bg-rose-600/90 text-white border-rose-400/40 shadow-rose-500/20' };
  }
  if (g === 'MLBB' || t.includes('mobile legends') || t.includes('mlbb')) {
    return { name: 'MLBB', icon: '⚔️', color: 'bg-purple-600/90 text-white border-purple-400/40 shadow-purple-500/20' };
  }
  if (g === 'COD_MOBILE' || t.includes('cod') || t.includes('call of duty')) {
    return { name: 'COD Mobile', icon: '💥', color: 'bg-emerald-600/90 text-white border-emerald-400/40 shadow-emerald-500/20' };
  }
  if (g === 'LUDO_KING' || t.includes('ludo')) {
    return { name: 'Ludo King', icon: '🎲', color: 'bg-indigo-600/90 text-white border-indigo-400/40 shadow-indigo-500/20' };
  }
  return { name: 'Free Fire', icon: '🔥', color: 'bg-orange-600/90 text-white border-orange-400/40 shadow-orange-500/20' };
}

export default function HomePage() {
  const { t, isBangla } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [featuredShopItems, setFeaturedShopItems] = useState<ShopProduct[]>([]);
  const [shopBanner, setShopBanner] = useState<Banner | null>(null);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  // Real-time Monthly Event Reset Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    try {
      const cached = localStorage.getItem('helian_site_settings');
      if (cached) setSiteSettings(JSON.parse(cached));
    } catch {}
  }, []);

  useEffect(() => {
    const cur = db.getCurrentUser();
    if (cur) setCurrentUser(cur);
  }, []);

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

    const loadShopItems = async () => {
      try {
        const res = await fetch('/api/shop');
        if (res.ok) {
          const data = await res.json();
          const items: ShopProduct[] = data.products || [];
          const homeFeatured = items.filter(p => p.isFeaturedOnHome);
          setFeaturedShopItems(homeFeatured.length > 0 ? homeFeatured : items.slice(0, 3));
        }
      } catch {}
    };

    const loadShopBanner = async () => {
      try {
        const res = await fetch('/api/banners');
        if (res.ok) {
          const data = await res.json();
          if (data.shopBanner) setShopBanner(data.shopBanner);
        }
      } catch {}
    };

    void loadSettings();
    void loadTournaments();
    void loadAnnouncements();
    void loadShopItems();
    void loadShopBanner();
  }, []);

  const displayedTournaments = (tournaments.length > 0 ? tournaments : initialTournaments).slice(0, 2);

  return (
    <div className="flex flex-col font-body w-full">
      <Navbar />

      <main id="main-content" className="flex-1 w-full">
        {/* Hero Banner Section (3-Banner Grid on PC / 1-Banner on Mobile) */}
        <section className="relative pt-4 pb-4 overflow-hidden border-b border-slate-200 bg-slate-50/50">
          {/* Background Gradients & Particle Glows */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-red/10 via-brand-orange/10 to-brand-purple/10 rounded-full blur-[120px] pointer-events-none"></div>

          {/* 3-Banner Carousel Slider matching User Mockup */}
          <HomeBannerSlider />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Interactive Lucky Lottery Wheel with Continuous Spin Animation */}
            <HomeLotteryWheel />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FEATURED 2 TOURNAMENTS SECTION -> Direct Click redirects to /tournaments  */}
        {/* ========================================================================= */}
        <section className="pt-6 pb-12 bg-slate-50/70 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
            
            {/* Section Header with Direct Link to /tournaments */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-xs font-black uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-orange-700 animate-pulse" />
                  <span>FEATURED TOURNAMENTS</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                  {isBangla ? 'লাইভ ও আপকামিং টুর্নামেন্ট' : 'Live & Featured Arena Tournaments'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                  {isBangla 
                    ? 'টুর্নামেন্টে অংশগ্রহণ করুন, প্রতিপক্ষকে পরাজিত করুন এবং জিতে নিন আকর্ষণীয় রিয়েল ক্যাশ প্রাইজ।' 
                    : 'Compete in top esports matches, climb the leaderboard, and claim real bKash & Nagad cash prizes.'}
                </p>
              </div>

              <Link
                href="/tournaments"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-neon-orange transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              >
                <span>{isBangla ? 'সকল টুর্নামেন্ট দেখুন' : 'Explore All Tournaments'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 2 Tournaments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedTournaments.map((tour) => (
                <TournamentCard key={tour.id} tournament={tour} />
              ))}
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* FEATURED GAMING SHOP & DIAMOND PACKS SECTION -> Links to /shop             */}
        {/* ========================================================================= */}
        {featuredShopItems.length > 0 && (
          <section className="py-12 bg-white border-b border-slate-200 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 relative z-10">
              
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                    <span>EZBD OFFICIAL GAMING SHOP</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                    {isBangla ? 'ফ্রি ফায়ার ডায়মন্ড ও গেমিং রিওয়ার্ডস শপ' : 'Free Fire Diamonds & Coin Rewards Hub'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                    {isBangla
                      ? 'আপনার অর্জিত EZBD Coins (🪙) অথবা ওয়ালেট ক্যাশ (৳) দিয়ে ইনস্ট্যান্ট ডায়মন্ড, উইকলি মেম্বারশিপ ও স্কিন রিওয়ার্ডস কিনুন।'
                      : 'Use your tournament winnings or EZBD Coins to buy official Free Fire Diamonds, Weekly Passes, and Exclusive items with instant UID delivery!'}
                  </p>
                </div>

                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isBangla ? 'সম্পূর্ণ শপ ভিজিট করুন' : 'Visit Full Shop'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* ── Custom Shop Banner (Click to Redirect Directly to /shop) ── */}
              <Link
                href={shopBanner?.linkUrl || '/shop'}
                className="group relative block w-full rounded-3xl overflow-hidden border border-slate-800 hover:border-amber-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer bg-slate-950 text-white"
              >
                {/* Banner Background Image */}
                <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-950">
                  <img
                    src={shopBanner?.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=75'}
                    alt={shopBanner?.title || 'Gaming Shop'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Banner Overlay Details */}
                <div className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-between z-10">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                      <span>{shopBanner?.badge || 'ESPORTS ZONE BD OFFICIAL REWARDS & COIN SHOP'}</span>
                    </div>
                    <h3 className="text-xl sm:text-3xl md:text-4xl font-black font-heading tracking-tight text-white group-hover:text-amber-400 transition-colors drop-shadow-md">
                      {shopBanner?.title || 'Gaming Shop & Diamond Center'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed drop-shadow-sm">
                      {shopBanner?.subtitle || (
                        isBangla
                          ? 'আপনার অর্জিত EZBD Coins (🪙) অথবা ওয়ালেট ক্যাশ (৳) দিয়ে ইনস্ট্যান্ট ডায়মন্ড, উইকলি মেম্বারশিপ ও স্কিন রিওয়ার্ডস কিনুন!'
                          : 'Use your tournament winnings or EZBD Coins to buy official Free Fire Diamonds, Weekly Passes, and Exclusive items!'
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{shopBanner?.buttonText || (isBangla ? 'শপ ভিজিট করুন' : 'Explore Full Shop')}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>

                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/40">
                      <Coins className="w-4 h-4 text-amber-300" />
                      <span>Instant Free Fire Delivery ⚡</span>
                    </span>
                  </div>
                </div>
              </Link>

              {/* Featured Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredShopItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#F8FAFC] rounded-3xl overflow-hidden border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                  >
                    {/* Top Thumbnail Banner */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500'}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                      {/* Badge */}
                      {item.badge && (
                        <span className="absolute top-3.5 right-3.5 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase shadow-md">
                          {item.badge}
                        </span>
                      )}

                      {/* Category */}
                      <div className="absolute bottom-3 left-3.5 z-10 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-sm shadow-xs">
                          {item.icon || '💎'}
                        </span>
                        <span className="text-[11px] font-bold text-white uppercase font-heading drop-shadow-sm">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="font-heading font-black text-base text-slate-900 group-hover:text-brand-orange transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.description || 'Instant Free Fire game delivery directly to player UID.'}
                        </p>
                      </div>

                      {/* Dual Pricing Box */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1.5">
                        {(item.currencyType === 'WALLET' || item.currencyType === 'BOTH') && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold">Cash / Wallet:</span>
                            <strong className="text-emerald-700 font-black text-sm">৳ {item.priceBdt} BDT</strong>
                          </div>
                        )}

                        {(item.currencyType === 'COINS' || item.currencyType === 'BOTH') && (
                          <div className={`flex items-center justify-between text-xs ${
                            item.currencyType === 'BOTH' ? 'border-t border-slate-100 pt-1.5' : ''
                          }`}>
                            <span className="text-slate-600 font-semibold flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-600" />
                              <span>Or Pay With Coins:</span>
                            </span>
                            <strong className="text-amber-800 font-black text-sm">
                              {item.priceCoins.toLocaleString()} 🪙
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Buy CTA Button */}
                      <Link
                        href="/shop"
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-brand-red hover:to-brand-orange text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{isBangla ? 'কিনুন / রিডিম করুন' : 'Buy / Redeem Now'}</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>
        )}

        {/* Recent Announcements Section */}
        {announcements.length > 0 && (
          <section className="py-12 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center space-x-2 text-red-700 text-xs font-black uppercase tracking-widest mb-4">
                <Bell className="w-4 h-4" />
                <span>Latest Tournament Announcements</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col">
                    {ann.imageUrl && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4">
                        <img src={ann.imageUrl} alt={ann.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">{ann.title}</h3>
                    <p className="text-slate-700 text-sm flex-1">{ann.content}</p>
                    
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
      </main>

      <Footer />
    </div>
  );
}
