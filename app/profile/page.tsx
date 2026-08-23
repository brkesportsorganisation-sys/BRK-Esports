'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Coins,
  MessageSquare,
  Headphones,
  Send,
  RefreshCw,
  Crown,
  ArrowRight,
  Zap,
  Shield,
  ExternalLink,
  ShoppingBag,
  Diamond,
  Package,
  Search,
  X
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User, Tournament, Team, Squad, Payment, SupportTicket, SupportMessage } from '@/lib/types';

const parseShopOrderDetails = (notes?: string) => {
  if (!notes) return null;
  const isShop = notes.toLowerCase().includes('shop order') || notes.toLowerCase().includes('diamond order');
  if (!isShop) return null;

  const itemMatch = notes.match(/\[(Shop Order|Diamond Order)\]\s*([^|]+)/i);
  const itemName = itemMatch && itemMatch[2] ? itemMatch[2].trim() : 'Gaming Shop Item';

  const catMatch = notes.match(/Category:\s*([^|]+)/i);
  const category = catMatch && catMatch[1] ? catMatch[1].trim() : 'FREE_FIRE';

  const uidMatch = notes.match(/UID:\s*([^|]+)/i);
  const targetUid = uidMatch && uidMatch[1] ? uidMatch[1].trim() : null;

  const ignMatch = notes.match(/IGN:\s*([^|]+)/i);
  const targetIgn = ignMatch && ignMatch[1] ? ignMatch[1].trim() : null;

  const voucherMatch = notes.match(/Voucher:\s*([^|]+)/i) || notes.match(/Code:\s*([^|]+)/i);
  const voucherCode = voucherMatch && voucherMatch[1] ? voucherMatch[1].trim() : null;

  const deliveryMatch = notes.match(/Delivery:\s*([^|]+)/i);
  const deliveryType = deliveryMatch && deliveryMatch[1] ? deliveryMatch[1].trim() : 'In-Game Top-Up';

  return {
    itemName,
    category,
    targetUid,
    targetIgn,
    voucherCode,
    deliveryType,
  };
};

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

