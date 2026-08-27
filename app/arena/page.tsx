'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { 
  Swords, 
  Crosshair, 
  Trophy, 
  Flame, 
  Plus, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Coins, 
  DollarSign, 
  Zap, 
  ShieldCheck, 
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DuelChallenge, User, Banner } from '@/lib/types';
import { useRealtimeBroadcast } from '@/lib/use-realtime';

export default function ArenaPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [duels, setDuels] = useState<DuelChallenge[]>([]);
  const [arenaBanner, setArenaBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Real-time Supabase Broadcast listener for live duel challenges
  useRealtimeBroadcast('arena-duels', 'DUEL_UPDATE', () => {
    loadDuels();
  });
  const [activeTab, setActiveTab] = useState<'OPEN' | 'MY_DUELS'>('OPEN');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Form State
  const [mode, setMode] = useState<any>('1v1_CS');
  const [stakeType, setStakeType] = useState<'BDT' | 'COINS'>('BDT');
  const [entryFee, setEntryFee] = useState(50);
  const [customRules, setCustomRules] = useState('Headshots Only / Unlimited Ammo (Standard 1v1 Rules)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDuels = async () => {
    try {
      const res = await fetch('/api/arena');
      if (res.ok) {
        const data = await res.json();
        setDuels(data.duels || []);
      }
    } catch (err) {
      console.warn('Failed to load duels:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBanner = async () => {
    try {
      const res = await fetch('/api/banners');
      if (res.ok) {
        const data = await res.json();
        if (data.arenaBanner) {
          setArenaBanner(data.arenaBanner);
        } else if (data.banners) {
          const found = data.banners.find((b: any) => b.placement === 'ARENA_BANNER');
          if (found) setArenaBanner(found);
        }
      }
    } catch (err) {
      console.warn('Failed to load arena banner:', err);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    loadDuels();
    loadBanner();
    const interval = setInterval(loadDuels, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateDuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          creatorId: currentUser.id,
          creatorName: currentUser.name,
          creatorIgn: currentUser.inGameName || currentUser.name,
          creatorUid: currentUser.freeFireUid || '',
          mode,
          customRules,
          stakeType,
          entryFee,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCreateModalOpen(false);
        loadDuels();
        setActiveTab('MY_DUELS');
      } else {
        alert(data.message || 'Failed to create duel challenge.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptDuel = async (duel: DuelChallenge) => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (confirm(`Do you want to accept this 1v1 duel for ৳${duel.entryFee}?`)) {
      try {
        const res = await fetch('/api/arena', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ACCEPT',
            duelId: duel.id,
            challengerId: currentUser.id,
            challengerName: currentUser.name,
            challengerIgn: currentUser.inGameName || currentUser.name,
            challengerUid: currentUser.freeFireUid || '',
          }),
        });

        const data = await res.json();

        if (res.ok) {
          loadDuels();
          setActiveTab('MY_DUELS');
        } else {
          alert(data.message || 'Failed to accept duel.');
        }
      } catch (err: any) {
        alert(err.message || 'Error accepting duel.');
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDuels = duels.filter((d) => {
    if (activeTab === 'MY_DUELS') {
      return currentUser && (d.creatorId === currentUser.id || d.challengerId === currentUser.id);
    }
    if (selectedFilter !== 'ALL' && d.mode !== selectedFilter) return false;
    return d.status === 'OPEN';
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-brand-orange selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header / Admin Customizable Arena Banner */}
        {arenaBanner && arenaBanner.isActive ? (
          <div className="relative rounded-3xl overflow-hidden border-2 border-orange-500/40 p-6 md:p-10 shadow-xl shadow-orange-500/10 text-white min-h-[200px] flex flex-col justify-center bg-slate-950 group">
            {arenaBanner.imageUrl && (
              <img
                src={arenaBanner.imageUrl}
                alt={arenaBanner.title}
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                {arenaBanner.badge && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-red/20 border border-brand-red/40 text-orange-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                    <Flame className="w-4 h-4 text-brand-red animate-pulse" />
                    <span>{arenaBanner.badge}</span>
                  </div>
                )}
                <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                  {arenaBanner.title}
                </h1>
                {arenaBanner.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
                    {arenaBanner.subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {arenaBanner.linkUrl && arenaBanner.linkUrl !== '/arena' && arenaBanner.linkUrl !== '#' ? (
                  <a
                    href={arenaBanner.linkUrl}
                    className="px-6 py-4 bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 active:scale-95 text-white font-heading font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-neon-red flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{arenaBanner.buttonText || 'EXPLORE NOW'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        window.location.href = '/login';
                        return;
                      }
                      setCreateModalOpen(true);
                    }}
                    className="px-6 py-4 bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 active:scale-95 text-white font-heading font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-neon-red flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span>{arenaBanner.buttonText || 'Create Custom Room'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Default Hero Header matching Black Rock signature theme */
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-orange-500/40 p-6 md:p-10 shadow-xl shadow-orange-500/10 text-white">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-red/20 border border-brand-red/40 text-orange-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                  <Flame className="w-4 h-4 text-brand-red animate-pulse" />
                  <span>INSTANT CUSTOM ROOMS & DUEL ARENA</span>
                </div>
                <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">
                  CHALLENGE & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold">WIN INSTANTLY</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  No need to wait for tournaments! Stake your entry, play custom rooms and duels against top players, and win instant cash directly into your wallet!
                </p>
              </div>

              <button
                onClick={() => {
                  if (!currentUser) {
                    window.location.href = '/login';
                    return;
                  }
                  setCreateModalOpen(true);
                }}
                className="px-6 py-4 bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 active:scale-95 text-white font-heading font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-neon-red flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Create Custom Room</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/60 gap-1.5">
            <button
              onClick={() => setActiveTab('OPEN')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black transition-all cursor-pointer ${
                activeTab === 'OPEN'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Open Challenges ({duels.filter(d => d.status === 'OPEN').length})
            </button>
            <button
              onClick={() => setActiveTab('MY_DUELS')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black transition-all cursor-pointer ${
                activeTab === 'MY_DUELS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              My Active Duels
            </button>
          </div>

          {activeTab === 'OPEN' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {['ALL', '1v1_CS', '1v1_SNIPER', '1v1_DEAGLE', '2v2_CS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                    selectedFilter === f
                      ? 'bg-orange-50 border-brand-orange text-brand-orange font-black shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {f === 'ALL' ? '🎮 All Modes' : f.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Challenges Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-orange" />
            <p className="text-sm font-bold">Loading matchmaking duel feed...</p>
          </div>
        ) : filteredDuels.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
            <Swords className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="font-heading font-black text-xl text-slate-900">No Challenges Found</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeTab === 'MY_DUELS'
                ? 'You do not have any active or ongoing duel challenges.'
                : 'Be the first to post a 1v1 challenge and wait for an opponent to match!'}
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs rounded-xl shadow-md cursor-pointer"
            >
              Post First 1v1 Challenge
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDuels.map((duel) => {
              const isCreator = currentUser?.id === duel.creatorId;
              const isChallenger = currentUser?.id === duel.challengerId;
              const isInDuel = isCreator || isChallenger;

              return (
                <div
                  key={duel.id}
                  className={`p-6 rounded-3xl border transition-all space-y-5 bg-white shadow-sm hover:shadow-xl hover:border-brand-orange/60 ${
                    duel.status === 'IN_PROGRESS'
                      ? 'border-brand-orange/60 bg-gradient-to-b from-orange-50/50 via-white to-white'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="px-3 py-1 rounded-xl bg-orange-50 text-brand-orange border border-brand-orange/20 font-black text-xs uppercase inline-flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5" />
                      {duel.mode.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      duel.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                    }`}>
                      {duel.status === 'OPEN' ? '🟢 OPEN FOR DUEL' : '⚔️ IN BATTLE'}
                    </span>
                  </div>

                  {/* Players / Versus */}
                  <div className="grid grid-cols-5 items-center text-center py-2">
                    <div className="col-span-2 space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-red/15 to-brand-orange/15 text-brand-orange font-heading font-black text-sm flex items-center justify-center mx-auto border border-brand-orange/30 shadow-xs">
                        {duel.creatorIgn.slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 truncate">{duel.creatorIgn}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold block">Host</span>
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs italic shadow-md flex items-center justify-center">
                        VS
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 font-heading font-black text-sm flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
                        {duel.challengerIgn ? duel.challengerIgn.slice(0, 2).toUpperCase() : '?'}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {duel.challengerIgn || 'Waiting...'}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold block">Opponent</span>
                    </div>
                  </div>

                  {/* Rules & Stakes */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-semibold">Entry Stake:</span>
                      <strong className="text-slate-900 font-mono font-bold">
                        {duel.stakeType === 'COINS' ? `${duel.entryFee} Coins` : `৳ ${duel.entryFee}`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/70 pt-2">
                      <span className="text-slate-700 font-bold">Winner Takes:</span>
                      <strong className="text-emerald-600 font-heading font-black text-lg">
                        {duel.stakeType === 'COINS' ? `${duel.prizePool} Coins` : `৳ ${duel.prizePool}`}
                      </strong>
                    </div>
                    <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/70">
                      Rules: {duel.customRules}
                    </p>
                  </div>

                  {/* In Progress Room ID Details */}
                  {duel.status === 'IN_PROGRESS' && isInDuel && (
                    <div className="bg-gradient-to-br from-white via-red-50/20 to-orange-50/30 text-slate-900 p-4 rounded-2xl border-2 border-red-200/90 space-y-2.5 shadow-sm">
                      <div className="text-[10px] uppercase font-black text-brand-orange tracking-wider">Match Custom Room</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Room ID: <strong className="text-brand-orange font-mono font-black">{duel.roomId}</strong></span>
                        <button
                          onClick={() => handleCopy(duel.roomId!, `${duel.id}_room`)}
                          className="text-[10px] bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg text-brand-orange font-bold cursor-pointer transition-colors"
                        >
                          {copiedId === `${duel.id}_room` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Password: <strong className="text-slate-900 font-mono font-black">{duel.roomPass}</strong></span>
                        <button
                          onClick={() => handleCopy(duel.roomPass!, `${duel.id}_pass`)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-bold cursor-pointer transition-colors"
                        >
                          {copiedId === `${duel.id}_pass` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {duel.status === 'OPEN' && (
                    <button
                      onClick={() => handleAcceptDuel(duel)}
                      disabled={isCreator}
                      className="w-full py-3.5 bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 disabled:opacity-40 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-neon-orange flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>{isCreator ? 'Your Challenge (Waiting)' : `Accept Duel (৳${duel.entryFee})`}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Create Challenge Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-orange-50 text-brand-orange border border-orange-200">
                  <Swords className="w-5 h-5" />
                </span>
                <h3 className="font-heading font-black text-lg text-slate-900">Create 1v1 / 2v2 Challenge</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateDuel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Duel Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                >
                  <option value="1v1_CS">1v1 Clash Squad (Standard)</option>
                  <option value="1v1_SNIPER">1v1 Sniper Battle (AWM / M82B)</option>
                  <option value="1v1_DEAGLE">1v1 Desert Eagle Only</option>
                  <option value="2v2_CS">2v2 Duo Clash Squad</option>
                  <option value="CUSTOM_BERMUDA">Custom Bermuda 1v1</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Stake Currency</label>
                  <select
                    value={stakeType}
                    onChange={(e: any) => setStakeType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                  >
                    <option value="BDT">Real Wallet (৳ BDT)</option>
                    <option value="COINS">BRK Coins 🪙</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Entry Fee</label>
                  <input
                    type="number"
                    min={20}
                    max={5000}
                    required
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Stake Quick Presets */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] font-bold text-slate-500">Quick Stakes:</span>
                {[30, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setEntryFee(amt)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      entryFee === amt ? 'bg-orange-50 border-brand-orange text-brand-orange' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>

              <div className="p-3.5 bg-orange-50/70 rounded-2xl border border-brand-orange/20 text-xs flex items-center justify-between">
                <span className="text-slate-700 font-bold">Winner Prize (90% Payout):</span>
                <strong className="text-emerald-600 font-heading font-black text-base">
                  {stakeType === 'COINS' ? `${Math.floor(entryFee * 2 * 0.9)} Coins` : `৳ ${Math.floor(entryFee * 2 * 0.9)}`}
                </strong>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Custom Match Rules</label>
                <input
                  type="text"
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  <span>Post Duel Challenge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
