'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Clock, Flame, ShieldCheck, Zap, X, Check, FileText, Gift, Award, Coins } from 'lucide-react';
import { Tournament, TournamentStatus } from '@/lib/types';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';
import { useLanguage } from '@/lib/language-context';

interface Participant {
  id?: string;
  squadName?: string;
  iglName?: string;
  userId?: string;
  captainWhatsApp?: string;
}

interface TournamentCardProps {
  tournament: Tournament;
  /** Set true for the first card (above-the-fold LCP image) */
  priority?: boolean;
}

function stripHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default function TournamentCard({ tournament, priority = false }: TournamentCardProps) {
  const { t, isBangla } = useLanguage();
  const [activeModal, setActiveModal] = useState<'NONE' | 'SLOTS' | 'RULES' | 'PRIZE'>('NONE');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const registeredCount = tournament.registeredCount || 0;
  const maxSlots = tournament.maxTeams || 12;
  const isFull = registeredCount >= maxSlots;
  const isFree = tournament.entryFee === 0 && (!tournament.coinEntryFee || tournament.coinEntryFee === 0);
  const percentFilled = Math.min(100, Math.round((registeredCount / maxSlots) * 100));

  const currentStatus = getDynamicTournamentStatus(tournament);
  const isLive = currentStatus === 'LIVE';

  // Short ID tag e.g. #BXR7D
  const shortId = (tournament.id || 'TOUR')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 5)
    .toUpperCase();

  // Match date formatted
  const [formattedDate, setFormattedDate] = useState('');
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    const matchDate = tournament.tournamentStart || tournament.matchTime;
    if (matchDate) {
      const d = new Date(matchDate);
      setFormattedDate(d.toISOString().split('T')[0]);
      setFormattedTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [tournament.tournamentStart, tournament.matchTime]);

  // Calculate default prize distribution or use dynamic prizeDistribution list
  const firstPrize = tournament.firstPrize || Math.round((tournament.prizePool || 0) * 0.5) || 0;
  const secondPrize = tournament.secondPrize || Math.round((tournament.prizePool || 0) * 0.3) || 0;
  const thirdPrize = tournament.thirdPrize || Math.round((tournament.prizePool || 0) * 0.2) || 0;
  const perKillPrize = tournament.perKillPrize || 0;

  const prizeTiers = (tournament.prizeDistribution && tournament.prizeDistribution.length > 0)
    ? tournament.prizeDistribution
    : [
        { rank: 1, label: '1st Place (Champion)', prize: firstPrize },
        ...(secondPrize > 0 ? [{ rank: 2, label: '2nd Place (Runner-up)', prize: secondPrize }] : []),
        ...(thirdPrize > 0 ? [{ rank: 3, label: '3rd Place', prize: thirdPrize }] : []),
      ];

  // Load participants seamlessly in the background when SLOTS modal opens
  const handleOpenSlots = () => {
    setActiveModal('SLOTS');
    if (tournament.id) {
      fetch(`/api/tournaments/${tournament.id}`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          const list = data?.tournament?.participants || data?.participants || [];
          if (list.length > 0) {
            setParticipants(list);
          }
        })
        .catch(err => console.warn('Failed to load slots participants:', err));
    }
  };

  // Game badge logic
  const getGameBadge = (game?: string, title?: string) => {
    const g = (game || '').toUpperCase();
    const tLower = (title || '').toLowerCase();

    if (g === 'EFOOTBALL' || tLower.includes('efootball') || tLower.includes('pes')) {
      return { name: 'eFootball', icon: '⚽', color: 'bg-slate-900/95 text-sky-400 border-sky-500/40 shadow-xs' };
    }
    if (g === 'PUBG_MOBILE' || tLower.includes('pubg') || tLower.includes('bgmi')) {
      return { name: 'PUBG Mobile', icon: '🪖', color: 'bg-slate-900/95 text-amber-300 border-amber-500/40 shadow-xs' };
    }
    if (g === 'VALORANT' || tLower.includes('valorant')) {
      return { name: 'Valorant', icon: '🎯', color: 'bg-slate-900/95 text-rose-400 border-rose-500/40 shadow-xs' };
    }
    if (g === 'MLBB' || tLower.includes('mobile legends') || tLower.includes('mlbb')) {
      return { name: 'MLBB', icon: '⚔️', color: 'bg-slate-900/95 text-purple-300 border-purple-500/40 shadow-xs' };
    }
    if (g === 'COD_MOBILE' || tLower.includes('cod') || tLower.includes('call of duty')) {
      return { name: 'COD Mobile', icon: '💥', color: 'bg-slate-900/95 text-emerald-400 border-emerald-500/40 shadow-xs' };
    }
    if (g === 'LUDO_KING' || tLower.includes('ludo')) {
      return { name: 'Ludo King', icon: '🎲', color: 'bg-slate-900/95 text-indigo-300 border-indigo-500/40 shadow-xs' };
    }
    return { name: 'Free Fire', icon: '🔥', color: 'bg-slate-900/95 text-amber-400 border-amber-500/40 shadow-xs' };
  };

  const gameInfo = getGameBadge(tournament.game, tournament.title);

  return (
    <>
      <div
        className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-brand-orange/50 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group"
      >
        {/* Top Banner Image - Full Size & Uncropped */}
        <div className="relative w-full aspect-[4/3] min-h-[250px] sm:min-h-[275px] overflow-hidden bg-slate-950">
          <Image
            src={tournament.bannerImage || tournament.banner || tournament.thumbnailImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
            alt={tournament.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          {/* Subtle top shade for badges */}
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Top Tag & Game Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-md text-cyan-400 font-mono text-[10px] font-bold tracking-wider border border-white/15 shadow-xs">
              #{shortId}
            </span>

            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border backdrop-blur-md ${gameInfo.color}`}>
                <span className="text-xs">{gameInfo.icon}</span>
                <span>{tournament.gameName || gameInfo.name}</span>
              </span>

              {isLive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-black text-[9px] uppercase animate-pulse shadow-xs">
                  🔴 LIVE
                </span>
              ) : currentStatus === 'PENDING' ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[9px] uppercase shadow-xs">
                  🟡 PENDING
                </span>
              ) : currentStatus === 'UPCOMING' ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-black text-[9px] uppercase shadow-xs">
                  🔵 UPCOMING
                </span>
              ) : currentStatus === 'FINISHED' ? (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-white font-black text-[9px] uppercase shadow-xs">
                  🏁 FINISHED
                </span>
              ) : (tournament.isGiveaway || tournament.requiresFullSquad || tournament.title?.toLowerCase().includes('giveaway')) ? (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] uppercase shadow-xs flex items-center gap-1">
                  🎁 4P SQUAD
                </span>
              ) : isFree ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[9px] uppercase shadow-xs">
                  🎁 FREE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[9px] uppercase shadow-xs">
                  🟢 RUNNING
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card Body - Ultra Compact & Slim Layout */}
        <div className="p-3 sm:p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
          {/* Tournament Title & Schedule Info */}
          <div className="space-y-0.5" suppressHydrationWarning>
            <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 group-hover:text-brand-orange transition-colors line-clamp-1">
              {tournament.title}
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                {tournament.format?.replace('_', ' ') || 'Battle Royale'}
              </span>
              {(formattedTime || formattedDate) && (
                <span className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                  <Clock className="w-3 h-3 text-brand-orange shrink-0" />
                  <span>{formattedTime} {formattedDate && `(${formattedDate})`}</span>
                </span>
              )}
            </div>
          </div>

          {/* 3-Column Metrics Panel: PRIZE | MODE | ENTRY (Compact) */}
          <div className="grid grid-cols-3 gap-1.5 p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-center">
            <div className="space-y-0.2">
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">PRIZE</div>
              <div className="font-heading font-black text-xs sm:text-sm text-emerald-700 leading-tight truncate">
                ৳{(tournament.prizePool || 0).toLocaleString()}
              </div>
            </div>

            <div className="space-y-0.2 border-x border-slate-200/80 px-0.5">
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">MODE</div>
              <div className="font-heading font-black text-xs sm:text-sm text-slate-950 leading-tight uppercase truncate">
                {tournament.mode || 'SQUAD'}
              </div>
            </div>

            <div className="space-y-0.2">
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">ENTRY</div>
              <div className="font-heading font-black text-xs sm:text-sm text-orange-900 leading-tight truncate">
                {isFree ? (
                  <span className="text-emerald-700">FREE</span>
                ) : tournament.entryFeeType === 'COINS' ? (
                  <span>{tournament.coinEntryFee || (tournament.entryFee * 10)} 🪙</span>
                ) : (
                  <span>৳{tournament.entryFee}</span>
                )}
              </div>
            </div>
          </div>

          {/* Slots & Progress Bar (Slim) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>Joined: <strong className="text-slate-950 font-black">{registeredCount}</strong></span>
              <span>Slots: <strong className="text-slate-950 font-black">{maxSlots}</strong></span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFull
                    ? 'bg-red-500'
                    : percentFilled > 75
                      ? 'bg-gradient-to-r from-amber-500 to-red-500'
                      : 'bg-gradient-to-r from-cyan-500 via-brand-orange to-brand-red'
                  }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          {/* 3 Quick-Action Buttons Row: SLOTS | RULES | PRIZE (Compact) */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={handleOpenSlots}
              className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200/90 text-slate-800 font-heading font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>SLOTS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('RULES')}
              className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200/90 text-slate-800 font-heading font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>RULES</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('PRIZE')}
              className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200/90 text-slate-800 font-heading font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>PRIZE</span>
            </button>
          </div>

          {/* Primary Bottom Action Button */}
          {isFull ? (
            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 shadow-2xs"
            >
              <span>⛔ FULL</span>
            </button>
          ) : currentStatus === 'PENDING' ? (
            <Link href={`/tournaments/${tournament.id}`} className="block w-full">
              <button className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border border-amber-300 font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>PENDING</span>
              </button>
            </Link>
          ) : currentStatus === 'UPCOMING' ? (
            <Link href={`/tournaments/${tournament.id}`} className="block w-full">
              <button className="w-full py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 border border-blue-300 font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>UPCOMING</span>
              </button>
            </Link>
          ) : currentStatus === 'FINISHED' ? (
            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 shadow-2xs"
            >
              <span>🏁 FINISHED</span>
            </button>
          ) : isLive ? (
            <Link href={`/tournaments/${tournament.id}`} className="block w-full">
              <button className="w-full py-2.5 rounded-xl bg-red-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse">
                <span>🔴 MATCH LIVE</span>
              </button>
            </Link>
          ) : (
            <Link href={`/tournaments/${tournament.id}`} className="block w-full">
              <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-neon-orange transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer">
                <Zap className="w-3.5 h-3.5 fill-white animate-pulse" />
                <span>JOIN NOW</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS (Slot List, Prize Pool Breakdown, Rules)                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeModal !== 'NONE' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl max-w-md w-full relative max-h-[85vh] flex flex-col space-y-4 overflow-hidden"
            >
              {/* Close Icon on Top Right */}
              <button
                type="button"
                onClick={() => setActiveModal('NONE')}
                aria-label="Close modal"
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 1. SLOTS MODAL */}
              {activeModal === 'SLOTS' && (
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="text-center space-y-1">
                    <h3 className="font-heading font-black text-lg text-slate-900 flex items-center justify-center gap-2">
                      <span>📋</span>
                      <span className="text-brand-orange">SLOT LIST</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      {registeredCount} of {maxSlots} slots occupied
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Array.from({ length: maxSlots }, (_, i) => {
                        const slotNum = i + 1;
                        const participant = participants[i];
                        const isOccupied = Boolean(participant);

                        return (
                          <div
                            key={slotNum}
                            className={`p-2.5 rounded-xl border text-xs transition-colors ${
                              isOccupied
                                ? 'bg-slate-900 text-white border-slate-800 shadow-2xs'
                                : 'bg-slate-50 text-slate-400 border-dashed border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-mono text-[10px] font-black text-brand-orange">
                                SLOT #{slotNum}
                              </span>
                              {isOccupied ? (
                                <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-0.5">
                                  <span>✅</span> <span>CONFIRMED</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400">OPEN</span>
                              )}
                            </div>
                            
                            {isOccupied ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-white text-xs truncate">
                                  {participant.squadName || (participant as any).name || 'Registered Squad'}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-[11px] font-semibold">
                                Empty Slot
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModal('NONE')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              )}

              {/* 2. PRIZE BREAKDOWN MODAL */}
              {activeModal === 'PRIZE' && (
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="text-center space-y-1">
                    <h3 className="font-heading font-black text-lg text-slate-900 flex items-center justify-center gap-2">
                      <span>🏆</span>
                      <span className="text-brand-orange">PRIZE BREAKDOWN</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Total Prize Pool: <strong className="text-emerald-600 font-black">৳{(tournament.prizePool || 0).toLocaleString()}</strong>
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 divide-y divide-slate-200/60 custom-scrollbar text-xs font-bold text-slate-800">
                    {prizeTiers.map((tier, idx) => {
                      const medal = tier.rank === 1 ? '🥇' : tier.rank === 2 ? '🥈' : tier.rank === 3 ? '🥉' : '🎖️';
                      const labelColor = tier.rank === 1 ? 'text-amber-600' : tier.rank === 2 ? 'text-slate-600' : tier.rank === 3 ? 'text-amber-700' : 'text-slate-800';
                      return (
                        <div key={idx} className={`flex items-center justify-between ${idx === 0 ? 'pt-1' : 'pt-2.5'}`}>
                          <span className={`flex items-center gap-1.5 font-black ${labelColor}`}>
                            <span>{medal}</span> {tier.label || `${tier.rank}th Place`}
                          </span>
                          <span className="font-heading font-black text-sm text-slate-900">৳{(tier.prize || 0).toLocaleString()}</span>
                        </div>
                      );
                    })}

                    {perKillPrize > 0 && (
                      <div className="flex items-center justify-between pt-2.5">
                        <span className="flex items-center gap-1.5 text-rose-600 font-black">
                          <span>🎯</span> Per Kill Bounty (MVP)
                        </span>
                        <span className="font-heading font-black text-sm text-rose-600">৳{perKillPrize.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModal('NONE')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              )}

              {/* 3. RULES MODAL */}
              {activeModal === 'RULES' && (
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="text-center space-y-1">
                    <h3 className="font-heading font-black text-lg text-slate-900 flex items-center justify-center gap-2">
                      <span>📜</span>
                      <span className="text-brand-orange">RULES & OVERVIEW</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold truncate">
                      {tournament.title}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 custom-scrollbar text-xs">
                    <div className="grid grid-cols-2 gap-2 text-slate-700 font-semibold border-b border-slate-200 pb-2">
                      <div>Mode: <strong className="text-slate-900">{tournament.mode || 'SQUAD'}</strong></div>
                      <div>Format: <strong className="text-slate-900">{tournament.format?.replace('_', ' ') || 'BR'}</strong></div>
                      <div>Entry: <strong className="text-slate-900">{isFree ? 'FREE' : `৳${tournament.entryFee}`}</strong></div>
                      <div>Pool: <strong className="text-emerald-600">৳{tournament.prizePool}</strong></div>
                    </div>

                    <div
                      className="prose prose-xs max-w-none text-slate-800 leading-relaxed break-words whitespace-pre-wrap [&_*]:!bg-transparent [&_*]:!text-slate-850 [&_p]:!bg-transparent [&_p]:!text-slate-850 [&_span]:!bg-transparent [&_span]:!text-slate-850 [&_div]:!bg-transparent [&_strong]:!text-slate-900 [&_b]:!text-slate-900"
                      dangerouslySetInnerHTML={{ __html: tournament.description || 'Standard competitive fair-play rules apply.' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModal('NONE')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
