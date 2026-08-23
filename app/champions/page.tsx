'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Sparkles, 
  Medal, 
  Crosshair, 
  Star, 
  ShieldCheck, 
  Users, 
  Swords, 
  DollarSign, 
  Award,
  ChevronRight,
  Zap,
  RefreshCw,
  ExternalLink,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { ChampionsConfig, ChampionPodiumItem, HallOfFameSquad } from '@/lib/types';
import { DEFAULT_CHAMPIONS_CONFIG } from '@/lib/champions';

export default function ChampionsPage() {
  const [config, setConfig] = useState<ChampionsConfig>(DEFAULT_CHAMPIONS_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchChampions = async () => {
    try {
      const res = await fetch('/api/champions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.warn('Failed to load champions from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChampions();
  }, []);

  const top1 = config.topPodiums?.find(p => p.rank === 1) || DEFAULT_CHAMPIONS_CONFIG.topPodiums[0];
  const top2 = config.topPodiums?.find(p => p.rank === 2) || DEFAULT_CHAMPIONS_CONFIG.topPodiums[1];
  const top3 = config.topPodiums?.find(p => p.rank === 3) || DEFAULT_CHAMPIONS_CONFIG.topPodiums[2];

  const proAthletes = config.proAthletes && config.proAthletes.length > 0 
    ? config.proAthletes 
    : [top1, top2, top3];

  const squads = config.legendarySquads || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-red-50/25 to-amber-50/35 border border-amber-200/80 p-6 md:p-10 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mx-auto shadow-2xs">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>{config.bannerNotice || '👑 HALL OF FAME & MVP SHOWCASE'}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-heading">
            {config.seasonTitle ? (
              <span>{config.seasonTitle}</span>
            ) : (
              <>Esports <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-amber-500">Champions &amp; Legends</span></>
            )}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            {config.subtitle || 'Celebrating the top-performing Free Fire esports athletes and squads of the season. Compete in daily tournaments to earn your spot in the Hall of Fame!'}
          </p>
        </div>

        {/* 3D Animated Top 3 Podiums */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
          
          {/* #2 Silver Podium */}
          <div className="order-2 md:order-1 bg-white border-2 border-slate-300 rounded-3xl p-6 text-center space-y-4 shadow-md relative transform md:translate-y-4 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-800 font-black text-lg flex items-center justify-center border-4 border-white shadow-md">
              #2
            </div>
            <img
              src={top2.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
              alt={top2.inGameName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-slate-200 shadow-md bg-slate-950"
            />
            <div>
              <span className="text-[10px] uppercase font-black text-slate-500 block tracking-wider">{top2.badge || 'SNIPER GOD'}</span>
              <h3 className="font-heading font-black text-lg text-slate-900 mt-0.5 truncate">{top2.inGameName}</h3>
              <span className="text-xs text-slate-500 font-mono font-bold">UID: {top2.freeFireUid || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Season Earnings</span>
              <div className="text-xl font-black text-slate-800 font-mono">৳ {(top2.earnings || 0).toLocaleString()}</div>
            </div>
            {top2.signatureWeapon && (
              <div className="text-[11px] text-slate-500 font-mono">
                🔫 Gun: <strong className="text-slate-700">{top2.signatureWeapon}</strong>
              </div>
            )}
          </div>

          {/* #1 Gold Champion Podium */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50/80 via-white to-orange-50/50 border-2 border-amber-400 rounded-3xl p-8 text-center space-y-5 shadow-xl relative scale-105 z-10 hover:shadow-2xl transition-all duration-300">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-brand-red via-brand-orange to-amber-500 text-white font-black text-2xl flex items-center justify-center border-4 border-white shadow-xl animate-bounce">
              👑
            </div>
            <img
              src={top1.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200'}
              alt={top1.inGameName}
              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-amber-400 shadow-lg bg-slate-950"
            />
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 block bg-amber-100/80 px-3.5 py-0.5 rounded-full w-fit mx-auto border border-amber-300">
                {top1.badge || 'GRANDMASTER MVP'}
              </span>
              <h3 className="font-heading font-black text-2xl text-slate-900 mt-1.5 truncate">{top1.inGameName}</h3>
              <span className="text-xs text-amber-800 font-mono font-bold">UID: {top1.freeFireUid || 'N/A'}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-amber-300 space-y-1 shadow-2xs">
              <span className="text-[10px] text-amber-600 uppercase font-bold">Grand Season Earnings</span>
              <div className="text-2xl font-black text-amber-600 font-mono">৳ {(top1.earnings || 0).toLocaleString()}</div>
            </div>
            {top1.signatureWeapon && (
              <div className="text-[11px] text-amber-900 font-mono font-medium">
                🎯 Signature Loadout: <strong className="text-brand-orange">{top1.signatureWeapon}</strong>
              </div>
            )}
          </div>

          {/* #3 Bronze Podium */}
          <div className="order-3 bg-white border-2 border-amber-300/80 rounded-3xl p-6 text-center space-y-4 shadow-md relative transform md:translate-y-8 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-700 text-white font-black text-lg flex items-center justify-center border-4 border-white shadow-md">
              #3
            </div>
            <img
              src={top3.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200'}
              alt={top3.inGameName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-amber-300 shadow-md bg-slate-950"
            />
            <div>
              <span className="text-[10px] uppercase font-black text-amber-700 block tracking-wider">{top3.badge || 'RUSHER KING'}</span>
              <h3 className="font-heading font-black text-lg text-slate-900 mt-0.5 truncate">{top3.inGameName}</h3>
              <span className="text-xs text-slate-500 font-mono font-bold">UID: {top3.freeFireUid || 'N/A'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Season Earnings</span>
              <div className="text-xl font-black text-amber-700 font-mono">৳ {(top3.earnings || 0).toLocaleString()}</div>
            </div>
            {top3.signatureWeapon && (
              <div className="text-[11px] text-slate-500 font-mono">
                🔫 Gun: <strong className="text-slate-700">{top3.signatureWeapon}</strong>
              </div>
            )}
          </div>

        </div>

        {/* Pro Athlete Trading Cards */}
        <div className="space-y-6 pt-10">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 font-heading">
              <Award className="w-5 h-5 text-brand-orange" />
              <span>Pro Athlete Cards &amp; Tournament Stats</span>
            </h3>
            <Link href="/leaderboard" className="text-xs text-brand-orange hover:underline flex items-center gap-1 font-bold">
              <span>Full Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proAthletes.map((champ, idx) => (
              <div
                key={champ.id || idx}
                className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 hover:border-brand-orange/60 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={champ.avatar || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'}
                    alt={champ.inGameName}
                    className="w-13 h-13 rounded-2xl object-cover border border-slate-200 bg-slate-950 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {champ.badge || 'PRO ATHLETE'}
                    </span>
                    <h4 className="font-heading font-black text-sm text-slate-900 truncate mt-0.5">{champ.inGameName}</h4>
                    <span className="text-[11px] text-slate-500 font-mono truncate block">UID: {champ.freeFireUid || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Booyahs</span>
                    <strong className="text-amber-600 font-extrabold font-mono">{champ.totalWins || 0} Wins</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Headshot Rate</span>
                    <strong className="text-emerald-600 font-extrabold font-mono">{champ.headshotRate || '60.0%'}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">Signature Guns</span>
                    <strong className="text-slate-700 font-mono text-[11px]">{champ.signatureWeapon || 'M1887 & MP40'}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hall of Fame Legendary Squads */}
        {squads.length > 0 && (
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 font-heading">
                <Shield className="w-5 h-5 text-brand-orange" />
                <span>Hall of Fame Legendary Squads &amp; Clans</span>
              </h3>
              <Link href="/teams" className="text-xs text-brand-orange hover:underline flex items-center gap-1 font-bold">
                <span>View All Squads</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {squads.map((sq) => (
                <div
                  key={sq.id}
                  className="p-6 bg-gradient-to-r from-white to-orange-50/20 border border-slate-200 rounded-3xl shadow-sm hover:border-amber-400 space-y-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={sq.logo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'}
                      alt={sq.squadName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 bg-slate-950 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 font-mono font-black text-[10px] border border-amber-300">
                          [{sq.tag}]
                        </span>
                        <h4 className="font-heading font-black text-base text-slate-900 truncate">
                          {sq.squadName}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Captain: <strong className="text-slate-800">{sq.captainName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">Total Clan Earnings:</span>
                    <strong className="text-emerald-600 font-black font-mono text-sm">৳ {sq.totalEarnings.toLocaleString()}</strong>
                  </div>

                  <div className="text-xs font-semibold text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
                    {sq.titles}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
