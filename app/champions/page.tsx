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
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface ChampionPlayer {
  rank: number;
  name: string;
  inGameName: string;
  freeFireUid: string;
  avatar: string;
  earnings: number;
  totalWins: number;
  totalKills: number;
  headshotRate: string;
  badge: string;
  signatureWeapon: string;
}

const TOP_CHAMPIONS: ChampionPlayer[] = [
  {
    rank: 1,
    name: 'Tanvir Hossain',
    inGameName: 'BRK・DEVIL亗',
    freeFireUid: '189283741',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
    earnings: 45200,
    totalWins: 38,
    totalKills: 312,
    headshotRate: '68.4%',
    badge: 'GRANDMASTER MVP',
    signatureWeapon: 'M1887 & AWM',
  },
  {
    rank: 2,
    name: 'Sabbir Ahmed',
    inGameName: 'BLACK・VIPER⚡',
    freeFireUid: '204918231',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    earnings: 32800,
    totalWins: 27,
    totalKills: 245,
    headshotRate: '61.2%',
    badge: 'SNIPER GOD',
    signatureWeapon: 'M82B & Desert Eagle',
  },
  {
    rank: 3,
    name: 'Rakib Hasan',
    inGameName: 'NOVA・KILLER࿐',
    freeFireUid: '193827162',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
    earnings: 24500,
    totalWins: 21,
    totalKills: 198,
    headshotRate: '57.8%',
    badge: 'RUSHER KING',
    signatureWeapon: 'MP40 & Woodpecker',
  },
];

export default function ChampionsPage() {
  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-slate-900 border border-amber-500/30 p-6 md:p-10 text-center space-y-3 shadow-2xl shadow-amber-950/30">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold mx-auto">
            <Crown className="w-3.5 h-3.5" />
            HALL OF FAME & MVP SHOWCASE
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Esports <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400">Champions & Legends</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Celebrating the top-performing Free Fire esports athletes and squads of the season. Compete in daily tournaments to earn your spot in the Hall of Fame!
          </p>
        </div>

        {/* 3D Animated Top 3 Podiums */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
          
          {/* #2 Silver Podium */}
          <div className="order-2 md:order-1 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-800 border-2 border-slate-400/40 rounded-3xl p-6 text-center space-y-4 shadow-xl relative transform md:translate-y-4">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-slate-300 text-slate-900 font-black text-lg flex items-center justify-center border-4 border-slate-900 shadow-lg">
              #2
            </div>
            <img
              src={TOP_CHAMPIONS[1].avatar}
              alt={TOP_CHAMPIONS[1].inGameName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-slate-400/50 shadow-md"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{TOP_CHAMPIONS[1].badge}</span>
              <h3 className="font-black text-lg text-white">{TOP_CHAMPIONS[1].inGameName}</h3>
              <span className="text-xs text-slate-400 font-mono">UID: {TOP_CHAMPIONS[1].freeFireUid}</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Earnings</span>
              <div className="text-xl font-black text-slate-200">৳ {TOP_CHAMPIONS[1].earnings.toLocaleString()}</div>
            </div>
          </div>

          {/* #1 Gold Champion Podium */}
          <div className="order-1 md:order-2 bg-gradient-to-t from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-400 rounded-3xl p-8 text-center space-y-5 shadow-2xl shadow-amber-500/20 relative scale-105 z-10">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-black font-black text-2xl flex items-center justify-center border-4 border-slate-900 shadow-2xl animate-bounce">
              👑
            </div>
            <img
              src={TOP_CHAMPIONS[0].avatar}
              alt={TOP_CHAMPIONS[0].inGameName}
              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-amber-400 shadow-xl"
            />
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block bg-amber-500/20 px-3 py-0.5 rounded-full w-fit mx-auto border border-amber-500/40">
                {TOP_CHAMPIONS[0].badge}
              </span>
              <h3 className="font-black text-2xl text-white mt-1">{TOP_CHAMPIONS[0].inGameName}</h3>
              <span className="text-xs text-amber-200 font-mono">UID: {TOP_CHAMPIONS[0].freeFireUid}</span>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/40 space-y-1 shadow-lg">
              <span className="text-[10px] text-amber-400 uppercase font-bold">Grand Season Earnings</span>
              <div className="text-2xl font-black text-amber-400">৳ {TOP_CHAMPIONS[0].earnings.toLocaleString()}</div>
            </div>
          </div>

          {/* #3 Bronze Podium */}
          <div className="order-3 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-800 border-2 border-amber-700/40 rounded-3xl p-6 text-center space-y-4 shadow-xl relative transform md:translate-y-8">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-amber-700 text-white font-black text-lg flex items-center justify-center border-4 border-slate-900 shadow-lg">
              #3
            </div>
            <img
              src={TOP_CHAMPIONS[2].avatar}
              alt={TOP_CHAMPIONS[2].inGameName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-amber-700/50 shadow-md"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-600 block">{TOP_CHAMPIONS[2].badge}</span>
              <h3 className="font-black text-lg text-white">{TOP_CHAMPIONS[2].inGameName}</h3>
              <span className="text-xs text-slate-400 font-mono">UID: {TOP_CHAMPIONS[2].freeFireUid}</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Earnings</span>
              <div className="text-xl font-black text-amber-500">৳ {TOP_CHAMPIONS[2].earnings.toLocaleString()}</div>
            </div>
          </div>

        </div>

        {/* Pro Athlete Trading Cards */}
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Pro Athlete Cards & Stats
            </h3>
            <Link href="/leaderboard" className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-bold">
              Full Leaderboard <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TOP_CHAMPIONS.map((champ) => (
              <div
                key={champ.rank}
                className="p-6 bg-slate-900/70 border border-slate-800 rounded-3xl space-y-4 hover:border-amber-500/40 transition-all shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={champ.avatar}
                    alt={champ.inGameName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="font-black text-sm text-white">{champ.inGameName}</h4>
                    <span className="text-[11px] text-slate-400">{champ.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Booyahs</span>
                    <strong className="text-amber-400">{champ.totalWins} Wins</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Headshot Rate</span>
                    <strong className="text-emerald-400">{champ.headshotRate}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block font-bold">Signature Guns</span>
                    <strong className="text-slate-300 font-mono text-[11px]">{champ.signatureWeapon}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