const ESPORTS_ROLES = [
  { role: 'RUSHER', label: 'Rusher', icon: '⚡' },
  { role: 'NADER', label: 'Nader', icon: '💥' },
  { role: 'SUPPORTER', label: 'Supporter', icon: '🛡️' },
  { role: 'SNIPER', label: 'Sniper', icon: '🎯' },
  { role: 'FLANKER', label: 'Flanker', icon: '🦅' },
  { role: 'IGL', label: 'IGL / Leader', icon: '👑' },
  { role: 'COACH', label: 'Coach', icon: '🧠' },
  { role: 'ANALYST', label: 'Analyst', icon: '📊' },
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
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'teams' ? 'TEAMS' : tabParam === 'support' ? 'SUPPORT' : 'OVERVIEW';

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TOURNAMENTS' | 'TEAMS' | 'TRANSACTIONS' | 'SUPPORT'>(initialTab as any);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [passTimeLeft, setPassTimeLeft] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [claimingMilestoneId, setClaimingMilestoneId] = useState<number | null>(null);
  const [globalCoverUrl, setGlobalCoverUrl] = useState<string>('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80');
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  
  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ign, setIgn] = useState('');
  const [inGameRole, setInGameRole] = useState('RUSHER');
  const [avatar, setAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isFetchingIgn, setIsFetchingIgn] = useState(false);
  const [ignFetchMessage, setIgnFetchMessage] = useState('');
  
  // Create Team Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const [squads, setSquads] = useState<Squad[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<'ALL' | 'SHOP_ORDERS' | 'WALLET'>('ALL');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Support Chat State
  const [supportTicket, setSupportTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);
  const supportMessagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSupportChat = async (userId: string) => {
    try {
      const res = await fetch(`/api/support?userId=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSupportTicket(data.ticket || null);
        setSupportMessages(data.messages || []);
      }
    } catch (err) {
      console.warn('Support chat fetch error:', err);
    } finally {
      setIsLoadingSupport(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'SUPPORT' || !user) return;
    setIsLoadingSupport(true);
    fetchSupportChat(user.id);

    const interval = setInterval(() => {
      fetchSupportChat(user.id);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, user?.id]);

  const handleSendSupportMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supportInput.trim() || !user || isSendingSupport) return;

    const content = supportInput.trim();
    setSupportInput('');
    setIsSendingSupport(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_USER_MESSAGE',
          userId: user.id,
          userName: user.inGameName || user.name,
          userEmail: user.email,
          userPhone: user.phone || user.accountNumber,
          content,
          senderRole: 'USER',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSupportTicket(data.ticket || null);
        setSupportMessages(data.messages || []);
        setTimeout(() => {
          supportMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.warn('Failed to send support message:', err);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const refreshProfileFromDb = async (userId: string) => {
    try {
      const [uRes, sqRes, tRes, pRes, tourRes, sRes] = await Promise.all([
        fetch(`/api/auth/me?id=${userId}`, { cache: 'no-store' }),
        fetch(`/api/squads?userId=${userId}`, { cache: 'no-store' }),
        fetch(`/api/teams?userId=${userId}`, { cache: 'no-store' }),
        fetch(`/api/wallet/history?userId=${userId}`, { cache: 'no-store' }),
        fetch(`/api/tournaments`, { cache: 'no-store' }),
        fetch(`/api/settings`, { cache: 'no-store' }).catch(() => null)
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.user) {
          setUser(uData.user);
          setFullName(uData.user.name || '');
          setFfUid(uData.user.freeFireUid || '');
          setIgn(uData.user.inGameName || '');
          setInGameRole(uData.user.inGameRole || 'RUSHER');
          setAvatar(uData.user.avatar || '');
          db.setCurrentUser(uData.user);
        }
      }

      if (sqRes.ok) {
        const sqData = await sqRes.json();
        if (sqData.squads) setSquads(sqData.squads);
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

      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        const s = sData.settings || {};
        const cover = s.PROFILE_COVER_URL || s.profile_cover_url;
        if (cover) setGlobalCoverUrl(cover);
      }
    } catch (err) {
      console.warn('Live profile fetch warning:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    // Fetch global cover photo + referral milestone settings
    fetch('/api/settings', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const s = data.settings || {};
        const cover = s.PROFILE_COVER_URL || s.profile_cover_url;
        if (cover) setGlobalCoverUrl(cover);
        setSiteSettings(s);
      })
      .catch(() => {});

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

  useEffect(() => {
    if (tabParam === 'referral' || (typeof window !== 'undefined' && window.location.hash === '#referral')) {
      setActiveTab('OVERVIEW');
      setTimeout(() => {
        const el = document.getElementById('referral-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }, [tabParam]);

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
          inGameRole: inGameRole,
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
          inGameRole: inGameRole,
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
      inGameRole: inGameRole,
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

    if (squads.length >= 1 || teams.length >= 1) {
      alert('⚠️ Squad Limit: আপনি ইতিমধ্যে একটি স্কোয়াডের সদস্য। একসাথে সর্বোচ্চ ১ টি স্কোয়াডেই থাকা যাবে। নতুন স্কোয়াড তৈরি করতে পূর্বের স্কোয়াডটি ডিলিট বা লিভ করুন।');
      setIsTeamModalOpen(false);
      return;
    }

    setIsCreatingTeam(true);

    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          tag: teamTag.trim().toUpperCase(),
          game: 'FREE_FIRE',
          leaderId: user.id,
          leaderName: user.inGameName || user.name,
          leaderAccountNumber: user.accountNumber,
          leaderUid: user.freeFireUid,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSquads([data.squad, ...squads]);
        setIsTeamModalOpen(false);
        setTeamName('');
        setTeamTag('');
        alert(`Squad "[${data.squad.tag}] ${data.squad.name}" created successfully!`);
        return;
      } else {
        alert(data.message || 'Failed to create squad.');
      }
    } catch (err) {
      console.warn('Squad create API error:', err);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleClaimMilestone = async (milestoneId: number, rewardType: 'COIN' | 'WALLET', rewardAmount: number) => {
    if (!user || claimingMilestoneId !== null) return;
    setClaimingMilestoneId(milestoneId);
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

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        db.setCurrentUser(data.user);
        alert(data.message || '🎉 Milestone reward claimed successfully!');
        return;
      } else if (!res.ok) {
        alert(data.message || 'Failed to claim milestone reward.');
      }
    } catch (err: any) {
      console.warn('Milestone claim API error:', err);
      alert(err.message || 'Network error claiming milestone.');
    } finally {
      setClaimingMilestoneId(null);
    }

    const updated = db.claimReferralMilestone(user.id, milestoneId, rewardType, rewardAmount);
    if (updated) {
      setUser({ ...updated });
    }
  };

  // Milestone values: loaded from admin siteSettings with hardcoded defaults as fallback
  const m1Required = parseInt(siteSettings.ref_stage1_required || '10');
  const m1Reward   = parseInt(siteSettings.ref_stage1_reward   || '50');
  const m2Required = parseInt(siteSettings.ref_stage2_required || '50');
  const m2Reward   = parseInt(siteSettings.ref_stage2_reward   || '100');
  const m3Required = parseInt(siteSettings.ref_stage3_required || '100');
  const m3Reward   = parseInt(siteSettings.ref_stage3_reward   || '200');
  const m4Required = parseInt(siteSettings.ref_stage4_required || '300');
  const m4Reward   = parseInt(siteSettings.ref_stage4_reward   || '500');

  const referralMilestones = [
    { id: m1Required, required: m1Required, rewardAmount: m1Reward,   rewardType: 'COIN'   as const, label: `${m1Reward} Coins` },
    { id: m2Required, required: m2Required, rewardAmount: m2Reward,   rewardType: 'COIN'   as const, label: `${m2Reward} Coins` },
    { id: m3Required, required: m3Required, rewardAmount: m3Reward,   rewardType: 'COIN'   as const, label: `${m3Reward} Coins` },
    { id: m4Required, required: m4Required, rewardAmount: m4Reward,   rewardType: 'WALLET' as const, label: `${m4Reward} TK` },
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
        
        {/* User Hero Passport Card with Global Admin Cover Photo */}
        <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 relative overflow-hidden">
          
          {/* 1. Global Admin Cover Banner */}
          <div className="relative w-full h-44 sm:h-56 md:h-64 bg-slate-900 overflow-hidden">
            <img
              src={globalCoverUrl}
              alt="Profile Cover"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60 pointer-events-none" />

            {/* Top Badges over Cover Banner */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/20 shadow-sm">
                <Flame className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
                <span>BRK ESPORTS PASSPORT</span>
              </span>
            </div>

            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>VERIFIED PLAYER</span>
              </span>
            </div>
          </div>

          {/* 2. User Info & Overlapping Avatar */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-14 sm:-mt-16">
              
              {/* User Avatar & Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-3 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
                
                {/* Avatar with click to edit */}
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setIsEditModalOpen(true)}>
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
                    alt={user.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover border-4 border-white shadow-2xl group-hover:opacity-90 transition-opacity bg-slate-900"
                  />
                  <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black uppercase shadow-md border border-white">
                    {user.role}
                  </span>
                  <div className="absolute inset-0 bg-black/40 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Edit3 className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1 sm:mb-1">
                  <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                    <span>{user.inGameName || user.name}</span>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </h1>

                  <div className="text-xs text-slate-600 font-mono flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <span>Full Name: <strong className="text-slate-900 font-semibold">{user.name}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>App ID: <strong className="text-orange-600 font-bold">{user.accountNumber || 'BRK-PLAYER'}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      Role: 
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-sans font-black text-[11px] uppercase tracking-wide flex items-center gap-1 shadow-2xs">
                        <span>{ESPORTS_ROLES.find(r => r.role === (user.inGameRole || 'RUSHER'))?.icon || '⚡'}</span>
                        <span>{ESPORTS_ROLES.find(r => r.role === (user.inGameRole || 'RUSHER'))?.label || user.inGameRole || 'Rusher'}</span>
                      </span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Win Rate: <strong className="text-emerald-600 font-bold">{user.winRate || 0}%</strong></span>
                  </div>
                </div>
              </div>

              {/* 4 Action / Stats Cards: Row 1 (Wallet + Coins), Row 2 (Support + Messages) */}
              <div className="flex flex-col gap-2.5 w-full sm:w-auto mt-4 md:mt-0">
                
                {/* Row 1: Wallet Balance & Coin Balance */}
                <div className="grid grid-cols-2 gap-2.5">
                  
                  {/* Card 1: Total Wallet Balance */}
                  <Link
                    href="/wallet"
                    className="bg-slate-50 hover:bg-slate-100 p-3 sm:p-3.5 rounded-2xl border border-slate-200 transition-all flex items-center gap-3 shadow-2xs group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-red to-brand-orange text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Wallet Balance</div>
                      <div className="text-sm sm:text-base font-heading font-black text-amber-600 leading-tight truncate">
                        ৳ {(user.walletBalance || user.winningBalance || 0).toLocaleString()}
                      </div>
                    </div>
                  </Link>

                  {/* Card 2: Coin Balance */}
                  <Link
                    href="/ads"
                    className="bg-slate-50 hover:bg-slate-100 p-3 sm:p-3.5 rounded-2xl border border-slate-200 transition-all flex items-center gap-3 shadow-2xs group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs flex-shrink-0">
                      <Coins className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Coin Balance</div>
                      <div className="text-sm sm:text-base font-heading font-black text-slate-900 leading-tight truncate">
                        {(user.coinBalance || 0).toLocaleString()} <span className="text-[11px] text-amber-600 font-bold">Coins</span>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Row 2: Contact Admin & Messages Inbox */}
                <div className="grid grid-cols-2 gap-2.5">
                  
                  {/* Card 3: Contact Admin (24/7 Helpline) */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUPPORT')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 sm:p-3.5 rounded-2xl border border-slate-200 text-left transition-all flex items-center gap-3 shadow-2xs group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100 group-hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors flex-shrink-0">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">24/7 Helpline</div>
                      <div className="font-heading font-black text-slate-900 text-xs sm:text-sm truncate">Contact Admin</div>
                    </div>
                  </button>

                  {/* Card 4: Messages Inbox (Direct Chat) */}
                  <Link
                    href="/messages"
                    className="bg-slate-50 hover:bg-slate-100 p-3 sm:p-3.5 rounded-2xl border border-slate-200 transition-all flex items-center gap-3 shadow-2xs group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 group-hover:bg-orange-200 text-brand-orange flex items-center justify-center transition-colors flex-shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">Direct Chat</div>
                      <div className="font-heading font-black text-slate-900 text-xs sm:text-sm truncate">Messages Inbox</div>
                    </div>
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs - Compact 5-Column Responsive Grid - Zero Scroll */}
        <div className="bg-slate-100/90 p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl border border-slate-200 w-full shadow-2xs">
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full">
            {[
              { id: 'OVERVIEW', label: 'Overview', shortLabel: 'Overview', icon: Trophy },
              { id: 'TOURNAMENTS', label: 'Tournaments', shortLabel: 'Matches', icon: Gamepad2 },
              { id: 'TEAMS', label: 'My Squad', shortLabel: 'Squad', icon: Users },
              { id: 'TRANSACTIONS', label: 'Shop & Orders', shortLabel: 'Orders', icon: ShoppingBag },
              { id: 'SUPPORT', label: 'Help Desk', shortLabel: 'Support', icon: Headphones },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`py-2 sm:py-2.5 px-0.5 sm:px-2 rounded-xl sm:rounded-2xl font-heading font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer text-center select-none w-full min-w-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-xs'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[10px] sm:text-xs md:text-sm tracking-tight leading-tight truncate w-full text-center">
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.shortLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Overview Stats */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Referral Booyah Pass - Prominently at the Top */}
            <div id="referral-section" className="bg-white p-5 sm:p-7 md:p-8 rounded-[2rem] border-2 border-red-100 shadow-md space-y-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-red-500" /> Referral Pass
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-1">Invite friends using your Referral Code to unlock rewards!</p>
                  <div className="text-[11px] sm:text-xs text-red-600 font-bold flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg inline-flex">
                    <Clock className="w-3.5 h-3.5" /> Note: This Referral Pass resets monthly. Ends in: {passTimeLeft}
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl text-center self-start sm:self-auto">
                  <div className="text-[10px] text-orange-600 font-bold uppercase">Total Referrals</div>
                  <div className="font-heading font-black text-2xl text-orange-500">{user.totalReferrals || 0}</div>
                </div>
              </div>

              {/* Referral Link Share Box */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user.referralCode}` : ''}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-600 font-mono focus:outline-none"
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
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer"
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
                    className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer"
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
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                    title="Share on Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Pass Progress Line & Milestones - Compact & Responsive (No Horizontal Scroll) */}
              <div className="w-full space-y-3 pt-2">
                {/* Visual Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Progress: {user.totalReferrals || 0} / 300 Invites</span>
                    <span className="text-orange-600 font-mono">{Math.min(100, Math.round(((user.totalReferrals || 0) / 300) * 100))}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full w-full overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.min(100, ((user.totalReferrals || 0) / 300) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Milestone Nodes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
                  {referralMilestones.map((milestone) => {
                    const isUnlocked = (user.totalReferrals || 0) >= milestone.required;
                    const isClaimed = (user.claimedMilestones || []).includes(milestone.id);
                    
                    return (
                      <div 
                        key={milestone.id} 
                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center justify-between space-y-2 ${
                          isClaimed
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : isUnlocked
                            ? 'bg-gradient-to-b from-orange-50/90 to-amber-50/70 border-orange-300 shadow-xs ring-1 ring-orange-400/20'
                            : 'bg-slate-50/90 border-slate-200'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${
                          isClaimed 
                            ? 'bg-emerald-500 border-emerald-200 text-white shadow-xs' 
                            : isUnlocked 
                              ? 'bg-gradient-to-br from-red-500 to-orange-500 border-orange-200 text-white shadow-xs animate-pulse' 
                              : 'bg-white border-slate-200 text-slate-400'
                        }`}>
                          {isClaimed ? <Check className="w-4 h-4" /> : isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                        
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{milestone.required} Invites</div>
                          <div className={`text-xs font-heading font-black mt-0.5 ${isUnlocked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {milestone.label}
                          </div>
                        </div>

                        <div className="w-full">
                          {isUnlocked && !isClaimed ? (
                            <button
                              onClick={() => handleClaimMilestone(milestone.id, milestone.rewardType, milestone.rewardAmount)}
                              disabled={claimingMilestoneId === milestone.id}
                              className="w-full py-1.5 bg-gradient-to-r from-red-500 to-orange-500 hover:brightness-110 text-white text-[10px] font-heading font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              {claimingMilestoneId === milestone.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Claiming...</span>
                                </>
                              ) : (
                                <span>Claim</span>
                              )}
                            </button>
                          ) : isClaimed ? (
                            <span className="inline-block w-full py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-xl">
                              Claimed
                            </span>
                          ) : (
                            <span className="inline-block w-full py-1 bg-slate-100 text-slate-400 text-[10px] font-bold uppercase rounded-xl">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Career Stats Grid */}
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
            
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-[2rem] border border-slate-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-brand-orange font-black text-[10px] uppercase tracking-wider border border-orange-200">
                    🛡️ Esports Roster Hub
                  </span>
                  <span className="text-xs font-bold text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-500">Live Team Lineup</span>
                </div>
                <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2 mt-1">
                  <ShieldCheck className="w-6 h-6 text-brand-orange" />
                  <span>My Esports Squads &amp; Clans</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Your official competitive esports team and active registered tournament roster.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  href="/lfg"
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find Players / LFG</span>
                </Link>

                {(squads.length > 0 || teams.length > 0) ? (
                  <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1 / 1 Active Squad Active</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsTeamModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>CREATE SQUAD NOW</span>
                  </button>
                )}
              </div>
            </div>

            {/* 1-Squad Rule Informational Alert */}
            {(squads.length > 0 || teams.length > 0) && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
                <Shield className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                <span>
                  <strong>1-Squad Fair Play Rule:</strong> আপনি বর্তমানে ১ টি সক্রিয় স্কোয়াডের সদস্য। টুর্নামেন্ট রেজিস্ট্রেশন বা রোস্টার পরিবর্তন করতে নিচে আপনার স্কোয়াডে ক্লিক করে <strong>Manage Squad</strong> এ যান।
                </span>
              </div>
            )}

            {/* Empty State Hero */}
            {squads.length === 0 && teams.length === 0 ? (
              <div className="bg-gradient-to-b from-white via-orange-50/20 to-red-50/25 p-8 sm:p-12 rounded-[2.5rem] border-2 border-orange-200/80 text-center space-y-6 shadow-sm relative overflow-hidden">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-orange-500/25 border-4 border-white">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                
                <div className="max-w-xl mx-auto space-y-2">
                  <span className="px-3 py-1 rounded-full bg-orange-100 text-brand-orange font-mono font-black text-xs uppercase tracking-wider inline-block">
                    Free Fire Championship Squad
                  </span>
                  <h4 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                    No Active Squad Yet
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    একটি নিজস্ব স্কোয়াড তৈরি করে লিডার হোন অথবা ইনভাইট লিঙ্কের মাধ্যমে অন্য স্কোয়াডে যুক্ত হয়ে টুর্নামেন্টে অংশ নিন।
                  </p>
                </div>

                {/* 3 Feature Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto text-left">
                  <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center font-black text-sm">
                      👑
                    </div>
                    <div className="font-heading font-black text-xs text-slate-900">Custom Tag &amp; Logo</div>
                    <div className="text-[11px] text-slate-500">Create your unique clan identity e.g. [BRK] BlackRock.</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                      👥
                    </div>
                    <div className="font-heading font-black text-xs text-slate-900">4-Player Lineup</div>
                    <div className="text-[11px] text-slate-500">Invite teammates with Rusher, Sniper, Supporter roles.</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-2xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                      ⚡
                    </div>
                    <div className="font-heading font-black text-xs text-slate-900">1-Click Tournament</div>
                    <div className="text-[11px] text-slate-500">Register in BR and CS tournaments instantly as a full team.</div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setIsTeamModalOpen(true)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 hover:brightness-110 transition-all cursor-pointer"
                  >
                    🔥 Create Your Squad Now
                  </button>
                  <Link
                    href="/lfg"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-heading font-bold text-xs uppercase hover:bg-slate-50 transition-all"
                  >
                    🔍 Join a Squad via LFG
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. New Rich Squad Cards */}
                {squads.map((sq) => {
                  const activeMembers = (sq.members || []).filter(m => m.status === 'ACTIVE');
                  const isLeader = sq.leaderId === user?.id || sq.members?.some(m => m.userId === user?.id && m.isLeader);

                  return (
                    <Link
                      key={sq.id}
                      href={`/squads/${sq.id}`}
                      className="bg-white rounded-3xl border border-slate-200 hover:border-amber-400 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                    >
                      {/* Top Header Card with Banner Background */}
                      <div className="relative h-32 w-full overflow-hidden bg-slate-950">
                        {sq.bannerUrl && (
                          <img
                            src={sq.bannerUrl}
                            alt={sq.name}
                            className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-slate-700 text-amber-400 text-[10px] font-black uppercase">
                            🎮 {sq.game}
                          </span>
                          {isLeader && (
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase shadow-xs">
                              👑 LEADER
                            </span>
                          )}
                        </div>

                        {/* Logo & Name Overlap */}
                        <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3 z-10">
                          <img
                            src={sq.logoUrl}
                            alt={sq.name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-black">
                                [{sq.tag}]
                              </span>
                              <h4 className="text-base sm:text-lg font-black font-heading text-white truncate drop-shadow-md">
                                {sq.name}
                              </h4>
                            </div>
                            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5 font-medium">
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Captain: <strong className="text-white font-bold">{sq.leaderName}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content: Active Roster Members Preview */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between bg-white">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Active Roster Players:</span>
                            <span className="text-brand-orange font-mono">{activeMembers.length} / 6 Active</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeMembers.map((m) => (
                              <div key={m.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={m.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userName}`}
                                    alt={m.userName}
                                    className="w-8 h-8 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                                      <span>{m.userName}</span>
                                      {m.isLeader && <span title="Leader">👑</span>}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono truncate">{m.freeFireUid ? `UID: ${m.freeFireUid}` : m.accountNumber}</div>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 rounded-md bg-orange-50 text-brand-orange border border-orange-200 text-[9px] font-black uppercase shrink-0">
                                  {m.inGameRole || 'PLAYER'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Card Footer Action */}
                        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-500 font-mono">
                            Wins: <strong className="text-emerald-600 font-bold">{sq.matchesWon || 0}</strong> • Matches: <strong>{sq.matchesPlayed || 0}</strong>
                          </div>

                          <div className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-brand-orange group-hover:text-red-600 transition-colors">
                            <span>Manage Roster &amp; Invites</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* 2. Fallback for legacy teams if any */}
                {squads.length === 0 && teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/squads/${team.id}`}
                    className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-amber-400 shadow-sm space-y-4 hover:shadow-xl transition-all duration-300 group cursor-pointer block"
                  >
                    <div className="flex items-center space-x-4">
                      <img src={team.logo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'} alt={team.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-100 shadow-sm bg-slate-950" />
                      <div className="min-w-0">
                        <div className="font-heading font-black text-lg text-slate-900 flex items-center gap-2 truncate">
                          <span>{team.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100 font-mono font-bold">[{team.tag}]</span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5">Captain: <strong className="text-slate-900 font-bold">{team.captainName || user?.inGameName || user?.name || 'Captain'}</strong></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                      <span className="text-slate-600 font-mono font-medium">Invite Code: <strong className="text-orange-600 font-bold">{team.inviteCode}</strong></span>
                      <span className="text-cyan-700 font-bold bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100">{team.membersCount || 1} Roster Members</span>
                    </div>

                    <div className="pt-2 flex items-center justify-end text-xs font-black font-heading text-amber-600 group-hover:text-amber-700">
                      <span>View Full Squad &amp; Roster</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Shop Orders & Transactions */}
        {activeTab === 'TRANSACTIONS' && (() => {
          const shopOrders = payments.filter(p => parseShopOrderDetails(p.notes) !== null);
          const walletTransactions = payments.filter(p => parseShopOrderDetails(p.notes) === null);

          return (
            <div className="space-y-6">
              {/* Header & Sub-Tab Filter Pills */}
              <div className="bg-white p-4 sm:p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                    <span>Purchases, Orders & Transactions</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track your Free Fire diamond top-ups, membership passes, order delivery status and wallet deposits.
                  </p>
                </div>

                {/* Segmented Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setTransactionFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      transactionFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Activity ({payments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFilter('SHOP_ORDERS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      transactionFilter === 'SHOP_ORDERS'
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Diamond className="w-3.5 h-3.5" />
                    <span>Shop Orders ({shopOrders.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFilter('WALLET')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      transactionFilter === 'WALLET'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Wallet ({walletTransactions.length})</span>
                  </button>
                </div>
              </div>

              {/* 1. Shop Orders Section (when SHOP_ORDERS or ALL is active) */}
              {(transactionFilter === 'SHOP_ORDERS' || transactionFilter === 'ALL') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-heading font-black text-xs sm:text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Diamond className="w-4 h-4 text-cyan-500" />
                      <span>Gaming Shop Orders & Purchases ({shopOrders.length})</span>
                    </h4>
                    <Link
                      href="/shop"
                      className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                    >
                      <span>Visit Shop</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {shopOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 border border-orange-200 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-heading font-black text-base text-slate-900">No shop purchases yet</div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          You have not placed any Free Fire diamond top-ups or shop orders yet. Browse the shop to purchase items with Wallet Taka or BRK Coins!
                        </p>
                      </div>
                      <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold shadow-sm hover:opacity-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Browse Gaming Shop</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shopOrders.map((p) => {
                        const details = parseShopOrderDetails(p.notes);
                        const isVerified = p.status === 'VERIFIED';
                        const isPending = p.status === 'PENDING';
                        const isRejected = p.status === 'REJECTED';

                        return (
                          <div
                            key={p.id}
                            className="bg-white rounded-3xl border border-slate-200 hover:border-orange-300 p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Card Top: Item & Status Badge */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-transparent border border-cyan-200 text-cyan-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                                    <Diamond className="w-6 h-6 text-cyan-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-heading font-black text-slate-900 text-sm sm:text-base truncate">
                                      {details?.itemName || 'Gaming Item'}
                                    </h4>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                                      <span>Trx: <strong className="text-slate-700">{p.trxId}</strong></span>
                                      <span>•</span>
                                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>

                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                                  isVerified
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                    : isPending
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {isVerified ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Delivered</span>
                                    </>
                                  ) : isPending ? (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Pending</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Cancelled</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Player Info & Price Box */}
                              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500 font-medium">Target Free Fire UID:</span>
                                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                    {details?.targetUid || user?.freeFireUid || 'N/A'}
                                  </span>
                                </div>
                                {details?.targetIgn && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Player IGN:</span>
                                    <span className="font-bold text-slate-900">{details.targetIgn}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                  <span className="text-slate-500 font-medium">Total Paid:</span>
                                  <span className="font-heading font-black text-orange-600 flex items-center gap-1 text-sm">
                                    {p.method === 'COINS' ? <Coins className="w-3.5 h-3.5 text-amber-500" /> : '৳'}
                                    {p.amount} {p.method === 'COINS' ? 'Coins' : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Status Notes & Voucher Box */}
                              {isPending && (
                                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <strong>Delivery Pending (প্রসেসিং হচ্ছে):</strong> আপনার অর্ডারটি সফলভাবে জমা হয়েছে। অ্যাডমিন ভেরিফাই করে অল্প সময়ের মধ্যেই আপনার ফ্রি ফায়ার UID-তে টপ-আপ প্রদান করবেন।
                                  </div>
                                </div>
                              )}

                              {isVerified && (
                                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <div>
                                      <strong>Confirmed & Delivered (ডেলিভার সম্পন্ন):</strong> আপনার আইটেমটি সফলভাবে ডেলিভারি সম্পন্ন হয়েছে!
                                    </div>
                                    {details?.voucherCode && (
                                      <div className="mt-1 font-mono font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-xl border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                                        <span>Redeem Voucher:</span>
                                        <span className="text-orange-600 select-all">{details.voucherCode}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {isRejected && (
                                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl text-[11px] text-rose-900 flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  <div>
                                    <strong>Order Cancelled & Refunded (বাতিল ও রিফান্ডেড):</strong> অর্ডারটি বাতিল করা হয়েছে এবং সম্পূর্ণ {p.amount} {p.method === 'COINS' ? 'কয়েন' : 'টাকা'} আপনার একাউন্ট ব্যালেন্সে রিফান্ড করা হয়েছে।
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Wallet Transactions Section (when WALLET or ALL is active) */}
              {(transactionFilter === 'WALLET' || transactionFilter === 'ALL') && (
                <div className="space-y-3">
                  <h4 className="font-heading font-black text-xs sm:text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2 px-1">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span>Wallet Deposits, Withdrawals & Payouts ({walletTransactions.length})</span>
                  </h4>

                  <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
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
                          {walletTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-600 text-sm font-medium">
                                No wallet transactions recorded yet.
                              </td>
                            </tr>
                          ) : (
                            walletTransactions.map((p) => (
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
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 5: Admin Support Chat */}
        {activeTab === 'SUPPORT' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            
            {/* Left Sidebar: Support Info & Quick Help */}
            <div className="w-full md:w-80 bg-slate-900 text-white p-6 space-y-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
                    <Headphones className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-lg text-white">Live Admin Desk</h3>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>24/7 Official Support</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  আপনার টুর্নামেন্ট সমস্যা, রুম আইডি মিসিং, পয়েন্ট টেবিল প্রশ্ন বা ডিপোজিট/উইথড্র সমস্যা নিয়ে সরাসরি অ্যাডমিনের সাথে চ্যাট করুন।
                </p>

                {supportTicket && (
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Ticket Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        supportTicket.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-orange-500/20 text-orange-300'
                      }`}>
                        {supportTicket.status || 'OPEN'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">Ticket ID: <strong className="text-slate-200 font-mono">{supportTicket.id}</strong></div>
                  </div>
                )}
              </div>

              {/* Discord Link Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 text-xs space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Discord Community</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  ইনস্ট্যান্ট ডিসকর্ড হেল্পডেস্কে জয়েন হতে ভিজিট করুন:
                </p>
                <a
                  href="https://discord.gg/blackrock-esports"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-indigo-200 hover:underline"
                >
                  <span>Join Official Discord Server</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Right Main Chat Thread Area */}
            <div className="flex-1 flex flex-col justify-between bg-slate-50/50">
              
              {/* Chat Thread Header */}
              <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-slate-900 text-base">Direct Admin Chat</h4>
                    <p className="text-xs text-slate-500">আপনার মেসেজের উত্তর অ্যাডমিন প্যানেল থেকে দ্রুততম সময়ে দেওয়া হবে</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => user && fetchSupportChat(user.id)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Refresh Chat"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSupport ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[460px]">
                {supportMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3 py-16">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                      <Headphones className="w-8 h-8" />
                    </div>
                    <div>
                      <h5 className="font-heading font-bold text-slate-700 text-base">No Previous Support Messages</h5>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">
                        আপনার কোনো প্রশ্ন বা সমস্যা থাকলে নিচে মেসেজ লিখুন। আমাদের সাপোর্ট অ্যাডমিন প্যানেল থেকে সরাসরি আপনার উত্তর দেবেন।
                      </p>
                    </div>
                  </div>
                ) : (
                  supportMessages.map((msg) => {
                    const isUser = msg.senderRole === 'USER';
                    const isAdmin = msg.senderRole === 'ADMIN';
                    const isSystem = msg.senderRole === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-3">
                          <div className="max-w-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs p-4 rounded-2xl shadow-2xs space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                              <Sparkles className="w-4 h-4 text-indigo-500" />
                              <span>{msg.userName || 'Black Rock Support Bot'}</span>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-500">
                            {isAdmin ? '🛡️ Admin Support' : msg.userName || 'You'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`max-w-md p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-2xs whitespace-pre-wrap ${
                            isUser
                              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-tr-none'
                              : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={supportMessagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendSupportMessage} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type your message to Admin support..."
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  disabled={isSendingSupport}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={!supportInput.trim() || isSendingSupport}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xs sm:text-sm shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSendingSupport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

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

              {/* In-Game Esports Role Selector */}
              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Esports In-Game Role</span>
                  <span className="text-[10px] text-orange-600 font-bold">
                    Selected: {ESPORTS_ROLES.find(r => r.role === inGameRole)?.label || inGameRole}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ESPORTS_ROLES.map((r) => {
                    const isSelected = inGameRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setInGameRole(r.role)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-left ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-orange-500 text-orange-950 font-black shadow-xs ring-2 ring-orange-400/40'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base">{r.icon}</span>
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
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

      {/* Create Team / Squad Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-slate-900">CREATE ESPORTS SQUAD</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Official tournament roster registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Squad Badge Preview */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white flex items-center gap-3.5 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-lg border-2 border-white/20 shrink-0">
                {teamTag.trim() ? teamTag.trim().substring(0, 2).toUpperCase() : '⚡'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black border border-amber-500/30">
                    [{teamTag.trim().toUpperCase() || 'TAG'}]
                  </span>
                  <h4 className="text-sm font-black font-heading text-white truncate">
                    {teamName.trim() || 'Your Squad Name'}
                  </h4>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Captain: <strong className="text-white">{user?.inGameName || user?.name || 'Leader'}</strong> • Free Fire Roster
                </div>
              </div>
            </div>
            
            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1">Squad / Clan Name *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="e.g. BlackRock Esports"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-xs uppercase text-slate-700 block mb-1">
                  Clan Tag (2 to 6 Characters) *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={teamTag}
                  onChange={(e) => setTeamTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  required
                  placeholder="e.g. BRK, OCR, NV"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono uppercase font-black focus:outline-none focus:border-brand-orange focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tag will appear in tournament brackets as <strong>[{teamTag || 'TAG'}]</strong>.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>{isCreatingTeam ? 'Registering Squad...' : 'Create Official Squad'}</span>
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
