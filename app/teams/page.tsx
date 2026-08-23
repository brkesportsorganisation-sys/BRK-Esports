'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User, Squad, GameType } from '@/lib/types';
import { 
  Users, 
  ShieldCheck, 
  Trophy, 
  Plus, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  Gamepad2, 
  Flame, 
  Sparkles, 
  Crown, 
  UserPlus, 
  ArrowRight,
  Loader2,
  Swords,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  Zap,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';
import Link from 'next/link';

export default function SquadTeamsHubPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mySquads, setMySquads] = useState<Squad[]>([]);
  const [allSquads, setAllSquads] = useState<Squad[]>([]);
  const [pendingInvites, setPendingInvites] = useState<{ squad: Squad; member: any }[]>([]);
  const [activeTab, setActiveTab] = useState<'MY_SQUADS' | 'EXPLORE'>('MY_SQUADS');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('ALL');

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formGame, setFormGame] = useState<GameType>('FREE_FIRE');
  const [formLogo, setFormLogo] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200');
  const [formDescription, setFormDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const PRESET_LOGOS = [
    { name: '🔥 Cyber Phoenix', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200' },
    { name: '⚡ Neon Wolf', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=200' },
    { name: '👑 Golden Crown', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200' },
    { name: '⚔️ Crimson Skull', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200' },
    { name: '🛡️ Apex Shield', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200' },
  ];

  const loadData = async (user?: User | null) => {
    setLoading(true);
    try {
      const activeUser = user || currentUser;
      const [allRes, userRes, invRes] = await Promise.all([
        fetch('/api/squads'),
        activeUser?.id ? fetch(`/api/squads?userId=${activeUser.id}`) : Promise.resolve(null),
        activeUser?.id ? fetch(`/api/user/squad-invites?userId=${activeUser.id}`) : Promise.resolve(null),
      ]);

      if (allRes.ok) {
        const d = await allRes.json();
        setAllSquads(d.squads || []);
      }

      if (userRes && userRes.ok) {
        const ud = await userRes.json();
        setMySquads(ud.squads || []);
      }

      if (invRes && invRes.ok) {
        const idData = await invRes.json();
        setPendingInvites(idData.invites || []);
      }
    } catch (err) {
      console.warn('Failed to load squads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
          loadData(data.user);
        } else {
          const localUser = db.getCurrentUser();
          setCurrentUser(localUser);
          loadData(localUser);
        }
      })
      .catch(() => {
        const localUser = db.getCurrentUser();
        setCurrentUser(localUser);
        loadData(localUser);
      });
  }, []);

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage('Please log in to create a squad.');
      return;
    }
    if (mySquads.length >= 1) {
      setErrorMessage('⚠️ আপনি ইতিমধ্যে একটি স্কোয়াডের সদস্য। একসাথে সর্বোচ্চ ১ টি স্কোয়াডেই থাকা যাবে।');
      return;
    }

    setIsCreating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          tag: formTag.trim().toUpperCase(),
          game: formGame,
          logoUrl: formLogo,
          description: formDescription.trim(),
          leaderId: currentUser.id,
          leaderName: currentUser.name,
          leaderAccountNumber: currentUser.accountNumber || `BRE-${currentUser.id.substring(0, 6).toUpperCase()}`,
          leaderUid: currentUser.freeFireUid || '',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Squad [${data.squad.tag}] ${data.squad.name} created successfully!`);
        setFormName('');
        setFormTag('');
        setFormDescription('');
        setTimeout(() => {
          setCreateModalOpen(false);
          setSuccessMessage('');
          loadData();
        }, 1200);
      } else {
        setErrorMessage(data.message || 'Failed to create squad.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while creating squad.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRespondInvite = async (squadId: string, action: 'ACCEPT' | 'DECLINE') => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/user/squad-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          squadId,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadData();
      } else {
        alert(data.message || 'Failed to respond to invitation.');
      }
    } catch {
      alert('Error updating invitation.');
    }
  };

  const filteredExploreSquads = allSquads.filter((s) => {
    const matchesGame = gameFilter === 'ALL' || s.game === gameFilter;
    const matchesSearch = searchQuery.trim() === '' || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGame && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── Top Hero Banner ── */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-wider">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>BRK ESPORTS IN-APP SQUAD & CLAN SYSTEM</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight text-white leading-tight">
                Build Your Dream <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">Esports Squad</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                তৈরি করুন আপনার নিজস্ব পার্মানেন্ট স্কোয়াড! প্লেয়ারদের নির্দিষ্ট রোল (Rusher, Sniper, Support, IGL) দিয়ে সাজান, ইনভাইট লিঙ্ক শেয়ার করুন এবং ১-ক্লিকে যেকোনো টুর্নামেন্টে পুরো স্কোয়াড রেজিস্টার করুন।
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {mySquads.length >= 1 ? (
                <div className="px-5 py-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-heading font-black text-xs uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>1 / 1 Active Squad (Limit Reached)</span>
                </div>
              ) : (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Squad</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Pending Squad Invites Alert Box ── */}
        {pendingInvites.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-4 animate-slideDown">
            <div className="flex items-center gap-2 text-amber-400 font-black font-heading text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>You Have {pendingInvites.length} Pending Squad Invitation(s)!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingInvites.map(({ squad, member }) => (
                <div key={squad.id} className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={squad.logoUrl} alt={squad.name} className="w-12 h-12 rounded-xl object-cover border border-amber-500/40" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[10px] font-black">[{squad.tag}]</span>
                        <h4 className="font-black text-white text-sm">{squad.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Invited as: <strong className="text-emerald-400">{member.inGameRole || 'PLAYER'}</strong> • Game: {squad.game}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRespondInvite(squad.id, 'ACCEPT')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleRespondInvite(squad.id, 'DECLINE')}
                      className="px-3 py-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Tab Navigation ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('MY_SQUADS')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'MY_SQUADS'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>MY ACTIVE SQUADS ({mySquads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('EXPLORE')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'EXPLORE'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>EXPLORE ALL CLANS & SQUADS ({allSquads.length})</span>
            </button>
          </div>

          {activeTab === 'EXPLORE' && (
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Games</option>
                <option value="FREE_FIRE">Free Fire</option>
                <option value="PUBG_MOBILE">PUBG Mobile</option>
                <option value="VALORANT">Valorant</option>
                <option value="MLBB">MLBB</option>
                <option value="EFOOTBALL">eFootball</option>
              </select>
            </div>
          )}
        </div>

        {/* ════════════ TAB 1: MY ACTIVE SQUADS ════════════ */}
        {activeTab === 'MY_SQUADS' && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
                <div className="text-xs text-slate-400 font-bold">Loading your esports squads...</div>
              </div>
            ) : mySquads.length === 0 ? (
              <div className="bg-slate-900/60 rounded-3xl p-12 text-center border border-slate-800 space-y-4 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black font-heading text-white">You Are Not in Any Squad Yet</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    একটি নিজস্ব স্কোয়াড তৈরি করে লিডার হোন এবং বন্ধুদের ইনভাইট করুন, অথবা শেয়ারেবল ইনভাইট লিঙ্কের মাধ্যমে অন্য কোনো স্কোয়াডে জয়েন করুন!
                  </p>
                </div>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-heading font-black text-xs uppercase shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your Squad Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mySquads.map((squad) => {
                  const myMembership = squad.members?.find(m => m.userId === currentUser?.id);
                  const isLeader = myMembership?.isLeader || squad.leaderId === currentUser?.id;
                  const activeMembers = (squad.members || []).filter(m => m.status === 'ACTIVE');

                  return (
                    <div
                      key={squad.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/60 rounded-3xl overflow-hidden shadow-xl transition-all flex flex-col justify-between group"
                    >
                      {/* Top Header Card */}
                      <div className="relative h-32 w-full overflow-hidden bg-slate-950">
                        {squad.bannerUrl && (
                          <img
                            src={squad.bannerUrl}
                            alt={squad.name}
                            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-amber-400 text-[10px] font-black uppercase">
                            🎮 {squad.game}
                          </span>
                          {isLeader && (
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase shadow-xs">
                              👑 LEADER
                            </span>
                          )}
                        </div>

                        {/* Logo & Name Overlap */}
                        <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3.5 z-10">
                          <img
                            src={squad.logoUrl}
                            alt={squad.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-md bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-black">
                                [{squad.tag}]
                              </span>
                              <h3 className="text-lg font-black font-heading text-white truncate drop-shadow-md">
                                {squad.name}
                              </h3>
                            </div>
                            <p className="text-[11px] text-slate-300 truncate mt-0.5">
                              Leader: <strong className="text-white">{squad.leaderName}</strong> • {activeMembers.length} Members
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        {/* Roster Overview */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Active Roster:</span>
                            <span className="text-amber-400">{activeMembers.length} / 6 Active</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeMembers.map((m) => (
                              <div key={m.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={m.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userName}`} alt={m.userName} className="w-7 h-7 rounded-lg object-cover bg-slate-900 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                                      <span>{m.userName}</span>
                                      {m.isLeader && <span title="Leader">👑</span>}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-mono truncate">{m.accountNumber || m.freeFireUid}</div>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase shrink-0">
                                  {m.inGameRole || 'PLAYER'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stats Bar & Manage Button */}
                        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                            <div>Matches: <strong className="text-white">{squad.matchesPlayed}</strong></div>
                            <div>Wins: <strong className="text-emerald-400">{squad.matchesWon}</strong></div>
                            <div>Kills: <strong className="text-amber-400">{squad.totalKills}</strong></div>
                          </div>

                          <Link
                            href={`/squads/${squad.id}`}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 shrink-0"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Manage Roster & Squad</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════ TAB 2: EXPLORE ALL SQUADS ════════════ */}
        {activeTab === 'EXPLORE' && (
          <div className="space-y-6">
            {filteredExploreSquads.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-3xl border border-slate-800">
                No squads found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExploreSquads.map((squad) => {
                  const activeMembers = (squad.members || []).filter(m => m.status === 'ACTIVE');
                  const isMySquad = mySquads.some(ms => ms.id === squad.id);

                  return (
                    <div
                      key={squad.id}
                      className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={squad.logoUrl} alt={squad.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-700 bg-slate-950" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[10px] font-black">[{squad.tag}]</span>
                                <h4 className="font-black text-white text-sm">{squad.name}</h4>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">Leader: {squad.leaderName}</span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                            {squad.game}
                          </span>
                        </div>

                        {squad.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{squad.description}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>Roster: <strong className="text-white">{activeMembers.length} Members</strong></span>
                          <span>Wins: <strong className="text-emerald-400">{squad.matchesWon}</strong></span>
                        </div>

                        {isMySquad ? (
                          <Link
                            href={`/squads/${squad.id}`}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700"
                          >
                            <span>View Your Squad</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/squad/join/${squad.inviteToken}`}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 text-xs font-heading font-black uppercase flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/10"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Request to Join</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ════════════ CREATE SQUAD MODAL ════════════ */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="font-heading font-black text-xl text-white">Create Esports Squad</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateSquad} className="space-y-4 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BlackRock Hunters"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Tag *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. BRK"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-black uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Primary Game *</label>
                <select
                  value={formGame}
                  onChange={(e) => setFormGame(e.target.value as GameType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="FREE_FIRE">🔥 Free Fire</option>
                  <option value="PUBG_MOBILE">🪖 PUBG Mobile</option>
                  <option value="VALORANT">🎯 Valorant</option>
                  <option value="MLBB">⚔️ Mobile Legends (MLBB)</option>
                  <option value="EFOOTBALL">⚽ eFootball</option>
                </select>
              </div>

              {/* Logo Selection & Preset Selector */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Logo Avatar *</label>
                <div className="flex items-center gap-3">
                  <img src={formLogo} alt="Selected Logo" className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500 bg-slate-950 shrink-0" />
                  <input
                    type="url"
                    required
                    placeholder="Paste custom logo URL..."
                    value={formLogo}
                    onChange={(e) => setFormLogo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">Or pick a 1-Click Esports Logo:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_LOGOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormLogo(p.url)}
                        className={`p-1 rounded-xl border transition-all shrink-0 ${
                          formLogo === p.url ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Bio / Description</label>
                <textarea
                  rows={2}
                  placeholder="Tell players about your squad requirements, tournament goals, scrims timings..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create Squad</span>
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
