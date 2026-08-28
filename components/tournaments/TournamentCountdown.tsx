'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Flame, CheckCircle, AlertCircle } from 'lucide-react';
import { Tournament, TournamentStatus } from '@/lib/types';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';

interface TournamentCountdownProps {
  tournament: Partial<Tournament>;
  variant?: 'card' | 'hero' | 'pill';
  className?: string;
}

export default function TournamentCountdown({
  tournament,
  variant = 'card',
  className = '',
}: TournamentCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentStatus: TournamentStatus = getDynamicTournamentStatus(tournament);

  // 1. Calculate Registration Open Time
  const regStartTime = tournament.registrationStart
    ? new Date(tournament.registrationStart).getTime()
    : 0;

  // 2. Calculate Registration Close / Deadline Time
  const regEndTime = tournament.registrationEnd
    ? new Date(tournament.registrationEnd).getTime()
    : tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).getTime()
    : tournament.tournamentStart
    ? new Date(tournament.tournamentStart).getTime()
    : tournament.matchTime
    ? new Date(tournament.matchTime).getTime()
    : 0;

  // Determine countdown mode
  const isPending = currentStatus === 'PENDING' || tournament.status === 'PENDING';
  const isOpening = !isPending && (currentStatus === 'UPCOMING' || (regStartTime > 0 && now < regStartTime));
  const isClosing = !isPending && !isOpening && (currentStatus === 'RUNNING' || (regEndTime > 0 && now < regEndTime));

  const targetTime = isOpening
    ? (regStartTime > 0 ? regStartTime : regEndTime)
    : isClosing
    ? regEndTime
    : 0;

  const diffMs = Math.max(0, targetTime - now);

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // SSR or unmounted fallback
  if (!mounted) {
    return null;
  }

  // If match finished, cancelled or no timer target available
  if (currentStatus === 'FINISHED' || currentStatus === 'CANCELLED' || (!isOpening && !isClosing) || diffMs <= 0) {
    if (currentStatus === 'LIVE') {
      return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 font-bold text-xs ${className}`}>
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span>🔴 MATCH IS LIVE</span>
        </div>
      );
    }
    return null;
  }

  // ─────────────── VARIANT 1: CARD COMPACT PILL ───────────────
  if (variant === 'card') {
    if (isOpening) {
      return (
        <div className={`w-full py-1.5 px-2.5 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-between text-[11px] font-mono font-bold text-blue-900 shadow-2xs ${className}`}>
          <span className="flex items-center gap-1 font-heading text-[10px] text-blue-800 font-black uppercase tracking-wider">
            <Clock className="w-3 h-3 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Opens In:</span>
          </span>
          <span className="tracking-tight text-blue-950 font-black">
            {days > 0 ? `${days}d ` : ''}{String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
          </span>
        </div>
      );
    }

    return (
      <div className={`w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-orange-400/40 flex items-center justify-between text-[11px] font-mono font-bold text-orange-950 shadow-2xs ${className}`}>
        <span className="flex items-center gap-1 font-heading text-[10px] text-orange-800 font-black uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
          <span>Closes In:</span>
        </span>
        <span className="tracking-tight text-orange-950 font-black">
          {days > 0 ? `${days}d ` : ''}{String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
        </span>
      </div>
    );
  }

  // ─────────────── VARIANT 2: HERO DETAILED TILES ───────────────
  if (variant === 'hero') {
    return (
      <div className={`bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 text-white shadow-xl space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <span className={`flex items-center gap-1.5 ${isOpening ? 'text-blue-400' : 'text-amber-400'}`}>
            {isOpening ? (
              <Clock className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
            ) : (
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            )}
            <span className="font-heading font-black">
              {isOpening ? '⏳ REGISTRATION OPENS IN' : '🔥 REGISTRATION CLOSES IN'}
            </span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-semibold">
            LIVE TIMER
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60 shadow-xs">
            <div className="text-xl sm:text-2xl font-heading font-black text-white font-mono">{String(days).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Days</div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60 shadow-xs">
            <div className="text-xl sm:text-2xl font-heading font-black text-amber-300 font-mono">{String(hours).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hours</div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60 shadow-xs">
            <div className="text-xl sm:text-2xl font-heading font-black text-amber-300 font-mono">{String(minutes).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mins</div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/60 shadow-xs">
            <div className={`text-xl sm:text-2xl font-heading font-black font-mono animate-pulse ${isOpening ? 'text-blue-300' : 'text-emerald-400'}`}>
              {String(seconds).padStart(2, '0')}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Secs</div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────── VARIANT 3: PILL ───────────────
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
      isOpening
        ? 'bg-blue-50 text-blue-700 border border-blue-300'
        : 'bg-orange-50 text-orange-700 border border-orange-300'
    } ${className}`}>
      {isOpening ? <Clock className="w-3.5 h-3.5 text-blue-600" /> : <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse" />}
      <span>{isOpening ? 'Opens in: ' : 'Closes in: '}</span>
      <strong>{days > 0 ? `${days}d ` : ''}{String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s</strong>
    </span>
  );
}
