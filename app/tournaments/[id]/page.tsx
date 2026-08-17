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
      <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-brand-red">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-white placeholder-gray-600 bg-surface-light focus:outline-none transition-colors ${
          error ? 'border-red-500 bg-red-500/5' : 'border-surface-border focus:border-brand-orange'
        } ${mono ? 'font-mono' : ''}`}
      />
      {error && <p className="mt-1 text-[11px] text-red-400 font-semibold">{error}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Page
────────────────────────────────────────────── */
export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [tournament, setTournament] = useState<Tournament | null>(null);
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROOM'>('OVERVIEW');
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
    const loadTournament = async () => {
      try {
        const user = db.getCurrentUser();
        setCurrentUser(user);

        const response = await fetch(`/api/tournaments/${resolvedParams.id}${user ? `?userId=${user.id}` : ''}`);
        if (!response.ok) { setTournament(null); return; }
        const payload = await response.json();
        const tour = payload.tournament;
        setTournament(tour || null);
        
        const registrations = payload.userRegistrations || [];
        setMyRegistrations(registrations);

        if (tour && user) {
          if (registrations.length > 0) setIsJoined(true);
        }

        if (tour?.community?.enabled && !tour.community.isDisabled) {
          setCommunityStatus('loading');
          void fetch(`/api/tournaments/${resolvedParams.id}/community`, {
            headers: { 'x-user-id': user?.id || '' },
          })
            .then(async (communityResponse) => {
              if (!communityResponse.ok) {
                const data = await communityResponse.json().catch(() => ({}));
                setCommunityMessage(data.message || 'Community access is locked.');
                setCommunityStatus('locked');
                return;
              }
              const data = await communityResponse.json();
              setCommunityLink(data.inviteLink || '');
              setCommunityName(data.communityName || 'Official Tournament Community');
              setCommunityStatus('unlocked');
            })
            .catch(() => {
              setCommunityMessage('Community access is unavailable right now.');
              setCommunityStatus('locked');
            });
        } else {
          setCommunityStatus('disabled');
          setCommunityMessage('Community access is not enabled for this tournament.');
        }
      } catch { setTournament(null); }
    };
    void loadTournament();
  }, [resolvedParams.id]);

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <Navbar />
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-brand-red mx-auto mb-4 animate-bounce" />
          <h2 className="font-heading font-black text-3xl">Tournament Not Found</h2>
          <Link href="/tournaments" className="mt-4 inline-block text-brand-orange hover:underline font-bold">
            Back to Tournaments
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
  
  const hasSufficientWalletBalance = walletBalance >= tournament.entryFee;
  const hasSufficientCoinBalance = coinBalance >= tournament.entryFee;

  const hasSufficientBalance = paymentMethod === 'WALLET' ? hasSufficientWalletBalance : hasSufficientCoinBalance;

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
    setForm(emptyForm);
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
    if (!currentUser || isSubmitting) return;

    setSubmitError('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tournaments/${resolvedParams.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          userWalletBalance: currentUser.walletBalance,
          userCoinBalance: currentUser.coinBalance,
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
      const updatedUser = { ...currentUser };
      if (paymentMethod === 'WALLET') {
        updatedUser.walletBalance = result.remainingBalance;
      } else {
        updatedUser.coinBalance = result.remainingBalance;
      }
      db.updateUser(currentUser.id, updatedUser);
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
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
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
      <div className="relative h-80 sm:h-96 w-full overflow-hidden bg-surface-light border-b border-surface-border">
        <img
          src={tournament.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200'}
          alt={tournament.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-8">
          <Link href="/tournaments" className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface/80 hover:bg-surface-light backdrop-blur-md border border-surface-border text-xs font-bold text-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-brand-orange" />
            <span>Back to Hub</span>
          </Link>
        </div>

        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-brand-red text-white text-xs font-bold uppercase">{tournament.mode}</span>
              <span className="px-3 py-1 rounded-lg bg-brand-purple text-white text-xs font-bold uppercase shadow-neon-cyan">{tournament.format.replace('_', ' ')}</span>
              <span className="px-3 py-1 rounded-lg bg-surface/80 border border-surface-border text-xs font-bold text-brand-gold uppercase flex items-center gap-2">
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
            <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-white">{tournament.title}</h1>
          </div>

          <div className="bg-surface-light/90 backdrop-blur-md p-4 rounded-2xl border border-surface-border flex items-center space-x-4 shrink-0">
            <div>
              <div className="text-[10px] text-gray-300 font-bold uppercase">Prize Pool</div>
              <div className="text-2xl font-heading font-extrabold text-brand-gold">৳ {tournament.prizePool.toLocaleString()}</div>
            </div>

            {isLive ? (
              <button className="px-6 py-3 rounded-xl bg-brand-red text-white font-heading font-bold text-sm shadow-neon-red flex items-center space-x-2">
                <Flame className="w-5 h-5 animate-pulse" />
                <span>MATCH IS LIVE</span>
              </button>
            ) : isFinished ? (
              <button className="px-6 py-3 rounded-xl bg-gray-800 text-gray-300 font-heading font-bold text-sm cursor-not-allowed">
                FINISHED
              </button>
            ) : isFull ? (
              <button className="px-6 py-3 rounded-xl bg-gray-800 text-gray-300 font-heading font-bold text-sm cursor-not-allowed">SLOTS FULL</button>
            ) : (
              <button
                onClick={openJoinModal}
                className={`px-6 py-3 rounded-xl text-white font-heading font-bold text-sm shadow-neon-red hover:scale-105 transition-all flex items-center space-x-2 ${isJoined ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-neon-cyan' : 'bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold'}`}
              >
                {isJoined ? <Check className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                <span>{isJoined ? 'REGISTER ANOTHER SQUAD' : 'JOIN'} (৳{tournament.entryFee})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">

        {/* Tabs */}
        <div className="flex items-center space-x-2 border-b border-surface-border overflow-x-auto pb-1">
          {(['OVERVIEW', 'ROOM'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-heading font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab
                  ? tab === 'ROOM'
                    ? 'bg-brand-purple text-white shadow-neon-cyan'
                    : 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red'
                  : tab === 'ROOM'
                    ? 'text-brand-cyan hover:bg-brand-purple/20'
                    : 'text-gray-300 hover:text-white'
              }`}
            >
              {tab === 'ROOM' && <Lock className="w-4 h-4 inline mr-1" />}
              {tab === 'OVERVIEW' && 'Overview'}
              {tab === 'ROOM' && 'Room ID & Password'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-surface-border">
                <div 
                  className="prose prose-invert prose-brand max-w-none"
                  dangerouslySetInnerHTML={{ __html: tournament.description }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-surface-border space-y-4">
                <h3 className="font-heading font-bold text-lg text-white border-b border-surface-border pb-3">Match Details</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-light">
                    <span className="text-gray-300 font-bold uppercase">Format</span>
                    <span className="font-bold text-brand-cyan">{tournament.format.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-light">
                    <span className="text-gray-300 font-bold uppercase">Mode</span>
                    <span className="font-bold text-brand-orange">{tournament.mode}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-light">
                    <span className="text-gray-300 font-bold uppercase">Match Schedule</span>
                    <span className="font-bold text-white">{new Date(tournament.tournamentStart || tournament.matchTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-light">
                    <span className="text-gray-300 font-bold uppercase">Slots Registered</span>
                    <span className="font-bold text-brand-gold">{tournament.registeredCount} / {tournament.maxTeams} Teams</span>
                  </div>
                </div>
              </div>

              {myRegistrations.length > 0 && (
                <div className="glass-card rounded-2xl p-6 border border-brand-orange/40 bg-brand-orange/5 space-y-4">
                  <h3 className="font-heading font-bold text-lg text-white border-b border-brand-orange/20 pb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-brand-orange" /> My Registered Squads ({myRegistrations.length})
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {myRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        onClick={() => setSelectedRegistration(reg)}
                        className="p-3 rounded-xl bg-surface-light border border-surface-border flex items-center justify-between cursor-pointer hover:border-brand-orange/50 hover:bg-surface-border transition-colors"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{reg.squadName}</div>
                          <div className="text-[10px] text-gray-300 font-mono mt-0.5">ID: {reg.registrationId}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          reg.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          reg.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {reg.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass-card rounded-2xl border border-surface-border bg-slate-900/70 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-brand-cyan">
                  <ShieldCheck className="h-4 w-4" /> Private Community Access
                </div>
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  {communityStatus === 'loading' ? (
                    <div className="text-sm text-slate-400">Checking access permissions…</div>
                  ) : communityStatus === 'disabled' ? (
                    <div className="text-sm text-slate-400">{communityMessage}</div>
                  ) : communityStatus === 'unlocked' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400"><Unlock className="h-4 w-4" /> Community Unlocked</div>
                      <div className="text-sm text-slate-300">{communityName}</div>
                      <button onClick={() => void handleOpenCommunity()} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white">Join Official Community</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-400"><Lock className="h-4 w-4" /> Community Locked</div>
                      <div className="text-sm text-slate-300">{communityMessage}</div>
                      <div className="text-sm text-slate-300">Community Locked</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROOM & 12-SLOT GRID TAB */}
        {activeTab === 'ROOM' && (
          <div className="space-y-6">
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
        )}

      </main>

      {/* ═══════════════════════════════════════════
          JOIN TOURNAMENT MODAL (Redesigned)
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="glass-card rounded-3xl max-w-2xl w-full border-2 border-brand-orange/40 shadow-cyber overflow-y-auto max-h-[92vh] relative"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/95 backdrop-blur-md border-b border-surface-border px-6 py-4">
                <div>
                  <h3 className="font-heading font-black text-xl text-white">JOIN TOURNAMENT</h3>
                  <div className="text-xs text-brand-orange font-semibold truncate max-w-[280px]">{tournament.title}</div>
                </div>
                <button onClick={closeJoinModal} className="w-9 h-9 rounded-xl bg-surface-light hover:bg-surface-border text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── SUCCESS SCREEN ── */}
              {successData ? (
                <div className="p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-9 h-9 text-green-400" />
                    </div>
                    <h4 className="font-heading font-black text-2xl text-white">Registration Successful!</h4>
                    <p className="text-sm text-gray-400">You have successfully registered for this tournament.</p>
                  </div>

                  <div className="rounded-2xl border border-surface-border bg-surface-light divide-y divide-surface-border text-sm">
                    {[
                      { label: 'Tournament', value: successData.tournamentTitle },
                      { label: 'Squad Name', value: successData.squadName },
                      { label: 'Registration ID', value: successData.registrationId, mono: true },
                      { label: 'Team ID', value: successData.teamId, mono: true },
                      { label: 'Entry Fee Deducted', value: `৳ ${successData.entryFee.toLocaleString()}`, highlight: 'red' },
                      { label: 'Remaining Balance', value: `৳ ${successData.remainingBalance.toLocaleString()}`, highlight: 'gold' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-gray-400 font-semibold">{row.label}</span>
                        <span className={`font-bold ${row.mono ? 'font-mono text-brand-cyan' : ''} ${row.highlight === 'red' ? 'text-brand-red' : ''} ${row.highlight === 'gold' ? 'text-brand-gold' : 'text-white'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-gray-400 font-semibold">Status</span>
                      <span className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold uppercase">Pending Admin Approval</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 text-center">
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
                  <div className="rounded-2xl border border-surface-border bg-surface-light/50 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5" /> Tournament Description
                    </h4>
                    <div
                      className="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: tournament.description }}
                    />
                  </div>

                  {/* ── SECTION 2: Payment Method Selection ── */}
                  <div className="rounded-2xl border border-surface-border bg-surface-light/50 p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5" /> Payment Method
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('WALLET')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          paymentMethod === 'WALLET'
                            ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                            : 'border-surface-border bg-surface hover:bg-surface-light text-gray-300'
                        }`}
                      >
                        <Wallet className="w-6 h-6" />
                        <div className="font-bold text-xs uppercase">Wallet (Tk)</div>
                        <div className="text-[10px]">Bal: ৳{walletBalance}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COINS')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          paymentMethod === 'COINS'
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                            : 'border-surface-border bg-surface hover:bg-surface-light text-gray-300'
                        }`}
                      >
                        <Coins className="w-6 h-6" />
                        <div className="font-bold text-xs uppercase">Coins</div>
                        <div className="text-[10px]">Bal: {coinBalance}</div>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-surface-border/50">
                      <div className="p-3 rounded-xl bg-surface/80 border border-surface-border">
                        <div className="text-[10px] text-gray-300 uppercase font-bold mb-1">Your Balance</div>
                        <div className={`font-heading font-extrabold text-lg ${paymentMethod === 'WALLET' ? 'text-brand-orange' : 'text-yellow-500'}`}>
                          {paymentMethod === 'WALLET' ? `৳ ${walletBalance.toLocaleString()}` : coinBalance.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface/80 border border-surface-border">
                        <div className="text-[10px] text-gray-300 uppercase font-bold mb-1">Entry Fee</div>
                        <div className="font-heading font-extrabold text-brand-red text-lg">
                          {paymentMethod === 'WALLET' ? `৳ ${tournament.entryFee.toLocaleString()}` : tournament.entryFee.toLocaleString()}
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl border ${hasSufficientBalance ? 'bg-surface/80 border-surface-border' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="text-[10px] text-gray-300 uppercase font-bold mb-1">After Payment</div>
                        <div className={`font-heading font-extrabold text-lg ${hasSufficientBalance ? 'text-emerald-400' : 'text-red-400'}`}>
                          {paymentMethod === 'WALLET' 
                            ? `৳ ${Math.max(0, walletBalance - tournament.entryFee).toLocaleString()}`
                            : Math.max(0, coinBalance - tournament.entryFee).toLocaleString()
                          }
                        </div>
                      </div>
                    </div>

                    {!hasSufficientBalance && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-400">
                          <AlertCircle className="w-4 h-4" /> Insufficient Balance
                        </div>
                        <Link href="/wallet" onClick={closeJoinModal} className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white text-xs font-bold hover:brightness-110 transition-all">
                          Deposit Wallet
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 3: Squad Information ── */}
                  <div className="rounded-2xl border border-surface-border bg-surface-light/50 p-4 space-y-4">
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
                  <div className="rounded-2xl border border-surface-border bg-surface-light/50 p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" /> Captain Contact
                    </h4>
                    <FieldInput label="WhatsApp Number" value={form.captainWhatsApp} onChange={setField('captainWhatsApp')} error={fieldErrors.captainWhatsApp} placeholder="e.g. 01712345678" type="tel" />
                  </div>

                  {/* Global submit error */}
                  {submitError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
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
                      className="flex-1 py-3.5 rounded-2xl bg-surface-light border border-surface-border text-gray-300 font-heading font-bold text-sm hover:bg-surface-border transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasSufficientBalance}
                      className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Registering…
                        </>
                      ) : (
                        `CONFIRM REGISTRATION (৳${tournament.entryFee})`
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="glass-card rounded-3xl max-w-md w-full border-2 border-brand-orange/40 shadow-cyber relative"
            >
              <div className="flex items-center justify-between bg-surface/95 backdrop-blur-md border-b border-surface-border px-6 py-4 rounded-t-3xl">
                <h3 className="font-heading font-black text-xl text-white">SQUAD DETAILS</h3>
                <button onClick={() => setSelectedRegistration(null)} className="w-8 h-8 rounded-xl bg-surface-light hover:bg-surface-border text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-surface-border">
                  <div>
                    <div className="text-xs text-gray-300 font-bold uppercase tracking-wider">Squad Name</div>
                    <div className="text-xl font-heading font-black text-white">{selectedRegistration.squadName}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    selectedRegistration.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedRegistration.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedRegistration.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-gray-300 font-bold uppercase">Registration ID</div>
                    <div className="font-mono text-white">{selectedRegistration.registrationId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-300 font-bold uppercase">Captain WhatsApp</div>
                    <div className="font-mono text-white">{selectedRegistration.captainWhatsApp}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-gray-300 font-bold uppercase">In-Game Leader (IGL)</div>
                    <div className="text-brand-cyan font-bold">{selectedRegistration.iglName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-300 font-bold uppercase">Player 1</div>
                    <div className="text-white">{selectedRegistration.player1Name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-300 font-bold uppercase">Player 2</div>
                    <div className="text-white">{selectedRegistration.player2Name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-300 font-bold uppercase">Player 3</div>
                    <div className="text-white">{selectedRegistration.player3Name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-300 font-bold uppercase">Player 4</div>
                    <div className="text-white">{selectedRegistration.player4Name}</div>
                  </div>
                  {selectedRegistration.backupPlayerName && (
                    <div className="col-span-2">
                      <div className="text-[10px] text-gray-300 font-bold uppercase">Backup Player</div>
                      <div className="text-brand-orange">{selectedRegistration.backupPlayerName}</div>
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
