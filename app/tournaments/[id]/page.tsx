'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Clock,
  Users,
  Flame,
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  Wallet,
  Coins,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  User,
  Gamepad2,
  Phone,
  Zap,
  Sparkles,
  Award,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import SlotGrid from '@/components/tournaments/SlotGrid';
import RoomBatchGrid from '@/components/tournaments/RoomBatchGrid';
import TournamentCountdown from '@/components/tournaments/TournamentCountdown';
import { useRealtimeTournament } from '@/lib/use-realtime';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';
import { Tournament, User as UserType, TournamentStatus } from '@/lib/types';
import { db } from '@/lib/db';

/* ──────────────────────────────────────────────
   Types
────────────────────────────────────────────── */
interface SquadForm {
  squadName: string;
  iglName: string;
  player1Name: string;
  player2Name: string;
  player3Name: string;
  player4Name: string;
  backupPlayerName: string;
  captainWhatsApp: string;
}

interface FieldErrors {
  [key: string]: string;
}

interface SuccessData {
  registrationId: string;
  teamId: string;
  squadName: string;
  tournamentTitle: string;
  entryFee: number;
  remainingBalance: number;
}

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
const emptyForm: SquadForm = {
  squadName: '',
  iglName: '',
  player1Name: '',
  player2Name: '',
  player3Name: '',
  player4Name: '',
  backupPlayerName: '',
  captainWhatsApp: '',
};

