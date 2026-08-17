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
  Sparkles
} from 'lucide-react';
import { DuelChallenge, User } from '@/lib/types';
import { useRealtimeBroadcast } from '@/lib/use-realtime';

export default function ArenaPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [duels, setDuels] = useState<DuelChallenge[]>([]);
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

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    loadDuels();
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
        // Update user local balance
        const updated = { ...currentUser };
        if (stakeType === 'COINS') {
          updated.coinBalance = Math.max(0, (updated.coinBalance || 0) - entryFee);
        } else {
          updated.walletBalance = Math.max(0, (updated.walletBalance || 0) - entryFee);
        }
        setCurrentUser(updated);
        db.setCurrentUser(updated);
      } else {
        alert(data.message || 'Failed to create duel.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating duel challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptDuel = async (duel: DuelChallenge) => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (confirm(`Accept ${duel.mode.replace('_', ' ')} Duel for ৳${duel.entryFee} / ${duel.entryFee} Coins? Winner gets ৳${duel.prizePool}!`)) {
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
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/50 via-orange-950/40 to-slate-900 border border-red-500/30 p-6 md:p-10 shadow-2xl shadow-red-950/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold">
                <Swords className="w-3.5 h-3.5 animate-pulse" />
                INSTANT 1V1 & 2V2 DUEL ARENA
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Challenge & <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-amber-400">Win Instantly</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                No need to wait for tournaments! Stake your entry, duel 1v1 against top players in Free Fire, and win instant cash directly into your wallet!
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
              className="px-6 py-3.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-red-500/25 flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create 1v1 Challenge
            </button>
          </div>
        </div>

        {/* Tab & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-2">
            <button
              onClick={() => setActiveTab('OPEN')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'OPEN'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open Challenges ({duels.filter(d => d.status === 'OPEN').length})
            </button>
            <button
              onClick={() => setActiveTab('MY_DUELS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'MY_DUELS'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
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
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    selectedFilter === f
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'ALL' ? 'All Modes' : f.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Challenges Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-400" />
            <p className="text-sm">Loading matchmaking duel feed...</p>
          </div>
        ) : filteredDuels.length === 0 ? (
          <div className="p-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4 max-w-xl mx-auto">
            <Swords className="w-12 h-12 mx-auto text-slate-600" />
            <h3 className="text-lg font-bold text-white">No Challenges Found</h3>
            <p className="text-xs text-slate-400">
              {activeTab === 'MY_DUELS'
                ? 'You do not have any active or ongoing duel challenges.'
                : 'Be the first to post a 1v1 challenge and wait for an opponent to match!'}
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 bg-red-500 text-black font-black text-xs rounded-xl"
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
                  className={`p-6 rounded-3xl border transition-all space-y-5 shadow-xl ${
                    duel.status === 'IN_PROGRESS'
                      ? 'bg-gradient-to-b from-red-950/30 via-slate-900 to-slate-900 border-red-500/50 shadow-red-950/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-orange-500/50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-black text-xs uppercase">
                      {duel.mode.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      duel.status === 'OPEN'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                    }`}>
                      {duel.status === 'OPEN' ? 'OPEN FOR DUEL' : 'IN BATTLE'}
                    </span>
                  </div>

                  {/* Players / Versus */}
                  <div className="grid grid-cols-5 items-center text-center py-1">
                    <div className="col-span-2 space-y-1">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-orange-400 font-black text-xs flex items-center justify-center mx-auto border border-slate-700">
                        {duel.creatorIgn.slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="font-bold text-xs text-white truncate">{duel.creatorIgn}</h4>
                      <span className="text-[10px] text-slate-500 block">Host</span>
                    </div>

                    <div className="col-span-1 text-red-500 font-black text-sm italic">
                      VS
                    </div>

                    <div className="col-span-2 space-y-1">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center mx-auto border border-slate-700">
                        {duel.challengerIgn ? duel.challengerIgn.slice(0, 2).toUpperCase() : '?'}
                      </div>
                      <h4 className="font-bold text-xs text-white truncate">
                        {duel.challengerIgn || 'Waiting...'}
                      </h4>
                      <span className="text-[10px] text-slate-500 block">Opponent</span>
                    </div>
                  </div>

                  {/* Rules & Stakes */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Entry Stake:</span>
                      <strong className="text-white">
                        {duel.stakeType === 'COINS' ? `${duel.entryFee} Coins` : `৳ ${duel.entryFee}`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                      <span className="text-slate-400 font-bold">Winner Takes:</span>
                      <strong className="text-emerald-400 font-black text-sm">
                        {duel.stakeType === 'COINS' ? `${duel.prizePool} Coins` : `৳ ${duel.prizePool}`}
                      </strong>
                    </div>
                    <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                      Rules: {duel.customRules}
                    </p>
                  </div>

                  {/* In Progress Room ID Details */}
                  {duel.status === 'IN_PROGRESS' && isInDuel && (
                    <div className="bg-slate-950 p-3 rounded-2xl border border-red-500/40 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Match Custom Room</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Room ID: <strong className="text-orange-400 font-mono">{duel.roomId}</strong></span>
                        <button
                          onClick={() => handleCopy(duel.roomId!, `${duel.id}_room`)}
                          className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 hover:text-white"
                        >
                          {copiedId === `${duel.id}_room` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Password: <strong className="text-white font-mono">{duel.roomPass}</strong></span>
                        <button
                          onClick={() => handleCopy(duel.roomPass!, `${duel.id}_pass`)}
                          className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 hover:text-white"
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
                      className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                    >
                      <Crosshair className="w-4 h-4" />
                      {isCreator ? 'Your Challenge (Waiting)' : `Accept Duel (৳${duel.entryFee})`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl shadow-red-950/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-black text-white">Create 1v1 / 2v2 Challenge</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDuel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Duel Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
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
                  <label className="text-xs font-bold text-slate-300">Stake Currency</label>
                  <select
                    value={stakeType}
                    onChange={(e: any) => setStakeType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="BDT">Real Wallet (৳ BDT)</option>
                    <option value="COINS">BRK Coins 🪙</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Entry Fee</label>
                  <input
                    type="number"
                    min={20}
                    max={5000}
                    required
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">Winner Prize (90%):</span>
                <strong className="text-emerald-400 font-black text-sm">
                  {stakeType === 'COINS' ? `${Math.floor(entryFee * 2 * 0.9)} Coins` : `৳ ${Math.floor(entryFee * 2 * 0.9)}`}
                </strong>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Custom Match Rules</label>
                <input
                  type="text"
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/25 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  Post Duel Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
