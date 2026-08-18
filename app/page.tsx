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
import TournamentCard from '@/components/tournaments/TournamentCard';
import { Tournament, LeaderboardEntry, Announcement } from '@/lib/types';
import { playerLeaderboard } from '@/lib/mock-data';
import { useLanguage } from '@/lib/language-context';

export default function HomePage() {
  const { t, isBangla } = useLanguage();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(playerLeaderboard);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'ALL' | 'FREE_FIRE' | 'EFOOTBALL' | 'PUBG_MOBILE' | 'VALORANT' | 'SOLO' | 'SQUAD'>('ALL');

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
          setSiteSettings(data.settings || {});
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

    const loadLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const payload = await res.json();
          if (payload.players && payload.players.length > 0) {
            setLeaderboard(payload.players);
          }
        }
      } catch (err) {
        console.warn('Using cached leaderboard for homepage:', err);
      }
    };

    void loadSettings();
    void loadTournaments();
    void loadAnnouncements();
    void loadLeaderboard();
  }, []);

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'FREE_FIRE') return (t.game || 'FREE_FIRE') === 'FREE_FIRE' || t.title.toLowerCase().includes('free fire');
    if (activeTab === 'EFOOTBALL') return t.game === 'EFOOTBALL' || t.title.toLowerCase().includes('efootball') || t.title.toLowerCase().includes('pes');
    if (activeTab === 'PUBG_MOBILE') return t.game === 'PUBG_MOBILE' || t.title.toLowerCase().includes('pubg') || t.title.toLowerCase().includes('bgmi');
    if (activeTab === 'VALORANT') return t.game === 'VALORANT' || t.title.toLowerCase().includes('valorant');
    if (activeTab === 'SQUAD') return t.mode === 'SQUAD';
    if (activeTab === 'SOLO') return t.mode === 'SOLO';
    return true;
  });

  return (
    <div className="flex flex-col font-body w-full">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden border-b border-slate-200">
        {/* Background Gradients & Particle Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-red/10 via-brand-orange/10 to-brand-purple/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Text */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-orange-50 border border-brand-orange/20">
                <Flame className="w-4 h-4 text-brand-red animate-pulse" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  {siteSettings.hero_badge || t('hero_badge', 'Multi-Game Esports Championships Live')}
                </span>
              </div>

              <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-none">
                {siteSettings.hero_title_1 || t('hero_title_1', 'DOMINATE THE')} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold">
                  {siteSettings.hero_title_2 || t('hero_title_2', 'ESPORTS ARENA')}
                </span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed">
                {siteSettings.hero_desc || t('hero_desc', "Join Bangladesh's premier automated esports platform. Compete in Free Fire, eFootball, PUBG Mobile, Valorant & daily tournaments, earn instant bKash payouts, and claim championship glory.")}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href={siteSettings.hero_btn_1_link || '/tournaments'}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-lg shadow-neon-red hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <Trophy className="w-5 h-5 text-white" />
                  <span>{siteSettings.hero_btn_1_text || t('hero_btn_browse', 'BROWSE TOURNAMENTS')}</span>
                </Link>

                <Link
                  href={siteSettings.hero_btn_2_link && siteSettings.hero_btn_2_link !== '/rewards' ? siteSettings.hero_btn_2_link : '/ads'}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-heading font-bold text-lg border border-slate-200 hover:border-brand-orange/60 hover:bg-slate-50 transition-all flex items-center justify-center space-x-3 shadow-sm"
                >
                  <Sparkles className="w-5 h-5 text-brand-gold" />
                  <span>{siteSettings.hero_btn_2_text || t('hero_btn_rewards', 'CLAIM FREE REWARDS')}</span>
                </Link>
              </div>



            </motion.div>

            {/* Right Hero Graphic Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-2xl"></div>

                {/* Hero Featured Tournament Preview */}
                <div className="relative rounded-2xl overflow-hidden h-64 mb-4">
                  <img
                    src={siteSettings.featured_image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800"}
                    alt="Free Fire Hero Tournament"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-brand-red text-white text-xs font-black uppercase shadow-sm animate-pulse">
                    {siteSettings.featured_badge || 'FEATURED LEAGUE'}
                  </span>
                </div>

                <h3 className="font-heading font-black text-2xl text-slate-900">
                  {siteSettings.featured_title || 'Grand Free Fire BR Squad League #42'}
                </h3>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                  <div>
                    <div className="text-xs text-slate-600 font-medium">Total Prize Pool</div>
                    <div className="text-2xl font-heading font-extrabold text-orange-500">
                      {siteSettings.featured_prize || '৳ 4,000 CASH'}
                    </div>
                  </div>
                  <Link
                    href={siteSettings.featured_link || '/tournaments'}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-bold text-sm shadow-neon-orange hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    <span>{siteSettings.featured_entry || 'ENTRY ৳100'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>



      {/* Referral Rewards & Monthly Event Progress Section */}
      <section className="py-6 sm:py-8 bg-white border-b border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 border border-orange-200/80 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Bar: Title + Live Countdown + Actions */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-orange-100/80 relative z-10">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-brand-red text-white tracking-widest inline-flex items-center gap-1 shadow-2xs">
                    <Flame className="w-3 h-3 animate-pulse" />
                    <span>{siteSettings.ref_banner_badge || 'MONTHLY EVENT'}</span>
                  </span>

                  {/* Clean Resets-in Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-orange-200 text-slate-700 text-xs font-mono font-bold shadow-2xs">
                    <Timer className="w-3 h-3 text-brand-orange" />
                    <span className="text-[10px] text-slate-400 font-sans uppercase font-bold">{isBangla ? 'রিসেট:' : 'RESETS IN:'}</span>
                    <span className="text-slate-900 font-black">
                      {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m <span className="text-brand-orange">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                    </span>
                  </div>
                </div>

                <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-900 leading-tight">
                  {siteSettings.ref_banner_title || 'REFERRAL REWARDS CRUSADE'}
                </h2>
                <p className="text-xs text-slate-600 max-w-xl">
                  {siteSettings.ref_banner_desc || 'Invite friends to Black Rock Arena. Rewards credit to your Promo Wallet to join tournaments for free!'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <Link
                  href={siteSettings.ref_btn_1_link || '/profile'}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange hover:from-brand-red/90 hover:to-brand-orange/90 text-white font-heading font-black text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{siteSettings.ref_btn_1_text || 'GET REFERRAL LINK'}</span>
                </Link>

                <Link
                  href={siteSettings.ref_btn_2_link || '/lfg'}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-heading font-bold text-xs border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5 text-brand-orange" />
                  <span>{siteSettings.ref_btn_2_text || 'FIND SQUAD (LFG)'}</span>
                </Link>
              </div>
            </div>

            {/* Compact Milestone Stages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 relative z-10">
              <div className="p-3 rounded-xl bg-white/90 border border-orange-100 shadow-2xs space-y-0.5 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">10 Referrals</div>
                <div className="text-base font-heading font-black text-amber-600">50 Coins 🪙</div>
                <div className="text-[9px] text-slate-400 font-mono">Stage 1 Reward</div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-orange-100 shadow-2xs space-y-0.5 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">50 Referrals</div>
                <div className="text-base font-heading font-black text-amber-600">100 Coins 🪙</div>
                <div className="text-[9px] text-slate-400 font-mono">Stage 2 Reward</div>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-orange-100 shadow-2xs space-y-0.5 text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">100 Referrals</div>
                <div className="text-base font-heading font-black text-amber-600">200 Coins 🪙</div>
                <div className="text-[9px] text-slate-400 font-mono">Stage 3 Reward</div>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-brand-orange/40 shadow-2xs space-y-0.5 text-center">
                <div className="text-[10px] text-brand-orange font-bold uppercase">300 Referrals</div>
                <div className="text-base font-heading font-black text-brand-red">৳ 500 CASH 🔥</div>
                <div className="text-[9px] text-brand-orange font-mono font-bold">Grand Prize</div>
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

      {/* Featured Tournaments Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-brand-orange text-xs font-bold uppercase tracking-widest mb-1">
              <Gamepad2 className="w-4 h-4" />
              <span>Active Competitions</span>
            </div>
            <h2 className="font-heading font-black text-4xl text-slate-900">
              FEATURED TOURNAMENTS
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            {[
              { id: 'ALL', label: '🎮 All Games' },
              { id: 'FREE_FIRE', label: '🔥 Free Fire' },
              { id: 'EFOOTBALL', label: '⚽ eFootball' },
              { id: 'PUBG_MOBILE', label: '🪖 PUBG Mobile' },
              { id: 'VALORANT', label: '🎯 Valorant' },
              { id: 'SOLO', label: 'Solo 1v1' },
              { id: 'SQUAD', label: 'Squad' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/tournaments"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-brand-orange text-slate-900 font-heading font-bold text-sm transition-all shadow-sm"
          >
            <span>VIEW ALL TOURNAMENTS ({tournaments.length})</span>
            <ChevronRight className="w-4 h-4 text-brand-orange" />
          </Link>
        </div>
      </section>

      {/* Global Leaderboard Preview */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold text-brand-gold uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-gold" />
              <span>Hall of Champions</span>
            </span>
            <h2 className="font-heading font-black text-4xl text-slate-900">
              GLOBAL PLAYER LEADERBOARD
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Top fraggers and legendary clan captains commanding the highest win rates and earnings this season.
            </p>

            <Link
              href="/leaderboard"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-bold text-sm shadow-neon-red hover:scale-105 transition-all"
            >
              <span>VIEW FULL RANKINGS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
              {leaderboard.slice(0, 4).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-heading font-black text-sm ${
                      player.rank === 1 ? 'bg-brand-gold text-white shadow-sm' :
                      player.rank === 2 ? 'bg-slate-300 text-slate-800' :
                      player.rank === 3 ? 'bg-amber-700 text-white' :
                      'bg-slate-200 text-slate-700 font-bold'
                    }`}>
                      #{player.rank}
                    </div>

                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-10 h-10 rounded-xl object-cover border border-brand-orange/40"
                    />

                    <div>
                      <div className="font-heading font-bold text-slate-900 text-base leading-tight flex items-center gap-2">
                        <span>{player.name}</span>
                        {player.tag && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-red/10 text-brand-red font-extrabold uppercase">
                            [{player.tag}]
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-mono">FF UID: {player.ffUid}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-heading font-black text-orange-500 text-lg">
                      ৳ {player.earnings.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold">
                      {player.kills} Kills • {player.wins} Booyahs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
