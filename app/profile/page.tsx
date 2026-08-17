'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  User as UserIcon, 
  Wallet, 
  Trophy, 
  Flame, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Edit3, 
  Copy, 
  Check, 
  CheckCircle2, 
  PlusCircle, 
  ArrowUpRight,
  Gift,
  Lock,
  Unlock,
  Clock,
  Link as LinkIcon,
  Share2,
  MessageCircle,
  Facebook,
  Loader2,
  Gamepad2,
  Upload,
  Sparkles,
  AlertCircle,
  Coins
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User, Tournament, Team, Payment } from '@/lib/types';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80', // Cyber Samurai
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80', // Pro Gamer
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80', // Squad Leader
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80', // Gamer Girl
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=80', // Sniper Elite
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200&auto=format&fit=crop&q=80', // Neon Cyber
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&auto=format&fit=crop&q=80', // Shadow Knight
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', // Valkyrie
];

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfaf6]" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'teams' ? 'TEAMS' : 'OVERVIEW';

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TOURNAMENTS' | 'TEAMS' | 'TRANSACTIONS'>(initialTab as any);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [passTimeLeft, setPassTimeLeft] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  
  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ign, setIgn] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isFetchingIgn, setIsFetchingIgn] = useState(false);
  const [ignFetchMessage, setIgnFetchMessage] = useState('');
  
  // Create Team Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const refreshProfileFromDb = async (userId: string) => {
    try {
      const [uRes, tRes, pRes, tourRes] = await Promise.all([
        fetch(`/api/auth/me?id=${userId}`, { cache: 'no-store' }),
        fetch(`/api/teams?userId=${userId}`, { cache: 'no-store' }),
        fetch(`/api/wallet/history?userId=${userId}`, { cache: 'no-store' }),
        fetch(`/api/tournaments`, { cache: 'no-store' })
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.user) {
          setUser(uData.user);
          setFullName(uData.user.name || '');
          setFfUid(uData.user.freeFireUid || '');
          setIgn(uData.user.inGameName || '');
          setAvatar(uData.user.avatar || '');
          db.setCurrentUser(uData.user);
        }
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.teams) setTeams(tData.teams);
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.payments) setPayments(pData.payments);
      }

      if (tourRes.ok) {
        const tourData = await tourRes.json();
        if (tourData.tournaments) setTournaments(tourData.tournaments);
      }
    } catch (err) {
      console.warn('Live profile fetch warning:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    const curUser = db.getCurrentUser();
    if (curUser) {
      setUser(curUser);
      setFullName(curUser.name || '');
      setFfUid(curUser.freeFireUid || '');
      setIgn(curUser.inGameName || '');
      setAvatar(curUser.avatar || '');
      refreshProfileFromDb(curUser.id);
    } else {
      setIsLoadingProfile(false);
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();
      
      if (diff <= 0) return '0d 0h 0m';
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      return `${d}d ${h}h ${m}m`;
    };
    
    setPassTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setPassTimeLeft(calculateTimeLeft()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleFetchIgnFromUid = async (uidToFetch: string) => {
    const clean = uidToFetch.trim();
    if (!clean || clean.length < 6) return;
    setIsFetchingIgn(true);
    setIgnFetchMessage('');
    try {
      const res = await fetch(`/api/get-player-name/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data.success && data.nickname) {
        setIgn(data.nickname);
        setIgnFetchMessage(`✅ Found IGN: ${data.nickname}`);
      } else if (res.ok && data.success) {
        setIgnFetchMessage('✅ UID Validated');
      } else {
        setIgnFetchMessage('Player ID not found. Enter IGN manually.');
      }
    } catch {
      setIgnFetchMessage('Could not connect to player name gateway.');
    } finally {
      setIsFetchingIgn(false);
    }
  };

  const handleCopyRef = () => {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    setSaveSuccessMsg('');

    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: fullName.trim() || user.name,
          freeFireUid: ffUid.trim(),
          inGameName: ign.trim() || user.name,
          avatar: avatar || user.avatar,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.user || {
          ...user,
          name: fullName.trim() || user.name,
          freeFireUid: ffUid.trim(),
          inGameName: ign.trim() || user.name,
          avatar: avatar || user.avatar,
        };
        setUser(updated);
        db.setCurrentUser(updated);
        setSaveSuccessMsg('Profile updated and saved to database successfully!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          setSaveSuccessMsg('');
        }, 1200);
        return;
      }
    } catch (err) {
      console.warn('Profile update API warning:', err);
    } finally {
      setIsSavingProfile(false);
    }

    // Local fallback update
    const updated = db.updateUser(user.id, {
      name: fullName.trim() || user.name,
      freeFireUid: ffUid.trim(),
      inGameName: ign.trim() || user.name,
      avatar: avatar || user.avatar,
    });
    if (updated) {
      setUser({ ...updated });
      setIsEditModalOpen(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamTag.trim() || !user) return;
    setIsCreatingTeam(true);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          tag: teamTag.trim().toUpperCase(),
          captainId: user.id,
          captainName: user.inGameName || user.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeams([data.team, ...teams]);
        setIsTeamModalOpen(false);
        setTeamName('');
        setTeamTag('');
        return;
      }
    } catch (err) {
      console.warn('Team create API error:', err);
    } finally {
      setIsCreatingTeam(false);
    }

    db.createTeam(teamName, teamTag);
    setTeams([...db.getTeams()]);
    setIsTeamModalOpen(false);
    setTeamName('');
    setTeamTag('');
  };

  const handleClaimMilestone = async (milestoneId: number, rewardType: 'COIN' | 'WALLET', rewardAmount: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          milestoneId,
          rewardType,
          rewardAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        db.setCurrentUser(data.user);
        return;
      }
    } catch (err) {
      console.warn('Milestone claim API error:', err);
    }

    const updated = db.claimReferralMilestone(user.id, milestoneId, rewardType, rewardAmount);
    if (updated) {
      setUser({ ...updated });
    }
  };

  const referralMilestones = [
    { id: 10, required: 10, rewardAmount: 50, rewardType: 'COIN' as const, label: '50 Coins' },
    { id: 50, required: 50, rewardAmount: 100, rewardType: 'COIN' as const, label: '100 Coins' },
    { id: 100, required: 100, rewardAmount: 200, rewardType: 'COIN' as const, label: '200 Coins' },
    { id: 300, required: 300, rewardAmount: 500, rewardType: 'WALLET' as const, label: '500 TK' },
  ];

  if (!user && !isLoadingProfile) {
    return (
      <div className="min-h-screen bg-[#fdfaf6] text-slate-900 flex flex-col font-body">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
            <UserIcon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Please Sign In to Access Profile</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">You need an active session to view your career stats and wallet.</p>
          <a href="/login" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm shadow-md hover:brightness-110 transition-all">
            Sign In Now
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        {/* User Hero Passport Card */}
        <div className="rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 bg-white shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-100 rounded-full blur-3xl pointer-events-none opacity-50"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            
            {/* User Avatar & Info */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              <div className="relative group cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
                  alt={user.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg group-hover:opacity-90 transition-opacity"
                />
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase shadow-sm">
                  {user.role}
                </span>
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="font-heading font-black text-3xl text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                  <span>{user.inGameName || user.name}</span>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Edit Profile"
                  >
                    <Edit3 className="w-4 h-4 text-orange-500" />
                  </button>
                </h1>

                <div className="text-xs text-slate-600 font-mono flex items-center gap-2 justify-center sm:justify-start">
                  <span>Full Name: <strong className="text-slate-800 font-semibold">{user.name}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>App ID: <strong className="text-orange-600 font-bold">{user.accountNumber || 'BRE-MEMBER'}</strong></span>
                </div>

                <div className="text-xs text-slate-600 font-mono flex items-center gap-2 justify-center sm:justify-start">
                  <span>FF UID: <strong className="text-cyan-600">{user.freeFireUid || 'Not Set'}</strong></span>
                  {user.freeFireUid && (
                    <span className="flex items-center text-green-600 text-[10px] font-bold gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span>Win Rate: <strong className="text-emerald-600 font-bold">{user.winRate || 0}%</strong></span>
                </div>

                <div className="text-xs text-slate-600 font-medium">{user.email}</div>
              </div>
            </div>

            {/* Wallet & Referral Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              
              {/* Dual Wallet Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center sm:text-right min-w-[170px] space-y-1">
                <div className="text-[10px] text-slate-600 font-bold uppercase">Winning Wallet (Cashout)</div>
                <div className="text-xl font-heading font-black text-amber-500">
                  ৳ {(user.winningBalance || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-orange-600 font-bold border-t border-slate-200 pt-1 flex items-center justify-between gap-2">
                  <span>Coins: {user.coinBalance || 0}</span>
                  <span>Promo: ৳{(user.promoBalance || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Referral Code Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center sm:text-left">
                <div className="text-[10px] text-slate-600 font-bold uppercase">Referral Code</div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono font-extrabold text-orange-500 text-sm">{user.referralCode || 'BRE99'}</span>
                  <button
                    onClick={handleCopyRef}
                    className="p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors text-xs"
                    title="Copy Referral Code"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
          {(['OVERVIEW', 'TOURNAMENTS', 'TEAMS', 'TRANSACTIONS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-heading font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview Stats */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
                <div className="text-xs text-slate-600 font-bold uppercase relative z-10">Total Kills</div>
                <div className="font-heading font-black text-3xl text-red-500 relative z-10">{user.totalKills || 0}</div>
                <div className="text-[11px] text-slate-600 font-medium relative z-10">Career Frags</div>
                <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><Flame className="w-24 h-24" /></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
                <div className="text-xs text-slate-600 font-bold uppercase relative z-10">Booyah Wins</div>
                <div className="font-heading font-black text-3xl text-amber-500 relative z-10">{user.totalWins || 0}</div>
                <div className="text-[11px] text-slate-600 font-medium relative z-10">Championship Titles</div>
                <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><Trophy className="w-24 h-24" /></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
                <div className="text-xs text-slate-600 font-bold uppercase relative z-10">Total Cash Won</div>
                <div className="font-heading font-black text-3xl text-orange-500 relative z-10">৳ {user.earnings || 0}</div>
                <div className="text-[11px] text-slate-600 font-medium relative z-10">Withdrawn Payouts</div>
                <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><Wallet className="w-24 h-24" /></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
                <div className="text-xs text-slate-600 font-bold uppercase relative z-10">Win Rate</div>
                <div className="font-heading font-black text-3xl text-cyan-600 relative z-10">{user.winRate || 0}%</div>
                <div className="text-[11px] text-slate-600 font-medium relative z-10">Competitive Efficiency</div>
                <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><ShieldCheck className="w-24 h-24" /></div>
              </div>

            </div>

            {/* Referral Booyah Pass */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-heading font-black text-2xl text-slate-900 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-red-500" /> Referral Pass
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 mb-1">Invite friends using your Referral Code to unlock rewards!</p>
                  <div className="text-xs text-red-600 font-bold flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg inline-flex">
                    <Clock className="w-3.5 h-3.5" /> Note: This Referral Pass resets monthly. Ends in: {passTimeLeft}
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl text-center">
                  <div className="text-[10px] text-orange-600 font-bold uppercase">Total Referrals</div>
                  <div className="font-heading font-black text-2xl text-orange-500">{user.totalReferrals || 0}</div>
                </div>
              </div>

              {/* Referral Link Share Box */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user.referralCode}` : ''}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 font-mono focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.referralCode}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />} 
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(`https://wa.me/?text=Join me on BRK Esports and compete in tournaments! ${window.location.origin}/register?ref=${user.referralCode}`, '_blank');
                      }
                    }}
                    className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/register?ref=' + user.referralCode)}`, '_blank');
                      }
                    }}
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Pass Progress Line */}
              <div className="relative pt-8 pb-4 overflow-x-auto">
                <div className="min-w-[600px] relative px-4">
                  <div className="absolute top-4 left-4 right-4 h-2 bg-slate-100 rounded-full z-0"></div>
                  
                  <div 
                    className="absolute top-4 left-4 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full z-10 transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${Math.min(100, ((user.totalReferrals || 0) / 300) * 100)}%` 
                    }}
                  ></div>

                  {/* Milestone Nodes */}
                  <div className="relative z-20 flex justify-between items-start -mt-3">
                    {referralMilestones.map((milestone) => {
                      const isUnlocked = (user.totalReferrals || 0) >= milestone.required;
                      const isClaimed = (user.claimedMilestones || []).includes(milestone.id);
                      
                      return (
                        <div key={milestone.id} className="flex flex-col items-center group w-24">
                          <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${
                            isClaimed 
                              ? 'bg-emerald-500 border-emerald-200 text-white shadow-lg shadow-emerald-500/30' 
                              : isUnlocked 
                                ? 'bg-gradient-to-br from-red-500 to-orange-500 border-orange-200 text-white shadow-lg shadow-orange-500/30 animate-pulse' 
                                : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {isClaimed ? <Check className="w-5 h-5" /> : isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </div>
                          
                          <div className="mt-3 text-center">
                            <div className="text-[10px] font-bold text-slate-600 uppercase">{milestone.required} Invites</div>
                            <div className={`text-xs font-black mt-0.5 ${isUnlocked ? 'text-slate-900' : 'text-slate-600'}`}>
                              {milestone.label}
                            </div>
                          </div>

                          <div className="mt-3 h-8">
                            {isUnlocked && !isClaimed ? (
                              <button
                                onClick={() => handleClaimMilestone(milestone.id, milestone.rewardType, milestone.rewardAmount)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm transition-colors"
                              >
                                Claim
                              </button>
                            ) : isClaimed ? (
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold uppercase rounded-lg">
                                Claimed
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Joined Tournaments */}
        {activeTab === 'TOURNAMENTS' && (
          <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-slate-900">Tournament Arena Matches</h3>
              <a href="/tournaments" className="text-xs font-bold text-orange-600 hover:underline">Browse All Tournaments →</a>
            </div>

            {tournaments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium">
                No tournament records found. Join open tournaments from the arena lobby.
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.slice(0, 6).map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-orange-200 hover:shadow-md">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{t.title}</div>
                      <div className="text-xs text-slate-600 mt-1 font-medium">
                        Mode: {t.mode} • Entry: ৳{t.entryFee} • Prize: ৳{t.prizePool}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold text-center ${
                        t.status === 'UPCOMING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        t.status === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse' :
                        t.status === 'FINISHED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status}
                      </span>
                      <a href={`/tournaments/${t.id}`} className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100">
                        View Room
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Squad & Team System */}
        {activeTab === 'TEAMS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-slate-900">My Gaming Clans</h3>
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-heading font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>CREATE CLAN</span>
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-600 text-sm font-medium">
                You have not created or joined any clans yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div key={team.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <img src={team.logo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'} alt={team.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-100 shadow-sm" />
                      <div>
                        <div className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                          <span>{team.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100 font-mono font-bold">[{team.tag}]</span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">Captain: {team.captainName}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                      <span className="text-slate-600 font-mono font-medium">Invite Code: <strong className="text-orange-600 font-bold">{team.inviteCode}</strong></span>
                      <span className="text-cyan-700 font-bold bg-cyan-50 px-2 py-1 rounded-lg">{team.membersCount || 1} Roster Members</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Transactions */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-4 pl-6">TrxID</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-600 text-sm font-medium">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-mono text-xs text-cyan-600 font-bold">{p.trxId}</td>
                        <td className="p-4 font-bold text-slate-900">{p.method}</td>
                        <td className="p-4 font-bold text-orange-500">৳ {p.amount}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            p.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-xs text-slate-600 font-medium">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-2xl text-slate-900">EDIT GAMING PROFILE</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
            
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              
              {/* Full Name */}
              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-400 font-semibold"
                  placeholder="Enter your name"
                  required
                />
              </div>

              {/* Free Fire UID & Auto-Fetch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-xs uppercase text-slate-700">Free Fire UID</label>
                    <button
                      type="button"
                      onClick={() => handleFetchIgnFromUid(ffUid)}
                      disabled={isFetchingIgn || ffUid.length < 6}
                      className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {isFetchingIgn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Auto-Fetch IGN
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ffUid}
                    onChange={(e) => setFfUid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-orange-400"
                    placeholder="e.g. 2172143722"
                  />
                  {ignFetchMessage && (
                    <div className="text-[10px] font-semibold text-emerald-600 mt-1">{ignFetchMessage}</div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-xs uppercase text-slate-700 block mb-1">In-Game Name (IGN)</label>
                  <input
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-orange-400"
                    placeholder="e.g. OCR-FALCON"
                    required
                  />
                </div>
              </div>

              {/* Avatar Selector Presets */}
              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-2">
                  Choose Gaming Avatar Preset
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {AVATAR_PRESETS.map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(presetUrl)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                        avatar === presetUrl 
                          ? 'border-orange-500 scale-105 shadow-md shadow-orange-500/20' 
                          : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={presetUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                      {avatar === presetUrl && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Avatar Upload or URL */}
              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1">Or Upload Custom Avatar Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAvatar(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSavingProfile ? 'Saving to Database...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-2xl text-slate-900">CREATE CLAN</h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateTeam} className="space-y-4 text-sm">
              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1">Clan Name *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="e.g. Blackrock Elite"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-400 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1">Clan Tag (3-5 Letters) *</label>
                <input
                  type="text"
                  value={teamTag}
                  onChange={(e) => setTeamTag(e.target.value)}
                  required
                  placeholder="e.g. BRE"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono uppercase focus:outline-none focus:border-orange-400 font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>{isCreatingTeam ? 'Creating...' : 'Create Clan'}</span>
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
