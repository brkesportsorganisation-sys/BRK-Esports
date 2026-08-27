'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  MessageCircle,
  Send,
  KeyRound,
  Gamepad2,
  RefreshCw,
  X,
  ExternalLink,
  ShieldAlert,
  Share2,
  CheckCheck,
  User as UserIcon,
  Crown
} from 'lucide-react';
import { DuelChallenge, DuelChatMessage, User, Banner } from '@/lib/types';
import { useRealtimeBroadcast } from '@/lib/use-realtime';

export default function ArenaPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [duels, setDuels] = useState<DuelChallenge[]>([]);
  const [arenaBanner, setArenaBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'MY_DUELS' | 'ALL'>('OPEN');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeChatDuel, setActiveChatDuel] = useState<DuelChallenge | null>(null);
  const [roomCredsModalOpen, setRoomCredsModalOpen] = useState(false);

  // Challenge Form State (100% FREE!)
  const [mode, setMode] = useState<'1v1_CS' | '1v1_SNIPER' | '1v1_DEAGLE' | '2v2_CS' | '4v4_CS' | 'CUSTOM_BERMUDA'>('1v1_CS');
  const [customRules, setCustomRules] = useState('Unlimited Ammo / Character Skill Off / Headshots Only (Standard 1v1 CS Rules)');
  const [roomCardProvider, setRoomCardProvider] = useState<'CREATOR' | 'CHALLENGER' | 'ANY'>('CREATOR');
  const [creatorIgn, setCreatorIgn] = useState('');
  const [creatorUid, setCreatorUid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-Room Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputRoomPass, setInputRoomPass] = useState('');
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Real-time Supabase Broadcast listener for live duel challenges
  useRealtimeBroadcast('arena-duels', 'DUEL_UPDATE', () => {
    loadDuels();
  });

  const loadDuels = async () => {
    try {
      const res = await fetch('/api/arena', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const duelList: DuelChallenge[] = data.duels || [];
        setDuels(duelList);

        // If a chat drawer is currently open, update its active state
        if (activeChatDuel) {
          const fresh = duelList.find(d => d.id === activeChatDuel.id);
          if (fresh) setActiveChatDuel(fresh);
        }
      }
    } catch (err) {
      console.warn('Failed to load duels:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBanner = async () => {
    try {
      const res = await fetch('/api/banners', { cache: 'no-store' });
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
    if (user?.inGameName) setCreatorIgn(user.inGameName);
    if (user?.freeFireUid) setCreatorUid(user.freeFireUid);

    loadDuels();
    loadBanner();
    const interval = setInterval(loadDuels, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeChatDuel) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatDuel?.messages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Handle Free Challenge Creation
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
          creatorIgn: creatorIgn.trim() || currentUser.inGameName || currentUser.name,
          creatorUid: creatorUid.trim() || currentUser.freeFireUid || '',
          mode,
          customRules,
          roomCardProvider,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreateModalOpen(false);
        await loadDuels();
        if (data.duel) {
          setActiveChatDuel(data.duel);
        }
      } else {
        alert(data.message || 'Failed to post custom challenge.');
      }
    } catch (err) {
      console.error('Error creating free duel challenge:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Accept Challenge
  const handleAcceptDuel = async (duel: DuelChallenge) => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

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
        await loadDuels();
        if (data.duel) {
          setActiveChatDuel(data.duel);
        }
      } else {
        alert(data.message || 'Could not accept challenge.');
      }
    } catch (err) {
      console.error('Error accepting duel:', err);
    }
  };

  // 3. Send In-Room Chat Message
  const handleSendChatMessage = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetText || chatMessage.trim();
    if (!textToSend || !activeChatDuel || !currentUser) return;

    setIsSendingMsg(true);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_MESSAGE',
          duelId: activeChatDuel.id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderIgn: currentUser.inGameName || currentUser.name,
          message: textToSend,
          type: 'TEXT',
        }),
      });

      if (res.ok) {
        setChatMessage('');
        await loadDuels();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  // 4. Share Room ID & Password in Chat
  const handleSaveRoomCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatDuel || !inputRoomId.trim()) return;

    setIsSavingRoom(true);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_ROOM',
          duelId: activeChatDuel.id,
          roomId: inputRoomId.trim(),
          roomPass: inputRoomPass.trim(),
          senderName: currentUser?.name || 'Player',
        }),
      });

      if (res.ok) {
        setRoomCredsModalOpen(false);
        setInputRoomId('');
        setInputRoomPass('');
        await loadDuels();
      }
    } catch (err) {
      console.error('Error sharing room credentials:', err);
    } finally {
      setIsSavingRoom(false);
    }
  };

  // 5. Mark Match Finished
  const handleFinishMatch = async (duelId: string) => {
    if (!confirm('Mark this custom match as completed?')) return;
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FINISH', duelId }),
      });
      if (res.ok) await loadDuels();
    } catch (err) {
      console.error('Error finishing duel:', err);
    }
  };

  // 6. Cancel / Delete Challenge
  const handleCancelDuel = async (duelId: string) => {
    if (!confirm('Are you sure you want to cancel this challenge post?')) return;
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', duelId, userId: currentUser?.id }),
      });
      if (res.ok) {
        setActiveChatDuel(null);
        await loadDuels();
      }
    } catch (err) {
      console.error('Error cancelling duel:', err);
    }
  };

  const getModeLabel = (m: string) => {
    switch (m) {
      case '1v1_CS': return '1v1 Clash Squad';
      case '1v1_SNIPER': return '1v1 Sniper AWM';
      case '1v1_DEAGLE': return '1v1 Desert Eagle Only';
      case '2v2_CS': return '2v2 Duo Clash Squad';
      case '4v4_CS': return '4v4 Squad Clash Squad';
      case 'CUSTOM_BERMUDA': return 'Custom Full Map Bermuda';
      default: return m.replace(/_/g, ' ');
    }
  };

  const filteredDuels = duels.filter(d => {
    if (activeTab === 'OPEN') {
      if (d.status !== 'OPEN') return false;
    } else if (activeTab === 'MY_DUELS') {
      if (d.creatorId !== currentUser?.id && d.challengerId !== currentUser?.id) return false;
    }

    if (selectedFilter !== 'ALL') {
      if (d.mode !== selectedFilter) return false;
    }

    return d.status !== 'CANCELLED';
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── 1. Hero Banner ── */}
        <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-950/50 via-[#0E1322] to-slate-900/80 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-mono text-[10px] font-black tracking-wider uppercase shadow-md">
                  ✨ 100% FREE CUSTOM MATCHES
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                  ● LIVE OPPONENT FEED
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white font-heading tracking-tight">
                Free Fire Custom Room Arena & 1v1 Match Finder
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Post a <strong>100% Free Custom Match Challenge</strong>, find active opponents in seconds, chat directly in the room, and share Free Fire Custom Room ID & Password to play together!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Post Free Challenge</span>
              </button>

              <button
                onClick={loadDuels}
                className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
                title="Refresh Feed"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Top Tabs & Filter Bar ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('OPEN')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'OPEN'
                  ? 'bg-orange-500 text-slate-950 font-black shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Open Challenges ({duels.filter(d => d.status === 'OPEN').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MY_DUELS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'MY_DUELS'
                  ? 'bg-orange-500 text-slate-950 font-black shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              <span>My Matches & Chats</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-orange-500 text-slate-950 font-black shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>All ({duels.length})</span>
            </button>
          </div>

          {/* Mode Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'ALL', label: 'All Modes' },
              { id: '1v1_CS', label: '1v1 CS' },
              { id: '2v2_CS', label: '2v2 CS' },
              { id: '4v4_CS', label: '4v4 CS' },
              { id: '1v1_DEAGLE', label: 'Deagle Only' },
              { id: '1v1_SNIPER', label: 'Sniper AWM' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedFilter(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedFilter === m.id
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                    : 'bg-[#0C101A] text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

        </div>

        {/* ── 3. Challenges Feed Grid ── */}
        {loading ? (
          <div className="py-20 text-center text-orange-400 font-mono text-xs space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-400" />
            <div>CONNECTING TO ARENA FEED...</div>
          </div>
        ) : filteredDuels.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-16 text-center space-y-4">
            <Swords className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="font-heading font-black text-white text-lg">No Active Challenges Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Be the first to post a Free Custom Match challenge! Opponents will see your post and jump into the room chat.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs uppercase"
            >
              Post Free Challenge Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDuels.map((duel) => {
              const isCreator = currentUser?.id === duel.creatorId;
              const isChallenger = currentUser?.id === duel.challengerId;
              const isInvolved = isCreator || isChallenger;
              const hasRoomCreds = Boolean(duel.roomId);

              return (
                <div
                  key={duel.id}
                  className="rounded-3xl border border-slate-800/80 bg-[#0C101A] hover:border-orange-500/40 p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden transition-all duration-300"
                >
                  <div>
                    {/* Mode & Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-[10px] font-bold">
                          {getModeLabel(duel.mode)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          100% FREE
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        duel.status === 'OPEN'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse'
                          : duel.status === 'IN_PROGRESS'
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {duel.status === 'OPEN' ? 'WAITING OPPONENT' : duel.status === 'IN_PROGRESS' ? 'MATCH ACTIVE' : 'FINISHED'}
                      </span>
                    </div>

                    {/* Players Matchup */}
                    <div className="p-3.5 rounded-2xl bg-[#07090E] border border-slate-800/80 space-y-3">
                      {/* Creator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            👑
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                              <span>{duel.creatorName}</span>
                              {isCreator && <span className="text-[9px] text-orange-400 font-mono">(You)</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              IGN: <strong className="text-slate-200">{duel.creatorIgn}</strong>
                            </div>
                          </div>
                        </div>

                        {duel.creatorUid && (
                          <button
                            onClick={() => handleCopy(duel.creatorUid || '', `uid_c_${duel.id}`)}
                            className="text-[10px] font-mono text-cyan-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                            title="Copy UID"
                          >
                            <span>UID: {duel.creatorUid}</span>
                            {copiedId === `uid_c_${duel.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        )}
                      </div>

                      {/* VS Divider */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[10px] font-black text-orange-400 font-mono tracking-widest uppercase">VS</span>
                        <div className="flex-1 h-px bg-slate-800" />
                      </div>

                      {/* Challenger */}
                      <div className="flex items-center justify-between">
                        {duel.challengerName ? (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                ⚔️
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                  <span>{duel.challengerName}</span>
                                  {isChallenger && <span className="text-[9px] text-cyan-400 font-mono">(You)</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  IGN: <strong className="text-slate-200">{duel.challengerIgn}</strong>
                                </div>
                              </div>
                            </div>

                            {duel.challengerUid && (
                              <button
                                onClick={() => handleCopy(duel.challengerUid || '', `uid_ch_${duel.id}`)}
                                className="text-[10px] font-mono text-cyan-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1"
                                title="Copy UID"
                              >
                                <span>UID: {duel.challengerUid}</span>
                                {copiedId === `uid_ch_${duel.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="py-1 text-center w-full text-xs text-slate-500 font-mono">
                            ⏳ Waiting for opponent to accept...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Rules & Room Provider Note */}
                    <div className="mt-3 text-xs space-y-1.5">
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
                        <strong className="text-orange-300">Match Rules:</strong> {duel.customRules}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                        <span>Room Card: <strong className="text-slate-200">{duel.roomCardProvider === 'CREATOR' ? 'Creator Will Create Room 🔑' : duel.roomCardProvider === 'CHALLENGER' ? 'Opponent Needs Room Card' : 'Either Player'}</strong></span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-cyan-400" />
                          <span>{duel.messages?.length || 1} msgs</span>
                        </span>
                      </div>
                    </div>

                    {/* Room Configured Highlight (if shared) */}
                    {hasRoomCreds && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono text-white">Room: <strong>{duel.roomId}</strong></span>
                        </div>
                        <span className="font-mono text-emerald-300 text-[11px]">Pass: <strong>{duel.roomPass || 'None'}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    {duel.status === 'OPEN' && !isCreator && (
                      <button
                        onClick={() => handleAcceptDuel(duel)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Swords className="w-3.5 h-3.5 text-slate-950" />
                        <span>Accept Challenge</span>
                      </button>
                    )}

                    {/* Open Live Chat Button */}
                    <button
                      onClick={() => setActiveChatDuel(duel)}
                      className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isInvolved
                          ? 'flex-1 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/30'
                          : duel.status === 'OPEN' && isCreator
                          ? 'flex-1 bg-slate-800 text-white hover:bg-slate-700'
                          : 'px-4 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isInvolved ? 'Open Match Chat & Room' : 'View Chat'}</span>
                    </button>

                    {isCreator && duel.status === 'OPEN' && (
                      <button
                        onClick={() => handleCancelDuel(duel.id)}
                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400"
                        title="Cancel Post"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ── MODAL 1: POST FREE CUSTOM CHALLENGE (100% FREE) ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0C101A] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-800 shadow-2xl space-y-5 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
                  <Swords className="w-5 h-5 text-orange-400" />
                  <span>Post Free Custom Challenge</span>
                </h3>
                <p className="text-xs text-slate-400">100% Free • No fee or balance required</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDuel} className="space-y-4 text-xs">
              
              {/* Match Mode */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Select Custom Match Mode *</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-orange-500"
                >
                  <option value="1v1_CS">1v1 Clash Squad (Standard)</option>
                  <option value="1v1_DEAGLE">1v1 Desert Eagle (One Tap / Headshot Only)</option>
                  <option value="1v1_SNIPER">1v1 AWM / Sniper Duel</option>
                  <option value="2v2_CS">2v2 Duo Clash Squad</option>
                  <option value="4v4_CS">4v4 Squad Clash Squad</option>
                  <option value="CUSTOM_BERMUDA">Custom Full Map Bermuda Battle</option>
                </select>
              </div>

              {/* Room Card Provider */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Who Creates Free Fire Custom Room? *</label>
                <select
                  value={roomCardProvider}
                  onChange={(e) => setRoomCardProvider(e.target.value as any)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-orange-500"
                >
                  <option value="CREATOR">I have room card (I will create room & share ID/Pass in Chat)</option>
                  <option value="CHALLENGER">Opponent should have room card to create</option>
                  <option value="ANY">Anyone / We will discuss in chat</option>
                </select>
              </div>

              {/* Creator In-Game Name & UID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Your Free Fire IGN *</label>
                  <input
                    type="text"
                    required
                    value={creatorIgn}
                    onChange={(e) => setCreatorIgn(e.target.value)}
                    placeholder="e.g. OP_ASHIK"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Your FF Player UID</label>
                  <input
                    type="text"
                    value={creatorUid}
                    onChange={(e) => setCreatorUid(e.target.value)}
                    placeholder="e.g. 2938472910"
                    className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-cyan-300 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Custom Rules */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Custom Match Rules *</label>
                <textarea
                  rows={2}
                  required
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  placeholder="e.g. Unlimited Ammo, Character Skill Off, Headshots Only, Limited Gloo Wall..."
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500"
                />
                <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1">
                  {[
                    'Unlimited Ammo / Skill Off',
                    'Headshots Only / Deagle',
                    'Sniper AWM Only',
                    'Full Squad 4v4 War',
                  ].map((rule, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomRules(rule)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white whitespace-nowrap"
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free Notice Badge */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>This challenge is <strong>100% Free</strong>. Once an opponent accepts, your match chat will open instantly!</span>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Post Free Challenge</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: DEDICATED IN-ROOM LIVE MATCH CHAT DRAWER ── */}
      {activeChatDuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0C101A] rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full h-[90vh] flex flex-col overflow-hidden">
            
            {/* Chat Top Header */}
            <div className="p-4 sm:p-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono font-bold border border-orange-500/40">
                    {getModeLabel(activeChatDuel.mode)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                    FREE MATCH
                  </span>
                  {activeChatDuel.status === 'IN_PROGRESS' && (
                    <span className="text-[10px] text-cyan-400 font-mono font-bold animate-pulse">
                      ● LIVE CHAT
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-black text-sm sm:text-base text-white truncate">
                  {activeChatDuel.creatorName} <span className="text-orange-400 font-mono">VS</span> {activeChatDuel.challengerName || 'Waiting Opponent...'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {activeChatDuel.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleFinishMatch(activeChatDuel.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    Finish GG ✅
                  </button>
                )}

                <button
                  onClick={() => setActiveChatDuel(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar Inside Chat */}
            <div className="px-4 py-2.5 bg-[#07090E] border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRoomCredsModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Share Room ID & Pass</span>
                </button>

                {currentUser?.freeFireUid && (
                  <button
                    onClick={() => handleSendChatMessage(undefined, `🎮 My Free Fire Player UID is: ${currentUser.freeFireUid} (Copy and add me!)`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>Share My UID ({currentUser.freeFireUid})</span>
                  </button>
                )}
              </div>

              {activeChatDuel.creatorWhatsApp && (
                <a
                  href={`https://wa.me/${activeChatDuel.creatorWhatsApp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {/* Room Credentials Sticky Card (if configured) */}
            {activeChatDuel.roomId && (
              <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-slate-300">Room ID: <strong className="text-white font-mono">{activeChatDuel.roomId}</strong></span>
                    <span className="mx-2 text-slate-600">|</span>
                    <span className="text-slate-300">Password: <strong className="text-emerald-300 font-mono">{activeChatDuel.roomPass || 'None'}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(`${activeChatDuel.roomId} pass: ${activeChatDuel.roomPass || ''}`, 'room_creds')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1"
                >
                  {copiedId === 'room_creds' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'room_creds' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {(activeChatDuel.messages || []).map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                const isSystem = msg.isSystem || msg.senderId === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-300 space-y-1">
                      <div className="font-medium">{msg.message}</div>
                      {msg.data?.roomId && (
                        <div className="inline-flex items-center gap-2 font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 mt-1">
                          <span>Room ID: <strong>{msg.data.roomId}</strong></span>
                          <span>•</span>
                          <span>Pass: <strong>{msg.data.roomPass || 'None'}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5 px-1">
                      {msg.senderName} {msg.senderIgn && <span className="font-mono text-cyan-400">({msg.senderIgn})</span>}
                    </div>

                    <div
                      className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        isMe
                          ? 'bg-orange-500 text-slate-950 font-bold rounded-tr-xs shadow-md shadow-orange-500/20'
                          : 'bg-slate-800/90 text-white rounded-tl-xs border border-slate-700/60'
                      }`}
                    >
                      {msg.message}
                    </div>

                    <div className="text-[9px] text-slate-500 font-mono mt-0.5 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Chat Presets */}
            <div className="px-4 py-1.5 bg-[#07090E] border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-shrink-0">
              {[
                'I created the room, join now! 🔑',
                'What is the Room ID and Pass? 🤔',
                'Ready to play! Start the match 🚀',
                'Good luck, have fun! 🔥',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(undefined, preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-white whitespace-nowrap"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Chat Input Footer */}
            <form
              onSubmit={(e) => handleSendChatMessage(e)}
              className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 flex-shrink-0"
            >
              <input
                type="text"
                placeholder={currentUser ? "Type match message, room details or instructions..." : "Please login to chat"}
                disabled={!currentUser || isSendingMsg}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 bg-[#07090E] border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />

              <button
                type="submit"
                disabled={!currentUser || !chatMessage.trim() || isSendingMsg}
                className="p-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold transition-all disabled:opacity-50 cursor-pointer flex-shrink-0"
              >
                {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL 3: SHARE ROOM ID & PASSWORD MODAL ── */}
      {roomCredsModalOpen && activeChatDuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0C101A] rounded-3xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-heading font-black text-base text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-orange-400" />
                  <span>Share Custom Room Details</span>
                </h4>
                <p className="text-[11px] text-slate-400">Post Room ID & Password into the live match chat.</p>
              </div>
              <button
                onClick={() => setRoomCredsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoomCredentials} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Free Fire Room ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7482910"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Room Password (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1234"
                  value={inputRoomPass}
                  onChange={(e) => setInputRoomPass(e.target.value)}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomCredsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRoom || !inputRoomId.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Post In Chat</span>
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
