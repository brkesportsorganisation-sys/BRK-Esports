'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function TournamentCard({ tournament }: TournamentCardProps) {
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
  const matchDate = tournament.tournamentStart || tournament.matchTime;
  const formattedDate = matchDate ? new Date(matchDate).toISOString().split('T')[0] : '';
  const formattedTime = matchDate
    ? new Date(matchDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

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
      return { name: 'eFootball', icon: '⚽', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (g === 'PUBG_MOBILE' || tLower.includes('pubg') || tLower.includes('bgmi')) {
      return { name: 'PUBG Mobile', icon: '🪖', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (g === 'VALORANT' || tLower.includes('valorant')) {
      return { name: 'Valorant', icon: '🎯', color: 'bg-rose-50 text-rose-600 border-rose-200' };
    }
    if (g === 'MLBB' || tLower.includes('mobile legends') || tLower.includes('mlbb')) {
      return { name: 'MLBB', icon: '⚔️', color: 'bg-purple-50 text-purple-600 border-purple-200' };
    }
    if (g === 'COD_MOBILE' || tLower.includes('cod') || tLower.includes('call of duty')) {
      return { name: 'COD Mobile', icon: '💥', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (g === 'LUDO_KING' || tLower.includes('ludo')) {
      return { name: 'Ludo King', icon: '🎲', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    }
    return { name: 'Free Fire', icon: '🔥', color: 'bg-orange-50 text-brand-orange border-orange-200' };
  };

  const gameInfo = getGameBadge(tournament.game, tournament.title);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-brand-orange/50 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group"
      >
        {/* Top Banner Image (Large banner like original design) */}
        <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-slate-900">
          <img
            src={tournament.bannerImage || tournament.banner || tournament.thumbnailImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
            alt={tournament.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

          {/* Top Tag & Game Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md text-cyan-400 font-mono text-[11px] font-bold tracking-wider border border-white/10 shadow-xs">
              #{shortId}
            </span>

            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border ${gameInfo.color}`}>
                <span>{gameInfo.icon}</span>
                <span>{tournament.gameName || gameInfo.name}</span>
              </span>

              {isLive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-black text-[10px] uppercase animate-pulse shadow-xs">
                  🔴 LIVE
                </span>
              ) : isFree ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] uppercase shadow-xs">
                  🎁 FREE
                </span>
              ) : null}
            </div>
          </div>

          {/* Title & Date/Time on Banner */}
          <div className="absolute bottom-3 left-4 right-4 text-white z-10 space-y-0.5">
            <h3 className="font-heading font-black text-base sm:text-lg text-white group-hover:text-brand-orange transition-colors truncate drop-shadow-sm">
              {tournament.title} {formattedDate && <span className="text-xs font-mono text-slate-300 font-normal">({formattedDate})</span>}
            </h3>
            <p className="text-xs font-semibold text-slate-300 truncate drop-shadow-sm">
              {tournament.format?.replace('_', ' ') || 'Battle Royale'} {formattedTime && `• ${formattedTime}`}
            </p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">

        {/* 3-Column Metrics Panel: PRIZE | MODE | ENTRY */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 text-center">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PRIZE</div>
            <div className="font-heading font-black text-sm sm:text-base text-emerald-600 leading-tight truncate">
              ৳{(tournament.prizePool || 0).toLocaleString()}
            </div>
          </div>

          <div className="space-y-0.5 border-x border-slate-200/80 px-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MODE</div>
            <div className="font-heading font-black text-sm sm:text-base text-slate-900 leading-tight uppercase truncate">
              {tournament.mode || 'SQUAD'}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ENTRY</div>
            <div className="font-heading font-black text-sm sm:text-base text-brand-orange leading-tight truncate">
              {isFree ? (
                <span className="text-emerald-600">FREE</span>
              ) : tournament.entryFeeType === 'COINS' ? (
                <span>{tournament.coinEntryFee || (tournament.entryFee * 10)} 🪙</span>
              ) : (
                <span>৳{tournament.entryFee}</span>
              )}
            </div>
          </div>
        </div>

        {/* Slots & Progress Bar */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Joined: <strong className="text-slate-900 font-black">{registeredCount}</strong></span>
            <span>Slots: <strong className="text-slate-900 font-black">{maxSlots}</strong></span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/80 p-0.5">
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

        {/* 3 Quick-Action Buttons Row: SLOTS | RULES | PRIZE */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleOpenSlots}
            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-700 font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>SLOTS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('RULES')}
            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-700 font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>RULES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('PRIZE')}
            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-700 font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>PRIZE</span>
          </button>
        </div>

        {/* Primary Bottom Action Button */}
        {isFull ? (
          <button
            disabled
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-400 font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200 shadow-2xs"
          >
            <span>⛔ FULL</span>
          </button>
        ) : (
          <Link href={`/tournaments/${tournament.id}`} className="block w-full">
            <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-neon-orange transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer">
              <Zap className="w-4 h-4 fill-white animate-pulse" />
              <span>JOIN NOW</span>
            </button>
          </Link>
        )}
        </div>
      </motion.div>

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
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
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
                                {participant.iglName && (
                                  <div className="text-[10px] text-slate-300 truncate font-normal">
                                    IGL: <strong className="text-white">{participant.iglName}</strong>
                                  </div>
                                )}
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