function FieldInput({
  label,
  value,
  onChange,
  error,
  required = true,
  placeholder = '',
  type = 'text',
  mono = false,
  disabled = false,
  readOnly = false,
  badge = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  badge?: string;
}) {
  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-1 mb-1">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">
          {label} {required && <span className="text-brand-red">*</span>}
        </label>
        {badge && (
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">
            {badge}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full px-3 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
          disabled || readOnly
            ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed font-medium'
            : error
            ? 'border-red-500 bg-red-50/50'
            : 'border-slate-200 bg-white focus:border-brand-orange'
        } ${mono ? 'font-mono font-semibold' : ''}`}
      />
      {error && <p className="mt-0.5 text-[10px] text-red-500 font-semibold leading-tight">{error}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Page
────────────────────────────────────────────── */
export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  // Dynamic status
  const [currentStatus, setCurrentStatus] = useState<TournamentStatus>('PENDING');
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!tournament) return;
    
    if (tournament.status === 'CANCELLED' || tournament.status === 'DRAFT' || tournament.status === 'PENDING' || tournament.status === 'FINISHED' || tournament.isPaused) {
      setCurrentStatus(tournament.isPaused ? 'PENDING' : tournament.status);
      return;
    }

    const startTimeStr = tournament.tournamentStart || tournament.matchTime;
    const startTime = startTimeStr ? new Date(startTimeStr).getTime() : 0;
    if (startTime === 0) return;

    // Run once immediately
    setCurrentStatus(getDynamicTournamentStatus(tournament));

    const intervalId = setInterval(() => {
      const newStatus = getDynamicTournamentStatus(tournament);
      if (newStatus !== currentStatus) {
        setCurrentStatus(newStatus);
      }

      if (newStatus === 'UPCOMING') {
        const now = Date.now();
        const diff = startTime - now;
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          setCountdown(
            `${days}d : ${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`
          );
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [tournament, currentStatus]);

  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<'ROOM' | 'DETAILS'>('ROOM');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Form state
  const [form, setForm] = useState<SquadForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'COINS'>('WALLET');

  // Community state
  const [communityStatus, setCommunityStatus] = useState<'locked' | 'unlocked' | 'disabled' | 'loading'>('loading');
  const [communityMessage, setCommunityMessage] = useState('');
  const [communityLink, setCommunityLink] = useState('');
  const [communityName, setCommunityName] = useState('');

  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);
  const [userSquads, setUserSquads] = useState<any[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isGiveawayTournament = Boolean(
    tournament?.isGiveaway || 
    tournament?.requiresFullSquad || 
    (Number(tournament?.entryFee) === 0 && (!tournament?.coinEntryFee || Number(tournament?.coinEntryFee) === 0)) ||
    (tournament?.title && (tournament.title.toLowerCase().includes('giveaway') || tournament.title.toLowerCase().includes('free')))
  );

  const eligibleSquads = useMemo(() => {
    return userSquads.filter(s => ((s.members || []).filter((m: any) => m.status === 'ACTIVE')).length >= 4);
  }, [userSquads]);

  const selectedSquad = useMemo(() => {
    return userSquads.find(s => s.id === selectedSquadId) || (eligibleSquads.length > 0 ? eligibleSquads[0] : userSquads[0]) || null;
  }, [userSquads, selectedSquadId, eligibleSquads]);

  const selectedSquadActiveCount = useMemo(() => {
    if (!selectedSquad) return 0;
    return (selectedSquad.members || []).filter((m: any) => m.status === 'ACTIVE').length;
  }, [selectedSquad]);

  const isSelectedSquadEligible = selectedSquadActiveCount >= 4;

  const applySquadRoster = (squad: any) => {
    if (!squad) return;
    const activeMembers = (squad.members || []).filter((m: any) => m.status === 'ACTIVE');
    const igl = activeMembers.find((m: any) => m.isLeader || m.inGameRole === 'IGL') || activeMembers[0];
    const nonIgl = activeMembers.filter((m: any) => m.id !== igl?.id);

    setSelectedSquadId(squad.id);
    setForm(prev => ({
      ...prev,
      squadName: squad.name,
      iglName: igl?.userName || currentUser?.inGameName || currentUser?.name || '',
      player1Name: igl?.userName || currentUser?.inGameName || currentUser?.name || '',
      player2Name: nonIgl[0]?.userName || '',
      player3Name: nonIgl[1]?.userName || '',
      player4Name: nonIgl[2]?.userName || '',
      backupPlayerName: nonIgl[3]?.userName || '',
      captainWhatsApp: currentUser?.phone || currentUser?.whatsApp || prev.captainWhatsApp || '',
    }));
    showToast(`Auto-filled roster from squad [${squad.tag}] ${squad.name}!`);
  };

  useEffect(() => {
    let isMounted = true;
    const loadTournament = async () => {
      try {
        setLoading(true);
        const user = db.getCurrentUser();
        if (isMounted) setCurrentUser(user);

        if (user?.id) {
          fetch(`/api/squads?userId=${user.id}`)
            .then(res => res.json())
            .then(d => {
              if (isMounted && d.squads) setUserSquads(d.squads);
            })
            .catch(() => {});
        }

        const response = await fetch(`/api/tournaments/${resolvedParams.id}${user ? `?userId=${user.id}` : ''}`);
        if (!response.ok) {
          if (isMounted) {
            setTournament(null);
            setLoading(false);
          }
          return;
        }
        const payload = await response.json();
        const tour = payload.tournament;
        if (isMounted) {
          setTournament(tour || null);
          const registrations = payload.userRegistrations || [];
          setMyRegistrations(registrations);
          if (tour && user && registrations.length > 0) {
            setIsJoined(true);
          }
        }

        if (tour?.community?.enabled && !tour.community.isDisabled) {
          if (isMounted) setCommunityStatus('loading');
          fetch(`/api/tournaments/${resolvedParams.id}/community`, {
            headers: { 'x-user-id': user?.id || '' },
          })
            .then(async (communityResponse) => {
              if (!communityResponse.ok) {
                const data = await communityResponse.json().catch(() => ({}));
                if (isMounted) {
                  setCommunityMessage(data.message || 'Community access is locked.');
                  setCommunityStatus('locked');
                }
                return;
              }
              const data = await communityResponse.json();
              if (isMounted) {
                setCommunityLink(data.inviteLink || '');
                setCommunityName(data.communityName || 'Official Tournament Community');
                setCommunityStatus('unlocked');
              }
            })
            .catch(() => {
              if (isMounted) {
                setCommunityMessage('Community access is unavailable right now.');
                setCommunityStatus('locked');
              }
            });
        } else {
          if (isMounted) {
            setCommunityStatus('disabled');
            setCommunityMessage('Community access is not enabled for this tournament.');
          }
        }
      } catch {
        if (isMounted) setTournament(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadTournament();
    return () => {
      isMounted = false;
    };
  }, [resolvedParams.id]);

  // Real-time Supabase WebSockets listener for live match updates
  useRealtimeTournament(resolvedParams.id, (updatedTour) => {
    setTournament((prev) => prev ? { ...prev, ...updatedTour } : updatedTour);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
        <Navbar />
        {/* Banner Skeleton */}
        <div className="relative h-80 sm:h-96 w-full overflow-hidden bg-slate-900 border-b border-slate-800 flex items-end">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 relative z-10 w-full animate-pulse">
            <div className="h-6 w-32 bg-slate-800 rounded-full mb-3" />
            <div className="h-10 w-3/4 max-w-xl bg-slate-800 rounded-xl mb-4" />
            <div className="flex flex-wrap gap-4">
              <div className="h-6 w-24 bg-slate-800 rounded-lg" />
              <div className="h-6 w-28 bg-slate-800 rounded-lg" />
              <div className="h-6 w-32 bg-slate-800 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
                <div className="h-7 w-3/4 bg-slate-200 rounded" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="h-6 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-5/6 bg-slate-100 rounded" />
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-72 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="h-6 w-32 bg-slate-200 rounded" />
                <div className="h-12 w-full bg-slate-100 rounded-xl" />
                <div className="h-12 w-full bg-slate-200 rounded-xl" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-body">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <div className="w-20 h-20 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mb-5 shadow-xs">
            <Trophy className="w-10 h-10 text-brand-red" />
          </div>
          <h2 className="font-heading font-black text-3xl text-slate-900">Tournament Not Found</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md">
            The tournament you are looking for might have expired, been deleted, or does not exist.
          </p>
          <Link
            href="/tournaments"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm shadow-md hover:bg-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tournaments</span>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isFull = tournament.registeredCount >= tournament.maxTeams;
  const isLive = currentStatus === 'LIVE';
  const isFinished = currentStatus === 'FINISHED' || currentStatus === 'CANCELLED';

  const walletBalance = currentUser?.walletBalance ?? 0;
  const coinBalance = currentUser?.coinBalance ?? 0;
  
  const allowCoins = tournament.allowCoinEntry !== false && tournament.entryFeeType !== 'CASH';
  const isCoinOnly = tournament.entryFeeType === 'COINS';
  const isFree = tournament.entryFee === 0 && (!tournament.coinEntryFee || tournament.coinEntryFee === 0);

  const requiredCash = Number(tournament.entryFee) || 0;
  const requiredCoins = tournament.coinEntryFee !== undefined && tournament.coinEntryFee !== null && tournament.coinEntryFee > 0
    ? Number(tournament.coinEntryFee)
    : (requiredCash * 10 || 500);

  const currentRequiredFee = paymentMethod === 'COINS' ? requiredCoins : requiredCash;

  const hasSufficientWalletBalance = walletBalance >= requiredCash;
  const hasSufficientCoinBalance = coinBalance >= requiredCoins;
  const hasSufficientBalance = isFree || (paymentMethod === 'WALLET' ? hasSufficientWalletBalance : hasSufficientCoinBalance);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenCommunity = async () => {
    if (!currentUser) return;
    const response = await fetch(`/api/tournaments/${resolvedParams.id}/community`, {
      headers: { 'x-user-id': currentUser.id },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(payload.message || 'You are not eligible to access the community yet.'); return; }
    window.open(payload.inviteLink, '_blank', 'noopener,noreferrer');
    showToast(`Opening ${payload.communityName || 'the community'}...`);
  };

  const openJoinModal = () => {
    if (currentStatus === 'PENDING') {
      showToast('⚠️ এই ট্যুরনামেন্টের রেজিস্ট্রেশন পেন্ডিং রয়েছে।');
      return;
    }
    if (currentStatus === 'UPCOMING') {
      showToast('🕒 এই ট্যুরনামেন্টের রেজিস্ট্রেশন শীঘ্রই শুরু হবে (Upcoming)।');
      return;
    }
    if (currentStatus === 'LIVE' || currentStatus === 'FINISHED' || currentStatus === 'CANCELLED' || isFinished) {
      showToast('⚠️ এই ট্যুরনামেন্টের রেজিস্ট্রেশন বন্ধ রয়েছে।');
      return;
    }
    if (isJoined && isGiveawayTournament) {
      showToast('⚠️ Giveaway টুর্নামেন্টে প্রতি ইউজারের জন্য শুধুমাত্র ১টি টিম রেজিস্ট্রেশনের অনুমতি রয়েছে।');
      return;
    }

    let user = currentUser;
    if (!user) {
      user = db.getCurrentUser();
      if (user) setCurrentUser(user);
    }

    if (tournament.entryFeeType === 'COINS') {
      setPaymentMethod('COINS');
    } else {
      setPaymentMethod('WALLET');
    }

    if (isGiveawayTournament) {
      if (eligibleSquads.length > 0) {
        applySquadRoster(eligibleSquads[0]);
      } else if (userSquads.length > 0) {
        applySquadRoster(userSquads[0]);
      } else {
        setSelectedSquadId('');
        setForm({
          squadName: '',
          iglName: user?.inGameName || user?.name || '',
          player1Name: user?.inGameName || user?.name || '',
          player2Name: '',
          player3Name: '',
          player4Name: '',
          backupPlayerName: '',
          captainWhatsApp: user?.phone || '',
        });
      }
    } else {
      if (userSquads.length > 0) {
        applySquadRoster(userSquads[0]);
      } else {
        setSelectedSquadId('');
        setForm({
          squadName: '',
          iglName: user?.inGameName || user?.name || '',
          player1Name: user?.inGameName || user?.name || '',
          player2Name: '',
          player3Name: '',
          player4Name: '',
          backupPlayerName: '',
          captainWhatsApp: user?.phone || '',
        });
      }
    }

    setFieldErrors({});
    setSubmitError('');
    setSuccessData(null);
    setIsJoinModalOpen(true);
  };

  const closeJoinModal = () => {
    if (isSubmitting) return;
    setIsJoinModalOpen(false);
    setSuccessData(null);
  };

  const setField = (key: keyof SquadForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let user: UserType | null = currentUser || db.getCurrentUser();
    if (!user) {
      const fallbackUser: UserType = {
        id: `usr_${Date.now()}`,
        name: form.iglName || 'Player One',
        email: `${(form.iglName || 'player').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'player'}@helian.gg`,
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
        freeFireUid: '2084920194',
        inGameName: form.iglName || 'Player One',
        walletBalance: 1000,
        coinBalance: 5000,
        totalKills: 0,
        totalWins: 0,
        earnings: 0,
        isBanned: false,
        referralCode: 'REF_PLAYER',
        role: 'USER',
        phone: form.captainWhatsApp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.setCurrentUser(fallbackUser);
      setCurrentUser(fallbackUser);
      user = fallbackUser;
    }

    if (!user) return;

    if (isJoined && isGiveawayTournament) {
      setSubmitError('Giveaway টুর্নামেন্টে ইতিমধ্যে আপনার ১টি টিম রেজিস্টার করা আছে। একাধিক টিম রেজিস্টার করা যাবে না।');
      return;
    }

    setSubmitError('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const activeUser = user;
      const response = await fetch(`/api/tournaments/${resolvedParams.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          userName: activeUser.name,
          userEmail: activeUser.email,
          userWalletBalance: activeUser.walletBalance,
          userCoinBalance: activeUser.coinBalance,
          paymentType: paymentMethod,
          ...form,
        }),
      });

      const result = await response.json().catch(() => ({ message: 'Unexpected server response.' }));

      if (!response.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
          setSubmitError(result.message || 'Please fix the errors below.');
        } else {
          setSubmitError(result.message || 'Registration failed. Please try again.');
        }
        return;
      }

      // Update local wallet/coin balance state
      const updatedUser: UserType = {
        ...activeUser,
        walletBalance: paymentMethod === 'WALLET' ? result.remainingBalance : activeUser.walletBalance,
        coinBalance: paymentMethod === 'COINS' ? result.remainingBalance : activeUser.coinBalance,
      };
      db.updateUser(activeUser.id, updatedUser);
      setCurrentUser(updatedUser);

      // Show success screen
      setSuccessData({
        registrationId: result.registrationId,
        teamId: result.teamId,
        squadName: result.squadName,
        tournamentTitle: result.tournamentTitle,
        entryFee: result.entryFee,
        remainingBalance: result.remainingBalance,
      });
      setIsJoined(true);

      const newParticipant = {
        id: result.registrationId,
        registrationId: result.registrationId,
        tournamentId: resolvedParams.id,
        userId: activeUser.id,
        squadName: (form.squadName || result.squadName || '').trim(),
        iglName: (form.iglName || '').trim(),
        captainWhatsApp: (form.captainWhatsApp || '').trim(),
        player1Name: (form.player1Name || '').trim(),
        player2Name: (form.player2Name || '').trim(),
        player3Name: (form.player3Name || '').trim(),
        player4Name: (form.player4Name || '').trim(),
        backupPlayerName: (form.backupPlayerName || '').trim() || null,
        joinedAt: new Date().toISOString(),
        status: 'VERIFIED',
      };

      setMyRegistrations((prev) => [newParticipant, ...prev]);
      setTournament((prev) => {
        if (!prev) return prev;
        const currentParticipants = (prev as any).participants || [];
        return {
          ...prev,
          registeredCount: (prev.registeredCount || 0) + 1,
          participants: [...currentParticipants, newParticipant],
        };
      });
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error. Could not reach the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
      <Navbar />

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 right-5 z-50 bg-gradient-to-r from-brand-red to-brand-orange text-white px-6 py-3.5 rounded-2xl shadow-neon-red font-heading font-bold text-sm flex items-center space-x-3"
          >
            <Check className="w-5 h-5 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner */}
      <div className="relative h-80 sm:h-96 w-full overflow-hidden bg-slate-900 border-b border-slate-200">
        <img
          src={tournament.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200'}
          alt={tournament.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-8">
          <Link href="/tournaments" className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/90 hover:bg-white backdrop-blur-md border border-white/20 text-xs font-bold text-slate-900 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4 text-brand-orange" />
            <span>Back to Hub</span>
          </Link>
        </div>

        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="px-3 py-1 rounded-lg bg-orange-600/90 text-white text-xs font-black uppercase tracking-wider shadow-md">
                {tournament.game === 'EFOOTBALL' ? '⚽ eFootball' : tournament.game === 'PUBG_MOBILE' ? '🪖 PUBG Mobile' : tournament.game === 'VALORANT' ? '🎯 Valorant' : tournament.game === 'MLBB' ? '⚔️ Mobile Legends' : tournament.gameName || '🔥 Free Fire'}
              </span>
              <span className="px-3 py-1 rounded-lg bg-brand-red text-white text-xs font-bold uppercase">{tournament.mode}</span>
              <span className="px-3 py-1 rounded-lg bg-brand-purple text-white text-xs font-bold uppercase shadow-neon-cyan">{tournament.format.replace('_', ' ')}</span>
              {isGiveawayTournament && (
                <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase shadow-neon-orange flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> 4P OFFICIAL SQUAD MUST
                </span>
              )}
              <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold uppercase flex items-center gap-2">
                {currentStatus === 'LIVE' ? (
                  <span className="flex items-center gap-1 text-brand-red animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-brand-red animate-ping"></span>🔴 LIVE NOW
                  </span>
                ) : currentStatus === 'PENDING' ? (
                  <span className="text-amber-400 font-bold">🟡 PENDING</span>
                ) : currentStatus === 'UPCOMING' ? (
                  <>
                    <span className="text-blue-400 font-bold">🔵 UPCOMING</span>
                    {countdown && <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded border border-blue-400/30 shadow-xs">Starts In: {countdown}</span>}
                  </>
                ) : currentStatus === 'FINISHED' ? (
                  <span className="text-slate-400 font-bold">🏁 FINISHED</span>
                ) : (
                  <span className="text-emerald-400 font-bold">🟢 RUNNING (OPEN)</span>
                )}
              </span>
            </div>
            <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-white drop-shadow-md">{tournament.title}</h1>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between sm:justify-start gap-4 shrink-0 w-full sm:w-auto">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prize Pool</div>
              <div className="text-2xl sm:text-3xl font-heading font-extrabold text-amber-600 leading-tight">৳ {tournament.prizePool.toLocaleString()}</div>
            </div>

            {isLive ? (
              <button className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-brand-red text-white font-heading font-black text-sm sm:text-base shadow-neon-red flex items-center space-x-2.5">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                <span>MATCH IS LIVE</span>
              </button>
            ) : isFinished ? (
              <button className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-200 text-slate-500 font-heading font-bold text-sm sm:text-base cursor-not-allowed">
                FINISHED
              </button>
            ) : currentStatus === 'PENDING' ? (
              <button disabled className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 font-heading font-black text-sm sm:text-base cursor-not-allowed flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>REGISTRATION PENDING</span>
              </button>
            ) : currentStatus === 'UPCOMING' ? (
              <button disabled className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-blue-100 text-blue-800 border border-blue-300 font-heading font-black text-sm sm:text-base cursor-not-allowed flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>UPCOMING (COMING SOON)</span>
              </button>
            ) : isFull ? (
              <button className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-200 text-slate-500 font-heading font-bold text-sm sm:text-base cursor-not-allowed">SLOTS FULL</button>
            ) : isJoined && isGiveawayTournament ? (
              <button
                disabled
                className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-heading font-black text-sm sm:text-base shadow-neon-cyan flex items-center space-x-2.5 cursor-default opacity-95"
              >
                <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>ALREADY REGISTERED (1 SQUAD LIMIT)</span>
              </button>
            ) : isJoined ? (
              <button
                onClick={openJoinModal}
                className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl text-white font-heading font-black text-sm sm:text-base shadow-neon-cyan hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600"
              >
                <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>REGISTER ANOTHER SQUAD (৳{tournament.entryFee})</span>
              </button>
            ) : (
              <button
                onClick={openJoinModal}
                className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl text-white font-heading font-black text-sm sm:text-base shadow-neon-red hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 cursor-pointer bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold"
              >
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>JOIN (৳{tournament.entryFee})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">

        {/* Live Registration Countdown Banner (Days, Hours, Minutes, Seconds) */}
        <TournamentCountdown tournament={tournament} variant="hero" />

        {/* Tabs - Room ID & Password positioned on the LEFT as the primary tab */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('ROOM')}
            className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-heading font-black text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'ROOM'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Room ID & Password</span>
          </button>

          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-heading font-black text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'DETAILS'
                ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100/80 border border-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Match Details</span>
          </button>
        </div>

        {/* ROOM & 12-SLOT GRID TAB (Primary Left Side View) */}
        {activeTab === 'ROOM' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0 w-full">
            <div className="lg:col-span-2 space-y-6 min-w-0 w-full">
              <RoomBatchGrid
                tournamentId={tournament.id}
                tournamentTitle={tournament.title}
                tournamentFormat={tournament.tournamentBatchFormat || 'SINGLE_ROOM'}
                gameMode={tournament.mode}
                currentUser={currentUser}
                startTime={tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined)}
              />
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3">Match Details</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-bold uppercase">Format</span>
                    <span className="font-bold text-brand-orange">{tournament.format.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-bold uppercase">Mode</span>
                    <span className="font-bold text-brand-red">{tournament.mode}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-bold uppercase">Match Schedule</span>
                    <span className="font-bold text-slate-900">{new Date(tournament.tournamentStart || tournament.matchTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 font-bold uppercase">Slots Registered</span>
                    <span className="font-bold text-amber-600">{tournament.registeredCount} / {tournament.maxTeams} Teams</span>
                  </div>
                </div>
              </div>

              {myRegistrations.length > 0 && (
                <div className="bg-orange-50/40 rounded-3xl p-6 border border-brand-orange/30 space-y-4 shadow-sm">
                  <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-brand-orange/20 pb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-brand-orange" /> My Registered Squads ({myRegistrations.length})
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {myRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        onClick={() => setSelectedRegistration(reg)}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-brand-orange/50 hover:bg-orange-50/30 transition-all shadow-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{reg.squadName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {reg.registrationId}</div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                          reg.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          reg.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {reg.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-orange">
                  <ShieldCheck className="h-4 w-4 text-brand-orange" /> Private Community Access
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {communityStatus === 'loading' ? (
                    <div className="text-sm text-slate-500">Checking access permissions…</div>
                  ) : communityStatus === 'disabled' ? (
                    <div className="text-sm text-slate-500">{communityMessage}</div>
                  ) : communityStatus === 'unlocked' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><Unlock className="h-4 w-4" /> Community Unlocked</div>
                      <div className="text-sm text-slate-700">{communityName}</div>
                      <button onClick={() => void handleOpenCommunity()} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-xs">Join Official Community</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-600"><Lock className="h-4 w-4" /> Community Locked</div>
                      <div className="text-sm text-slate-600">{communityMessage}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'DETAILS' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand-orange" /> Match Summary & Schedule
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-600 font-bold uppercase">Format</span>
                  <span className="font-bold text-brand-orange">{tournament.format.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-600 font-bold uppercase">Mode</span>
                  <span className="font-bold text-brand-red">{tournament.mode}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-600 font-bold uppercase">Match Schedule</span>
                  <span className="font-bold text-slate-900">{new Date(tournament.tournamentStart || tournament.matchTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-600 font-bold uppercase">Slots Registered</span>
                  <span className="font-bold text-amber-600">{tournament.registeredCount} / {tournament.maxTeams} Teams</span>
                </div>
              </div>
            </div>

            {myRegistrations.length > 0 && (
              <div className="bg-orange-50/40 rounded-3xl p-6 border border-brand-orange/30 space-y-4 shadow-sm">
                <h3 className="font-heading font-bold text-lg text-slate-900 border-b border-brand-orange/20 pb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand-orange" /> My Registered Squads ({myRegistrations.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {myRegistrations.map((reg) => (
                    <div
                      key={reg.id}
                      onClick={() => setSelectedRegistration(reg)}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-brand-orange/50 hover:bg-orange-50/30 transition-all shadow-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{reg.squadName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {reg.registrationId}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                        reg.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        reg.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {reg.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════
          JOIN TOURNAMENT MODAL (Redesigned - Whitish Theme)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full border-2 border-red-200/90 shadow-2xl overflow-y-auto max-h-[92vh] relative text-slate-900"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 sm:px-6 sm:py-3.5">
                <div>
                  <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900">JOIN TOURNAMENT</h3>
                  <div className="text-xs text-brand-orange font-semibold truncate max-w-[240px] sm:max-w-md">{tournament.title}</div>
                </div>
                <button onClick={closeJoinModal} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* ── SUCCESS SCREEN ── */}
              {successData ? (
                <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-2xs">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="font-heading font-black text-lg sm:text-xl text-slate-900">Registration Successful!</h4>
                    <p className="text-[11px] text-slate-600 max-w-sm mx-auto">Your slot is confirmed. You now have full access to Room ID and the official Discussion Group.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200/80 text-xs">
                    {[
                      { label: 'Tournament', value: successData.tournamentTitle },
                      { label: 'Squad Name', value: successData.squadName },
                      { label: 'Registration ID', value: successData.registrationId, mono: true },
                      { label: 'Team ID', value: successData.teamId, mono: true },
                      { label: 'Entry Fee Deducted', value: `৳ ${successData.entryFee.toLocaleString()}`, highlight: 'red' },
                      { label: 'Remaining Balance', value: `৳ ${successData.remainingBalance.toLocaleString()}`, highlight: 'gold' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                        <span className="text-slate-500 font-medium text-[11px] sm:text-xs">{row.label}</span>
                        <span className={`font-bold text-[11px] sm:text-xs ${row.mono ? 'font-mono text-brand-orange' : ''} ${row.highlight === 'red' ? 'text-brand-red' : ''} ${row.highlight === 'gold' ? 'text-amber-600' : 'text-slate-900'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                      <span className="text-slate-500 font-medium text-[11px] sm:text-xs">Status</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-bold uppercase flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>APPROVED / CONFIRMED</span>
                      </span>
                    </div>
                  </div>

                  {/* Room ID & Password Instant Access Card */}
                  {tournament.roomId ? (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-orange-50/80 to-amber-50/80 border border-orange-200 text-xs space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-brand-orange uppercase tracking-wider font-extrabold text-[11px]">
                          <Gamepad2 className="w-3.5 h-3.5" /> Custom Room Access Unlocked
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">LIVE READY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5 font-mono text-xs">
                        <div className="bg-white p-2 rounded-lg border border-orange-200">
                          <div className="text-[9px] uppercase font-bold text-slate-500 font-sans">Room ID</div>
                          <div className="font-black text-brand-orange text-sm tracking-wider">{tournament.roomId}</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-orange-200">
                          <div className="text-[9px] uppercase font-bold text-slate-500 font-sans">Room Password</div>
                          <div className="font-black text-slate-900 text-sm tracking-wider">{tournament.roomPassword || 'None'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-xs">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Room ID & Password Access Unlocked!
                      </div>
                      <p className="text-emerald-700 leading-relaxed text-[11px]">
                        আপনার স্লট নিশ্চিত করা হয়েছে। ম্যাচ শুরুর <strong>১০-১৫ মিনিট আগে</strong> স্বয়ংক্রিয়ভাবে রুম আইডি ও পাসওয়ার্ড পেজে দেখতে পাবেন।
                      </p>
                    </div>
                  )}

                  {/* Official Discussion / WhatsApp Community Group Link */}
                  {communityLink && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="text-xs min-w-0">
                        <div className="font-bold text-emerald-900 flex items-center gap-1 text-[11px] truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Official Discussion Group
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium truncate">Join match updates & discussions</div>
                      </div>
                      <a
                        href={communityLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all shrink-0 cursor-pointer"
                      >
                        <span>Join Group</span>
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      closeJoinModal();
                      setActiveTab('ROOM');
                    }}
                    className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-xs sm:text-sm shadow-neon-red hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Go To Room ID & Slot Table →</span>
                  </button>
                </div>
              ) : (
                /* ── REGISTRATION FORM ── */
                <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3.5">

                  {/* ── SECTION 1: Payment Method Selection ── */}
                  <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" /> Payment Currency
                      </h4>
                      {isFree && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          🎁 100% FREE ENTRY
                        </span>
                      )}
                    </div>

                    {!isFree && (
                      <div className={`grid gap-2 ${allowCoins && !isCoinOnly && requiredCash > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Wallet / Cash Button */}
                        {!isCoinOnly && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('WALLET')}
                            className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                              paymentMethod === 'WALLET'
                                ? 'border-brand-orange bg-orange-50/80 text-brand-orange shadow-2xs font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-orange-100/80 flex items-center justify-center shrink-0">
                              <Wallet className="w-3.5 h-3.5 text-brand-orange" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[11px] uppercase truncate">Wallet Cash (৳)</div>
                              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 truncate">
                                <span>Fee: <strong className="text-slate-900 font-bold">৳{requiredCash}</strong></span>
                                <span>•</span>
                                <span className="truncate">Bal: ৳{walletBalance}</span>
                              </div>
                            </div>
                          </button>
                        )}

                        {/* Coins Button */}
                        {allowCoins && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('COINS')}
                            className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                              paymentMethod === 'COINS'
                                ? 'border-amber-500 bg-amber-50/80 text-amber-700 shadow-2xs font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-amber-100/80 flex items-center justify-center shrink-0">
                              <Coins className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[11px] uppercase truncate">EZBD Coins (🪙)</div>
                              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 truncate">
                                <span>Fee: <strong className="text-amber-700 font-bold">{requiredCoins.toLocaleString()}</strong></span>
                                <span>•</span>
                                <span className="truncate">Bal: {coinBalance.toLocaleString()}</span>
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    )}

                    {!isFree && (
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center pt-1.5 border-t border-slate-200/80">
                        <div className="py-1 px-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                          <div className="text-[9px] text-slate-500 uppercase font-semibold">Balance</div>
                          <div className={`font-heading font-extrabold text-xs sm:text-sm ${paymentMethod === 'WALLET' ? 'text-brand-orange' : 'text-amber-600'}`}>
                            {paymentMethod === 'WALLET' ? `৳${walletBalance.toLocaleString()}` : `${coinBalance.toLocaleString()} 🪙`}
                          </div>
                        </div>
                        <div className="py-1 px-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                          <div className="text-[9px] text-slate-500 uppercase font-semibold">Entry Fee</div>
                          <div className="font-heading font-extrabold text-brand-red text-xs sm:text-sm">
                            {paymentMethod === 'WALLET' ? `৳${requiredCash.toLocaleString()}` : `${requiredCoins.toLocaleString()} 🪙`}
                          </div>
                        </div>
                        <div className={`py-1 px-1.5 rounded-lg border shadow-2xs ${hasSufficientBalance ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="text-[9px] text-slate-500 uppercase font-semibold">After Pay</div>
                          <div className={`font-heading font-extrabold text-xs sm:text-sm ${hasSufficientBalance ? 'text-emerald-600' : 'text-red-500'}`}>
                            {paymentMethod === 'WALLET' 
                              ? `৳${Math.max(0, walletBalance - requiredCash).toLocaleString()}`
                              : `${Math.max(0, coinBalance - requiredCoins).toLocaleString()} 🪙`
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasSufficientBalance && !isFree && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-red-50 border border-red-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px]">
                            {paymentMethod === 'COINS' 
                              ? `Need ${(requiredCoins - coinBalance).toLocaleString()} more Coins!` 
                              : `Need ৳${(requiredCash - walletBalance).toLocaleString()} more Cash!`}
                          </span>
                        </div>
                        <Link 
                          href={paymentMethod === 'COINS' ? '/ads' : '/wallet'} 
                          onClick={closeJoinModal} 
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-brand-red to-brand-orange text-white text-[10px] font-bold hover:brightness-110 transition-all shadow-xs shrink-0"
                        >
                          {paymentMethod === 'COINS' ? 'Earn Free 🪙' : 'Deposit'}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 2: Squad Information ── */}
                  {isGiveawayTournament ? (
                    /* ════════════ GIVEAWAY / 4-PLAYER SQUAD SPECIAL SECTION ════════════ */
                    <div className="space-y-3">
                      {/* Scenario 1: User has NO official squad */}
                      {userSquads.length === 0 ? (
                        <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider mb-1">
                                🎁 Giveaway Special Requirement
                              </div>
                              <h4 className="font-heading font-black text-base sm:text-lg text-slate-900 leading-tight">
                                ফুল ৪ জন প্লেয়ারের অফিশিয়াল স্কোয়াড প্রয়োজন
                              </h4>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                এই গিভওয়ে টুর্নামেন্টে রেজিস্ট্রেশন করার জন্য ওয়েবসাইটে আপনার একটি অফিশিয়াল স্কোয়াড (কমপক্ষে ৪ জন অ্যাক্টিভ মেম্বার) থাকতে হবে।
                              </p>
                            </div>
                          </div>

                          {/* Step by Step instructions */}
                          <div className="space-y-2.5 bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-xs">
                            <div className="text-[11px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> কীভাবে স্কোয়াড তৈরি ও টিম রেডি করবেন:
                            </div>
                            <div className="space-y-2 text-xs text-slate-700">
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">১</span>
                                <span>নিচের <strong>"Create Official Squad"</strong> বাটনে ক্লিক করে টিম পেইজে যান।</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">২</span>
                                <span>স্কোয়াডের নাম (Squad Name) ও ট্যাগ (Tag) দিয়ে আপনার স্কোয়াড তৈরি করুন।</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">৩</span>
                                <span>স্কোয়াডের ইনভাইট কোড দিয়ে আপনার বাকি ৩ জন সতীর্থকে (Teammates) যুক্ত করুন (মোট ৪ জন সক্রিয় সদস্য)।</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">৪</span>
                                <span>৪ জন সক্রিয় মেম্বার পূর্ণ হলে এখানে এসে স্কোয়াড সিলেক্ট করলেই ৪ জন প্লেয়ারের নাম অটোমেটিক বসে যাবে এবং স্লট কনফার্ম করতে পারবেন!</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <Link
                              href="/teams"
                              onClick={closeJoinModal}
                              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-brand-red text-white font-heading font-black text-xs sm:text-sm text-center shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
                            >
                              <Users className="w-4 h-4" />
                              <span>👉 Create Official Squad Now</span>
                            </Link>
                          </div>
                        </div>
                      ) : !isSelectedSquadEligible && eligibleSquads.length === 0 ? (
                        /* Scenario 2: User HAS squad(s) but NONE have 4 members */
                        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4 space-y-3.5">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-heading font-black text-sm text-amber-950">
                                স্কোয়াডে সদস্য সংখ্যা অপূর্ণ (Incomplete Squad)
                              </div>
                              <div className="text-xs text-amber-800 mt-0.5">
                                গিভওয়ে টুর্নামেন্টে অংশ নিতে স্কোয়াডে ন্যূনতম ৪ জন সক্রিয় প্লেয়ার থাকা আবশ্যক।
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-3 border border-amber-200 space-y-3">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-700 shrink-0">Select Squad:</span>
                              <select
                                value={selectedSquad?.id || ''}
                                onChange={(e) => {
                                  const sel = userSquads.find(s => s.id === e.target.value);
                                  if (sel) applySquadRoster(sel);
                                }}
                                className="bg-amber-50 border border-amber-300 text-xs font-bold text-slate-900 rounded-lg px-2 py-1 outline-none max-w-[200px] truncate"
                              >
                                {userSquads.map(s => {
                                  const count = (s.members || []).filter((m: any) => m.status === 'ACTIVE').length;
                                  return (
                                    <option key={s.id} value={s.id}>
                                      [{s.tag}] {s.name} ({count}/4 Members)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {selectedSquad && (
                              <div>
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                                  <span>Active Squad Roster</span>
                                  <span className="text-amber-700 font-extrabold">{selectedSquadActiveCount} / 4 Players</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${Math.min(100, (selectedSquadActiveCount / 4) * 100)}%` }}
                                  />
                                </div>
                                <div className="text-[11px] text-amber-700 font-bold mt-1.5 flex items-center gap-1">
                                  ⚠️ আরও <strong>{Math.max(0, 4 - selectedSquadActiveCount)}</strong> জন প্লেয়ারকে স্কোয়াডে যুক্ত করতে হবে।
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Link
                              href="/teams"
                              onClick={closeJoinModal}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 text-white font-bold text-xs text-center hover:bg-amber-700 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>👥 Invite Members to Squad</span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        /* Scenario 3: User has an eligible 4+ member squad */
                        <div className="rounded-xl sm:rounded-2xl border border-emerald-300 bg-emerald-50/50 p-3 sm:p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-emerald-200/80">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Verified Squad (4 Active Players)</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-emerald-800 font-bold">Selected Squad:</span>
                              <select
                                value={selectedSquad?.id || ''}
                                onChange={(e) => {
                                  const sel = userSquads.find(s => s.id === e.target.value);
                                  if (sel) applySquadRoster(sel);
                                }}
                                className="bg-white border border-emerald-400 text-xs text-emerald-950 font-bold rounded-lg px-2 py-1 outline-none shadow-2xs max-w-[180px] truncate"
                              >
                                {userSquads.map(s => {
                                  const count = (s.members || []).filter((m: any) => m.status === 'ACTIVE').length;
                                  return (
                                    <option key={s.id} value={s.id}>
                                      [{s.tag}] {s.name} ({count >= 4 ? '✅ 4 Players Ready' : `${count}/4 Members`})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                            <FieldInput label="Squad Name" value={form.squadName} onChange={setField('squadName')} readOnly badge="VERIFIED" />
                            <FieldInput label="WhatsApp Number" value={form.captainWhatsApp} onChange={setField('captainWhatsApp')} error={fieldErrors.captainWhatsApp} placeholder="017xxxxxxxx" type="tel" />

                            <FieldInput label="IGL (Leader)" value={form.iglName} onChange={setField('iglName')} readOnly badge="LOCKED" />
                            <FieldInput label="Backup Player" value={form.backupPlayerName} onChange={setField('backupPlayerName')} placeholder="Optional" required={false} />

                            <FieldInput label="Player 1" value={form.player1Name} onChange={setField('player1Name')} readOnly badge="ROSTER" />
                            <FieldInput label="Player 2" value={form.player2Name} onChange={setField('player2Name')} readOnly badge="ROSTER" />

                            <FieldInput label="Player 3" value={form.player3Name} onChange={setField('player3Name')} readOnly badge="ROSTER" />
                            <FieldInput label="Player 4" value={form.player4Name} onChange={setField('player4Name')} readOnly badge="ROSTER" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ════════════ STANDARD TOURNAMENT SQUAD SECTION ════════════ */
                    <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> Squad Information
                        </h4>

                        {userSquads.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                              <Zap className="w-3 h-3 text-amber-500" /> Auto-Fill:
                            </span>
                            <select
                              onChange={(e) => {
                                const sel = userSquads.find(s => s.id === e.target.value);
                                if (sel) applySquadRoster(sel);
                              }}
                              className="bg-white border border-amber-300 text-[10px] sm:text-xs text-slate-900 font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs max-w-[130px] sm:max-w-[180px] truncate"
                            >
                              <option value="">Select Squad...</option>
                              {userSquads.map(s => (
                                <option key={s.id} value={s.id}>[{s.tag}] {s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                        <FieldInput label="Squad Name" value={form.squadName} onChange={setField('squadName')} error={fieldErrors.squadName} placeholder="e.g. Apex Predators" />
                        <FieldInput label="WhatsApp Number" value={form.captainWhatsApp} onChange={setField('captainWhatsApp')} error={fieldErrors.captainWhatsApp} placeholder="017xxxxxxxx" type="tel" />
                        
                        <FieldInput label="IGL Name" value={form.iglName} onChange={setField('iglName')} error={fieldErrors.iglName} placeholder="In-Game Leader" />
                        <FieldInput label="Backup Player" value={form.backupPlayerName} onChange={setField('backupPlayerName')} error={fieldErrors.backupPlayerName} placeholder="Optional" required={false} />
                        
                        <FieldInput label="Player 1 Name" value={form.player1Name} onChange={setField('player1Name')} error={fieldErrors.player1Name} placeholder="Player 1 IGN" />
                        <FieldInput label="Player 2 Name" value={form.player2Name} onChange={setField('player2Name')} error={fieldErrors.player2Name} placeholder="Player 2 IGN" />
                        
                        <FieldInput label="Player 3 Name" value={form.player3Name} onChange={setField('player3Name')} error={fieldErrors.player3Name} placeholder="Player 3 IGN" />
                        <FieldInput label="Player 4 Name" value={form.player4Name} onChange={setField('player4Name')} error={fieldErrors.player4Name} placeholder="Player 4 IGN" />
                      </div>
                    </div>
                  )}

                  {/* Global submit error */}
                  {submitError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* ── SECTION 3: Buttons ── */}
                  <div className="flex gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={closeJoinModal}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 sm:py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-heading font-bold text-xs sm:text-sm hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasSufficientBalance || (isGiveawayTournament && !isSelectedSquadEligible)}
                      className="flex-[2] py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-xs sm:text-sm shadow-neon-red hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Registering…
                        </>
                      ) : isGiveawayTournament ? (
                        'CONFIRM GIVEAWAY REGISTRATION (🎁 0 ৳)'
                      ) : isFree ? (
                        'CONFIRM FREE REGISTRATION (🎁 0 ৳)'
                      ) : paymentMethod === 'COINS' ? (
                        `CONFIRM (${requiredCoins.toLocaleString()} 🪙)`
                      ) : (
                        `CONFIRM (৳ ${requiredCash})`
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          REGISTRATION DETAILS MODAL
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedRegistration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full border-2 border-red-200/90 shadow-2xl relative text-slate-900"
            >
              <div className="flex items-center justify-between bg-white border-b border-slate-100 px-6 py-4 rounded-t-3xl">
                <h3 className="font-heading font-black text-xl text-slate-900">SQUAD DETAILS</h3>
                <button onClick={() => setSelectedRegistration(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Squad Name</div>
                    <div className="text-xl font-heading font-black text-slate-900">{selectedRegistration.squadName}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                    selectedRegistration.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    selectedRegistration.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedRegistration.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Registration ID</div>
                    <div className="font-mono text-slate-900 font-bold">{selectedRegistration.registrationId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Captain WhatsApp</div>
                    <div className="font-mono text-slate-900 font-bold">{selectedRegistration.captainWhatsApp}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">In-Game Leader (IGL)</div>
                    <div className="text-brand-orange font-bold">{selectedRegistration.iglName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Player 1</div>
                    <div className="text-slate-800 font-semibold">{selectedRegistration.player1Name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Player 2</div>
                    <div className="text-slate-800 font-semibold">{selectedRegistration.player2Name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Player 3</div>
                    <div className="text-slate-800 font-semibold">{selectedRegistration.player3Name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Player 4</div>
                    <div className="text-slate-800 font-semibold">{selectedRegistration.player4Name}</div>
                  </div>
                  {selectedRegistration.backupPlayerName && (
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Backup Player</div>
                      <div className="text-brand-orange font-semibold">{selectedRegistration.backupPlayerName}</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
