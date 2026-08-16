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
  HelpCircle,
  CheckCircle2,
  Lock,
  Wallet,
  Bell
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import TournamentCard from '@/components/tournaments/TournamentCard';
import { Tournament, LeaderboardEntry, Announcement } from '@/lib/types';
import { playerLeaderboard } from '@/lib/mock-data';

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(playerLeaderboard);
  const [activeTab, setActiveTab] = useState<'ALL' | 'SQUAD' | 'SOLO' | 'CS_RANKED'>('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
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
        const { db } = await import('@/lib/db');
        const loadedAnnouncements = db.getAnnouncements().filter(a => a.category === 'TOURNAMENT');
        setAnnouncements(loadedAnnouncements);
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

    void loadTournaments();
    void loadAnnouncements();
    void loadLeaderboard();
  }, []);

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SQUAD') return t.mode === 'SQUAD';
    if (activeTab === 'SOLO') return t.mode === 'SOLO';
    if (activeTab === 'CS_RANKED') return t.format === 'CS_RANKED';
    return true;
  });

  const faqs = [
    {
      q: 'How do I join a Free Fire tournament on Black Rock?',
      a: 'Create an account, verify your Free Fire UID in your profile, select any open tournament, pay the entry fee using bKash/Nagad/Rocket (or join FREE tournaments), and copy your Room ID & Password 15 minutes before match start.'
    },
    {
      q: 'When and where will I get the Custom Room ID and Password?',
      a: 'The Room ID and Password will be automatically unlocked inside your joined tournament details page 15 to 20 minutes before the scheduled match time.'
    },
    {
      q: 'How are prize payouts calculated and distributed?',
      a: 'After match completion, admins verify kill points and Booyah standings. Winnings are directly deposited to your Black Rock Wallet, which you can withdraw anytime to your bKash or Nagad account.'
    },
    {
      q: 'Are emulators or modified APKs allowed?',
      a: 'No modified APKs, scripts, or auto-headshot hacks are permitted. Emulator slots are limited per tournament rules. Using cheats will result in a permanent hardware ban.'
    }
  ];

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
                  Season 5 Bangladesh Championship Live
                </span>
              </div>

              <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-none">
                DOMINATE THE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold">
                  FREE FIRE ARENA
                </span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed">
                Join Bangladesh's premier automated Free Fire esports platform. Compete in daily BR Squad, Duo & CS 4v4 tournaments, earn instant bKash payouts per kill, and claim the championship trophy.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/tournaments"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-lg shadow-neon-red hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3"
                >
                  <Trophy className="w-5 h-5 text-white" />
                  <span>BROWSE TOURNAMENTS</span>
                </Link>

                <Link
                  href="/rewards"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-heading font-bold text-lg border border-slate-200 hover:border-brand-orange/60 hover:bg-slate-50 transition-all flex items-center justify-center space-x-3 shadow-sm"
                >
                  <Sparkles className="w-5 h-5 text-brand-gold" />
                  <span>CLAIM FREE REWARDS</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200 max-w-md mx-auto lg:mx-0 text-center lg:text-left">
                <div>
                  <div className="font-heading font-extrabold text-2xl text-brand-gold">৳ 2.5 Lakh+</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Prize Pool Paid</div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-2xl text-brand-cyan">15,000+</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Active Players</div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-2xl text-brand-red">100%</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Anti-Cheat Safe</div>
                </div>
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
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800"
                    alt="Free Fire Hero Tournament"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-brand-red text-white text-xs font-black uppercase shadow-sm animate-pulse">
                    FEATURED LEAGUE
                  </span>
                </div>

                <h3 className="font-heading font-black text-2xl text-slate-900">
                  Grand Free Fire BR Squad League #42
                </h3>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                  <div>
                    <div className="text-xs text-slate-500">Total Prize Pool</div>
                    <div className="text-2xl font-heading font-extrabold text-orange-500">৳ 4,000 CASH</div>
                  </div>
                  <Link
                    href="/tournaments/tour_01"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-bold text-sm shadow-neon-orange hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    <span>ENTRY ৳100</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            </motion.div>

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
          <div className="flex items-center space-x-1 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            {(['ALL', 'SQUAD', 'SOLO', 'CS_RANKED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.replace('_', ' ')}
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

      {/* How It Works Section */}
      <section className="py-16 bg-slate-50 border-y border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-widest">
              Simple 4-Step Process
            </span>
            <h2 className="font-heading font-black text-4xl text-slate-900 mt-1">
              HOW TO COMPETE & WIN CASH
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-2xl relative border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-brand-red/10 text-brand-red font-heading font-black text-xl flex items-center justify-center mx-auto border border-brand-red/20">
                01
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900">Create Account</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Sign up with Google or Email and enter your official Free Fire In-Game UID & Name.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl relative border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 text-brand-orange font-heading font-black text-xl flex items-center justify-center mx-auto border border-brand-orange/20">
                02
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900">Pay & Register</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Deposit entry fees via bKash, Nagad, or Rocket with fast manual screenshot approval.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl relative border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 text-brand-cyan font-heading font-black text-xl flex items-center justify-center mx-auto border border-brand-cyan/20">
                03
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900">Get Room Pass</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Custom Room ID & Password auto-reveals on your dashboard 15 mins before match start.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl relative border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold font-heading font-black text-xl flex items-center justify-center mx-auto border border-brand-gold/20">
                04
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900">Booyah & Payout</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Score kills, claim Booyah, and withdraw winnings directly to your mobile bank account.
              </p>
            </div>

          </div>
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
                      player.rank === 2 ? 'bg-slate-300 text-slate-700' :
                      player.rank === 3 ? 'bg-amber-700 text-white' :
                      'bg-slate-200 text-slate-500'
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
                      <div className="text-xs text-slate-500 font-mono">FF UID: {player.ffUid}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-heading font-black text-orange-500 text-lg">
                      ৳ {player.earnings.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      {player.kills} Kills • {player.wins} Booyahs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-brand-orange uppercase tracking-widest flex items-center justify-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-brand-orange" />
            <span>Got Questions?</span>
          </span>
          <h2 className="font-heading font-black text-4xl text-slate-900 mt-1">
            FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 transition-all shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left font-heading font-bold text-lg text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-5 h-5 text-brand-orange transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-200 mt-1">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
