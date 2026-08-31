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
  Layers,
  X
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

  const resolveIsMySquad = (squad: Squad, user: User | null): boolean => {
    if (!user || !user.id) return false;
    if (squad.leaderId === user.id || squad.createdBy === user.id) return true;
    if (Array.isArray(squad.members)) {
      return squad.members.some(m => 
        m.userId === user.id ||
        (user.accountNumber && m.accountNumber && m.accountNumber.toUpperCase() === user.accountNumber.toUpperCase()) ||
        (user.freeFireUid && m.freeFireUid && m.freeFireUid === user.freeFireUid)
      );
    }
    return false;
  };

  const loadData = async (user?: User | null) => {
    setLoading(true);
    try {
      const activeUser = user !== undefined ? user : currentUser;
      const [allRes, userRes, invRes] = await Promise.all([
        fetch('/api/squads'),
        activeUser?.id ? fetch(`/api/squads?userId=${activeUser.id}`) : Promise.resolve(null),
        activeUser?.id ? fetch(`/api/user/squad-invites?userId=${activeUser.id}`) : Promise.resolve(null),
      ]);

      let loadedAllSquads: Squad[] = [];
      if (allRes.ok) {
        const d = await allRes.json();
        loadedAllSquads = d.squads || [];
        setAllSquads(loadedAllSquads);
      }

      let loadedMySquads: Squad[] = [];
      if (userRes && userRes.ok) {
        const ud = await userRes.json();
        loadedMySquads = ud.squads || [];
      }

      // Fallback matching if server didn't find one
      if (loadedMySquads.length === 0 && activeUser && loadedAllSquads.length > 0) {
        for (const s of loadedAllSquads) {
          if (resolveIsMySquad(s, activeUser)) {
            loadedMySquads.push(s);
            break; // 1-squad limit
          }
        }
      }

      // Strict 1-Squad limit: A player can only have AT MOST 1 active squad
      setMySquads(loadedMySquads.slice(0, 1));

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
      .then(d => {
        if (d.user) {
          setCurrentUser(d.user);
          loadData(d.user);
        } else {
          const localUser = db.getCurrentUser();
          if (localUser) {
            setCurrentUser(localUser);
            loadData(localUser);
          } else {
            loadData(null);
          }
        }
      })
      .catch(() => {
        const localUser = db.getCurrentUser();
        if (localUser) {
          setCurrentUser(localUser);
          loadData(localUser);
        } else {
          loadData(null);
        }
      });
  }, []);

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in to create a squad.');
      return;
    }

    if (!formName.trim() || !formTag.trim()) {
      setErrorMessage('Squad Name and Tag are required.');
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
          userId: currentUser.id,
          name: formName.trim(),
          tag: formTag.trim().toUpperCase(),
          game: formGame,
          logoUrl: formLogo,
          description: formDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Failed to create squad.');
        return;
      }

      setSuccessMessage('Squad successfully created!');
      setTimeout(() => {
        setCreateModalOpen(false);
        setFormName('');
        setFormTag('');
        setFormDescription('');
        setSuccessMessage('');
        loadData(currentUser);
      }, 1000);
    } catch {
      setErrorMessage('Network error while creating squad.');
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

      const d = await res.json();
      if (res.ok) {
        alert(d.message || (action === 'ACCEPT' ? 'Squad invitation accepted!' : 'Invitation declined.'));
        loadData(currentUser);
      } else {
        alert(d.message || 'Failed to respond to invite.');
      }
    } catch {
      alert('Network error while responding to invite.');
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-20 lg:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* ── Top Hero Banner (Modern Vibrant Esports Card) ── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-200/80 p-6 sm:p-10 shadow-xl text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-orange/20 via-brand-red/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-orange-300 text-xs font-black uppercase tracking-wider backdrop-blur-md">
                <Shield className="w-4 h-4 text-brand-orange" />
                <span>ESPORTS ZONE BD IN-APP SQUAD & CLAN SYSTEM</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight text-white leading-tight">
                Build Your Dream <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange">Esports Squad</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                তৈরি করুন আপনার নিজস্ব পার্মানেন্ট স্কোয়াড! প্লেয়ারদের নির্দিষ্ট রোল (Rusher, Sniper, Support, IGL) দিয়ে সাজান, ইনভাইট লিঙ্ক শেয়ার করুন এবং ১-ক্লিকে যেকোনো টুর্নামেন্টে পুরো স্কোয়াড রেজিস্টার করুন।
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {mySquads.length >= 1 ? (
                <div className="px-5 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-orange-300 font-heading font-black text-xs uppercase flex items-center gap-2 backdrop-blur-md shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-brand-orange" />
                  <span>1 / 1 Active Squad (Limit Reached)</span>
                </div>
              ) : (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all"
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
          <div className="bg-orange-50/80 border-2 border-orange-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm animate-slideDown">
            <div className="flex items-center gap-2 text-orange-800 font-black font-heading text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-brand-orange animate-pulse" />
              <span>You Have {pendingInvites.length} Pending Squad Invitation(s)!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingInvites.map(({ squad, member }) => (
                <div key={squad.id} className="bg-white border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <img src={squad.logoUrl} alt={squad.name} className="w-12 h-12 rounded-xl object-cover border border-orange-200" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 font-mono text-[10px] font-black">[{squad.tag}]</span>
                        <h4 className="font-black text-slate-900 text-sm">{squad.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Invited as: <strong className="text-emerald-600">{member.inGameRole || 'PLAYER'}</strong> • Game: {squad.game}
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
                      className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer active:scale-95 transition-all"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('MY_SQUADS')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'MY_SQUADS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>MY SQUAD {mySquads.length > 0 ? '(1)' : '(0)'}</span>
            </button>

            <button
              onClick={() => setActiveTab('EXPLORE')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'EXPLORE'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>EXPLORE ALL SQUADS ({allSquads.length})</span>
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
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-orange shadow-2xs"
                />
              </div>

              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-orange shadow-2xs cursor-pointer"
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
                <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto" />
                <div className="text-xs text-slate-500 font-bold">Loading your esports squad...</div>
              </div>
            ) : mySquads.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200 space-y-4 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-200 text-brand-orange flex items-center justify-center mx-auto shadow-xs">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black font-heading text-slate-900">You Are Not in Any Squad Yet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    একটি নিজস্ব স্কোয়াড তৈরি করে লিডার হোন এবং বন্ধুদের ইনভাইট করুন, অথবা শেয়ারেবল ইনভাইট লিঙ্কের মাধ্যমে অন্য কোনো স্কোয়াডে জয়েন করুন!
                  </p>
                </div>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs uppercase shadow-md shadow-orange-500/20 cursor-pointer inline-flex items-center gap-2 hover:brightness-110 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your Squad Now</span>
                </button>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {mySquads.map((squad) => {
                  const myMembership = squad.members?.find(m => 
                    m.userId === currentUser?.id || 
                    (currentUser?.accountNumber && m.accountNumber === currentUser.accountNumber) ||
                    (currentUser?.freeFireUid && m.freeFireUid === currentUser.freeFireUid)
                  );
                  const isLeader = Boolean(
                    myMembership?.isLeader || 
                    squad.leaderId === currentUser?.id || 
                    squad.createdBy === currentUser?.id
                  );
                  const activeMembers = (squad.members || []).filter(m => m.status === 'ACTIVE' || !m.status);

                  return (
                    <div
                      key={squad.id}
                      className="bg-white border border-slate-200 hover:border-orange-500/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      {/* Top Header Card (Clickable to view squad details) */}
                      <Link 
                        href={`/squads/${squad.id}`}
                        className="relative h-32 w-full overflow-hidden bg-slate-900 block cursor-pointer"
                        title="Touch to view full squad details and roster"
                      >
                        {squad.bannerUrl && (
                          <img
                            src={squad.bannerUrl}
                            alt={squad.name}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-orange-300 text-[10px] font-black uppercase">
                            🎮 {squad.game}
                          </span>
                          {isLeader && (
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white text-[10px] font-black uppercase shadow-xs">
                              👑 LEADER
                            </span>
                          )}
                        </div>

                        {/* Logo & Name Overlap */}
                        <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3.5 z-10">
                          <img
                            src={squad.logoUrl}
                            alt={squad.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md bg-slate-900 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm text-white font-mono text-[10px] font-black">
                                [{squad.tag}]
                              </span>
                              <h3 className="text-lg font-black font-heading text-white truncate drop-shadow-md">
                                {squad.name}
                              </h3>
                            </div>
                            <p className="text-[11px] text-slate-200 truncate mt-0.5 font-medium">
                              Leader: <strong className="text-white">{squad.leaderName}</strong> • {activeMembers.length} Members
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Content Body */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        {/* Roster Overview */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Active Roster:</span>
                            <span className="text-orange-600 font-bold">{activeMembers.length} / 6 Active</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeMembers.map((m) => (
                              <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={m.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userName}`} alt={m.userName} className="w-7 h-7 rounded-lg object-cover bg-white border border-slate-200 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                                      <span>{m.userName}</span>
                                      {m.isLeader && <span title="Leader">👑</span>}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono truncate">{m.accountNumber || m.freeFireUid}</div>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 font-bold text-[9px] uppercase shrink-0">
                                  {m.inGameRole || 'PLAYER'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stats Bar & Manage Button */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                            <div>Matches: <strong className="text-slate-900 font-bold">{squad.matchesPlayed}</strong></div>
                            <div>Wins: <strong className="text-emerald-600 font-bold">{squad.matchesWon}</strong></div>
                            <div>Kills: <strong className="text-orange-600 font-bold">{squad.totalKills}</strong></div>
                          </div>

                          <Link
                            href={`/squads/${squad.id}`}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 shrink-0 cursor-pointer"
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
              <div className="p-16 text-center text-slate-500 text-xs bg-white rounded-3xl border border-slate-200 shadow-sm">
                No squads found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExploreSquads.map((squad) => {
                  const activeMembers = (squad.members || []).filter(m => m.status === 'ACTIVE' || !m.status);
                  const isMySquad = mySquads.some(ms => ms.id === squad.id) || resolveIsMySquad(squad, currentUser);

                  return (
                    <div
                      key={squad.id}
                      className="bg-white border border-slate-200 hover:border-orange-500/50 rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all shadow-sm hover:shadow-lg group"
                    >
                      {/* Top Clickable Squad Profile Area */}
                      <Link 
                        href={`/squads/${squad.id}`}
                        className="space-y-3 cursor-pointer block group-hover:opacity-95"
                        title="Touch to view full squad details and roster"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={squad.logoUrl} 
                              alt={squad.name} 
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 bg-slate-50 shrink-0 group-hover:scale-105 transition-transform" 
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 font-mono text-[10px] font-black shrink-0">
                                  [{squad.tag}]
                                </span>
                                <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-brand-orange transition-colors">
                                  {squad.name}
                                </h4>
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium truncate block mt-0.5">
                                Leader: <strong className="text-slate-800">{squad.leaderName}</strong>
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase border border-slate-200 shrink-0">
                            🎮 {squad.game}
                          </span>
                        </div>

                        {squad.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {squad.description}
                          </p>
                        )}

                        {/* Roster Quick Preview Avatars */}
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                          <div className="flex items-center -space-x-2 overflow-hidden">
                            {activeMembers.slice(0, 4).map((m, idx) => (
                              <img
                                key={m.id || idx}
                                src={m.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userName}`}
                                alt={m.userName}
                                title={`${m.userName} (${m.inGameRole || 'PLAYER'})`}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover bg-white"
                              />
                            ))}
                            {activeMembers.length > 4 && (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[9px] font-black text-orange-700 ring-2 ring-white">
                                +{activeMembers.length - 4}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] font-bold text-orange-600 flex items-center gap-1 font-mono">
                            <span>{activeMembers.length}/6 Active</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>

                      {/* Stats & Actions */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                          <span>Matches: <strong className="text-slate-900 font-bold">{squad.matchesPlayed}</strong></span>
                          <span>Wins: <strong className="text-emerald-600 font-bold">{squad.matchesWon}</strong></span>
                          <span>Kills: <strong className="text-cyan-600 font-bold">{squad.totalKills}</strong></span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/squads/${squad.id}`}
                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors text-center"
                          >
                            <Shield className="w-3.5 h-3.5 text-brand-orange" />
                            <span>View Full Info</span>
                          </Link>

                          {isMySquad ? (
                            <Link
                              href={`/squads/${squad.id}`}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white text-xs font-heading font-black uppercase flex items-center justify-center gap-1 shadow-md shadow-orange-500/15"
                            >
                              <span>Manage</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          ) : mySquads.length >= 1 ? (
                            <button
                              disabled
                              title="You already belong to an active squad (1-squad limit)."
                              className="py-2.5 px-2 rounded-xl bg-slate-100 text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-200 cursor-not-allowed opacity-75"
                            >
                              <span>1/1 Limit</span>
                            </button>
                          ) : (
                            <Link
                              href={`/squad/join/${squad.inviteToken}`}
                              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white text-xs font-heading font-black uppercase flex items-center justify-center gap-1 shadow-md shadow-orange-500/15"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Join Squad</span>
                            </Link>
                          )}
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-orange-100 text-brand-orange">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="font-heading font-black text-xl text-slate-900">Create Esports Squad</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateSquad} className="space-y-4 text-xs font-medium">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BlackRock Hunters"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Tag *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. EZBD"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-orange-700 font-mono font-black uppercase focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Primary Game *</label>
                <select
                  value={formGame}
                  onChange={(e) => setFormGame(e.target.value as GameType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange cursor-pointer"
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
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Logo Avatar *</label>
                <div className="flex items-center gap-3">
                  <img src={formLogo} alt="Selected Logo" className="w-12 h-12 rounded-2xl object-cover border-2 border-orange-500 bg-slate-100 shrink-0" />
                  <input
                    type="url"
                    required
                    placeholder="Paste custom logo URL..."
                    value={formLogo}
                    onChange={(e) => setFormLogo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1.5">Or pick a 1-Click Esports Logo:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {PRESET_LOGOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormLogo(p.url)}
                        className={`p-1 rounded-xl border transition-all shrink-0 cursor-pointer ${
                          formLogo === p.url ? 'border-orange-500 ring-2 ring-orange-400/30' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img src={p.url} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Bio / Description</label>
                <textarea
                  rows={2}
                  placeholder="Tell players about your squad requirements, tournament goals, scrims timings..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-heading font-black text-xs uppercase rounded-xl shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all"
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
