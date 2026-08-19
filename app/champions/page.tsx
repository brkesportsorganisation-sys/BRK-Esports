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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-red-50/25 to-amber-50/35 border border-amber-200/80 p-6 md:p-10 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold mx-auto">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            HALL OF FAME & MVP SHOWCASE
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-heading">
            Esports <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-amber-500">Champions & Legends</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Celebrating the top-performing Free Fire esports athletes and squads of the season. Compete in daily tournaments to earn your spot in the Hall of Fame!
          </p>
        </div>

        {/* 3D Animated Top 3 Podiums */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
          
          {/* #2 Silver Podium */}
          <div className="order-2 md:order-1 bg-white border-2 border-slate-300 rounded-3xl p-6 text-center space-y-4 shadow-md relative transform md:translate-y-4">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-slate-200 text-slate-800 font-black text-lg flex items-center justify-center border-4 border-white shadow-md">
              #2
            </div>
            <img
              src={TOP_CHAMPIONS[1].avatar}
              alt={TOP_CHAMPIONS[1].inGameName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-slate-200 shadow-md"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">{TOP_CHAMPIONS[1].badge}</span>
              <h3 className="font-black text-lg text-slate-900">{TOP_CHAMPIONS[1].inGameName}</h3>
              <span className="text-xs text-slate-500 font-mono">UID: {TOP_CHAMPIONS[1].freeFireUid}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Earnings</span>
              <div className="text-xl font-black text-slate-800">৳ {TOP_CHAMPIONS[1].earnings.toLocaleString()}</div>
            </div>
          </div>

          {/* #1 Gold Champion Podium */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50/80 via-white to-orange-50/50 border-2 border-amber-400 rounded-3xl p-8 text-center space-y-5 shadow-xl relative scale-105 z-10">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-brand-red to-brand-orange text-white font-black text-2xl flex items-center justify-center border-4 border-white shadow-xl animate-bounce">
              👑
            </div>
            <img
              src={TOP_CHAMPIONS[0].avatar}
              alt={TOP_CHAMPIONS[0].inGameName}
              className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-amber-400 shadow-lg"
            />
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 block bg-amber-100/70 px-3 py-0.5 rounded-full w-fit mx-auto border border-amber-300">
                {TOP_CHAMPIONS[0].badge}
              </span>
              <h3 className="font-black text-2xl text-slate-900 mt-1">{TOP_CHAMPIONS[0].inGameName}</h3>
              <span className="text-xs text-amber-700 font-mono font-bold">UID: {TOP_CHAMPIONS[0].freeFireUid}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-amber-300 space-y-1 shadow-2xs">
              <span className="text-[10px] text-amber-600 uppercase font-bold">Grand Season Earnings</span>
              <div className="text-2xl font-black text-amber-600">৳ {TOP_CHAMPIONS[0].earnings.toLocaleString()}</div>
            </div>
          </div>

          {/* #3 Bronze Podium */}
          <div className="order-3 bg-white border-2 border-amber-300/80 rounded-3xl p-6 text-center space-y-4 shadow-md relative transform md:translate-y-8">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-amber-600 text-white font-black text-lg flex items-center justify-center border-4 border-white shadow-md">
              #3
            </div>
            <img
              src={TOP_CHAMPIONS[2].avatar}
              alt={TOP_CHAMPIONS[2].inGameName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-amber-300 shadow-md"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 block">{TOP_CHAMPIONS[2].badge}</span>
              <h3 className="font-black text-lg text-slate-900">{TOP_CHAMPIONS[2].inGameName}</h3>
              <span className="text-xs text-slate-500 font-mono">UID: {TOP_CHAMPIONS[2].freeFireUid}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Total Earnings</span>
              <div className="text-xl font-black text-amber-700">৳ {TOP_CHAMPIONS[2].earnings.toLocaleString()}</div>
            </div>
          </div>

        </div>

        {/* Pro Athlete Trading Cards */}
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
              <Award className="w-5 h-5 text-brand-orange" />
              Pro Athlete Cards & Stats
            </h3>
            <Link href="/leaderboard" className="text-xs text-brand-orange hover:underline flex items-center gap-1 font-bold">
              Full Leaderboard <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TOP_CHAMPIONS.map((champ) => (
              <div
                key={champ.rank}
                className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 hover:border-brand-orange/60 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={champ.avatar}
                    alt={champ.inGameName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{champ.inGameName}</h4>
                    <span className="text-[11px] text-slate-500">{champ.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Booyahs</span>
                    <strong className="text-amber-600 font-extrabold">{champ.totalWins} Wins</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Headshot Rate</span>
                    <strong className="text-emerald-600 font-extrabold">{champ.headshotRate}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">Signature Guns</span>
                    <strong className="text-slate-700 font-mono text-[11px]">{champ.signatureWeapon}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
