'use client';

import React, { useState, useEffect, use } from 'react';
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
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import SlotGrid from '@/components/tournaments/SlotGrid';
import { useRealtimeTournament } from '@/lib/use-realtime';
import { getTournamentByIdFromDb } from '@/lib/tournament-store';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';
import { Tournament, User as UserType } from '@/lib/types';
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-brand-red">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 bg-[#F8FAFC] focus:bg-white focus:outline-none transition-colors ${
          error ? 'border-red-500 bg-red-50/50' : 'border-slate-200 focus:border-brand-orange'
        } ${mono ? 'font-mono font-semibold' : ''}`}
      />
      {error && <p className="mt-1 text-[11px] text-red-500 font-semibold">{error}</p>}
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
  const [currentStatus, setCurrentStatus] = useState<'DRAFT' | 'UPCOMING' | 'LIVE' | 'FINISHED' | 'CANCELLED'>('DRAFT');
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!tournament) return;
    
    if (tournament.status === 'CANCELLED' || tournament.status === 'DRAFT' || tournament.isPaused) {
      setCurrentStatus(tournament.isPaused ? 'DRAFT' : tournament.status);
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

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    const loadTournament = async () => {
      try {
        setLoading(true);
        const user = db.getCurrentUser();
        if (isMounted) setCurrentUser(user);

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
      setTournament((prev) => prev ? { ...prev, registeredCount: prev.registeredCount + 1 } : prev);
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
              <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-brand-gold uppercase flex items-center gap-2">
                {currentStatus === 'LIVE' ? (
                  <span className="flex items-center gap-1 text-brand-red animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-brand-red animate-ping"></span>🔴 LIVE NOW
                  </span>
                ) : currentStatus === 'UPCOMING' ? (
                  <>
                    <span className="text-brand-orange">UPCOMING</span>
                    {countdown && <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded border border-brand-orange/30 shadow-neon-orange">Starts In: {countdown}</span>}
                  </>
                ) : (
                  currentStatus
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
            ) : isFull ? (
              <button className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-slate-200 text-slate-500 font-heading font-bold text-sm sm:text-base cursor-not-allowed">SLOTS FULL</button>
            ) : (
              <button
                onClick={openJoinModal}
                className={`px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl text-white font-heading font-black text-sm sm:text-base shadow-neon-red hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 cursor-pointer ${isJoined ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-neon-cyan' : 'bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold'}`}
              >
                {isJoined ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />}
                <span>{isJoined ? 'REGISTER ANOTHER SQUAD' : 'JOIN'} (৳{tournament.entryFee})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">

        {/* Tabs - Room ID & Password positioned on the LEFT as the primary tab */}
        <div className="flex items-center space-x-3 border-b border-slate-200 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('ROOM')}
            className={`px-6 py-3 rounded-2xl font-heading font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
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
            className={`px-6 py-3 rounded-2xl font-heading font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
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
              <SlotGrid
                tournamentId={tournament.id}
                tournamentTitle={tournament.title}
                gameMode={tournament.mode}
                maxTeams={tournament.maxTeams || 12}
                participants={(tournament as any).participants || []}
                roomId={tournament.roomId}
                roomPassword={tournament.roomPassword}
                startTime={tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined)}
                isUserRegistered={isJoined || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'}
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
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-heading font-black text-xl text-slate-900">JOIN TOURNAMENT</h3>
                  <div className="text-xs text-brand-orange font-semibold truncate max-w-[280px]">{tournament.title}</div>
                </div>
                <button onClick={closeJoinModal} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── SUCCESS SCREEN ── */}
              {successData ? (
                <div className="p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-9 h-9 text-green-600" />
                    </div>
                    <h4 className="font-heading font-black text-2xl text-slate-900">Registration Successful!</h4>
                    <p className="text-sm text-slate-600">You have successfully registered for this tournament.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-200 text-sm">
                    {[
                      { label: 'Tournament', value: successData.tournamentTitle },
                      { label: 'Squad Name', value: successData.squadName },
                      { label: 'Registration ID', value: successData.registrationId, mono: true },
                      { label: 'Team ID', value: successData.teamId, mono: true },
                      { label: 'Entry Fee Deducted', value: `৳ ${successData.entryFee.toLocaleString()}`, highlight: 'red' },
                      { label: 'Remaining Balance', value: `৳ ${successData.remainingBalance.toLocaleString()}`, highlight: 'gold' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-500 font-semibold">{row.label}</span>
                        <span className={`font-bold ${row.mono ? 'font-mono text-brand-orange' : ''} ${row.highlight === 'red' ? 'text-brand-red' : ''} ${row.highlight === 'gold' ? 'text-amber-600' : 'text-slate-900'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-slate-500 font-semibold">Status</span>
                      <span className="px-3 py-1 rounded-full bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs font-bold uppercase">Pending Admin Approval</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-800 text-center">
                    📋 Your registration is under review. You will gain access to Room ID & Password once approved.
                  </div>

                  <button
                    onClick={closeJoinModal}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all"
                  >
                    Go To Tournament →
                  </button>
                </div>
              ) : (
                /* ── REGISTRATION FORM ── */
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                  {/* ── SECTION 1: Tournament Description ── */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 min-w-0 w-full overflow-hidden">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 shrink-0" /> Tournament Description
                    </h4>
                    <div
                      className="text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none min-w-0 w-full break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_*]:!bg-transparent [&_*]:!text-slate-800 [&_p]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto [&_table]:overflow-x-auto [&_table]:block [&_img]:max-w-full [&_img]:h-auto"
                      dangerouslySetInnerHTML={{ __html: tournament.description }}
                    />
                  </div>

                  {/* ── SECTION 2: Payment Method Selection ── */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5" /> Payment Currency
                      </h4>
                      {isFree && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          🎁 100% FREE ENTRY
                        </span>
                      )}
                    </div>

                    {!isFree && (
                      <div className={`grid gap-3 ${allowCoins && !isCoinOnly && requiredCash > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Wallet / Cash Button */}
                        {!isCoinOnly && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('WALLET')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              paymentMethod === 'WALLET'
                                ? 'border-brand-orange bg-orange-50 text-brand-orange shadow-xs font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <Wallet className="w-5 h-5" />
                            <div className="font-bold text-xs uppercase">Wallet Cash (৳)</div>
                            <div className="text-[11px] font-bold text-slate-900">Fee: ৳{requiredCash}</div>
                            <div className="text-[10px] text-slate-500">Your Bal: ৳{walletBalance}</div>
                          </button>
                        )}

                        {/* Coins Button */}
                        {allowCoins && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('COINS')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              paymentMethod === 'COINS'
                                ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-xs font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <Coins className="w-5 h-5 text-amber-500" />
                            <div className="font-bold text-xs uppercase">BRK Coins (🪙)</div>
                            <div className="text-[11px] font-bold text-amber-700">Fee: {requiredCoins.toLocaleString()} 🪙</div>
                            <div className="text-[10px] text-slate-500">Your Bal: {coinBalance.toLocaleString()} 🪙</div>
                          </button>
                        )}
                      </div>
                    )}

                    {!isFree && (
                      <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-slate-200">
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Your Balance</div>
                          <div className={`font-heading font-extrabold text-sm sm:text-base ${paymentMethod === 'WALLET' ? 'text-brand-orange' : 'text-amber-600'}`}>
                            {paymentMethod === 'WALLET' ? `৳ ${walletBalance.toLocaleString()}` : `${coinBalance.toLocaleString()} 🪙`}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Entry Fee</div>
                          <div className="font-heading font-extrabold text-brand-red text-sm sm:text-base">
                            {paymentMethod === 'WALLET' ? `৳ ${requiredCash.toLocaleString()}` : `${requiredCoins.toLocaleString()} 🪙`}
                          </div>
                        </div>
                        <div className={`p-3 rounded-xl border shadow-2xs ${hasSufficientBalance ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">After Payment</div>
                          <div className={`font-heading font-extrabold text-sm sm:text-base ${hasSufficientBalance ? 'text-emerald-600' : 'text-red-500'}`}>
                            {paymentMethod === 'WALLET' 
                              ? `৳ ${Math.max(0, walletBalance - requiredCash).toLocaleString()}`
                              : `${Math.max(0, coinBalance - requiredCoins).toLocaleString()} 🪙`
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasSufficientBalance && !isFree && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            {paymentMethod === 'COINS' 
                              ? `Need ${(requiredCoins - coinBalance).toLocaleString()} more Coins!` 
                              : `Need ৳${(requiredCash - walletBalance).toLocaleString()} more Cash!`}
                          </span>
                        </div>
                        <Link 
                          href={paymentMethod === 'COINS' ? '/ads' : '/wallet'} 
                          onClick={closeJoinModal} 
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white text-xs font-bold hover:brightness-110 transition-all shadow-xs"
                        >
                          {paymentMethod === 'COINS' ? 'Earn Free Coins 🪙' : 'Deposit Wallet'}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 3: Squad Information ── */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Squad Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <FieldInput label="Squad Name" value={form.squadName} onChange={setField('squadName')} error={fieldErrors.squadName} placeholder="e.g. Apex Predators" />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldInput label="IGL Name" value={form.iglName} onChange={setField('iglName')} error={fieldErrors.iglName} placeholder="In-Game Leader name" />
                      </div>
                      <FieldInput label="Player 1 Name" value={form.player1Name} onChange={setField('player1Name')} error={fieldErrors.player1Name} placeholder="Player 1 IGN" />
                      <FieldInput label="Player 2 Name" value={form.player2Name} onChange={setField('player2Name')} error={fieldErrors.player2Name} placeholder="Player 2 IGN" />
                      <FieldInput label="Player 3 Name" value={form.player3Name} onChange={setField('player3Name')} error={fieldErrors.player3Name} placeholder="Player 3 IGN" />
                      <FieldInput label="Player 4 Name" value={form.player4Name} onChange={setField('player4Name')} error={fieldErrors.player4Name} placeholder="Player 4 IGN" />
                      <div className="sm:col-span-2">
                        <FieldInput label="Backup Player Name" value={form.backupPlayerName} onChange={setField('backupPlayerName')} error={fieldErrors.backupPlayerName} placeholder="Optional" required={false} />
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 5: Captain Contact ── */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" /> Captain Contact
                    </h4>
                    <FieldInput label="WhatsApp Number" value={form.captainWhatsApp} onChange={setField('captainWhatsApp')} error={fieldErrors.captainWhatsApp} placeholder="e.g. 01712345678" type="tel" />
                  </div>

                  {/* Global submit error */}
                  {submitError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* ── SECTION 6: Buttons ── */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeJoinModal}
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-heading font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasSufficientBalance}
                      className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Registering…
                        </>
                      ) : isFree ? (
                        'CONFIRM FREE REGISTRATION (🎁 0 ৳)'
                      ) : paymentMethod === 'COINS' ? (
                        `CONFIRM REGISTRATION (${requiredCoins.toLocaleString()} 🪙 COINS)`
                      ) : (
                        `CONFIRM REGISTRATION (৳ ${requiredCash})`
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
