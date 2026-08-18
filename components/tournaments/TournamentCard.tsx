'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, Flame, ShieldAlert, Award } from 'lucide-react';
import { Tournament, TournamentStatus } from '@/lib/types';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';
import { useLanguage } from '@/lib/language-context';

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
  const { t } = useLanguage();
  const isFree = tournament.entryFee === 0;
  const isFull = tournament.registeredCount >= tournament.maxTeams;

  // Use dynamic status computed on frontend
  const [currentStatus, setCurrentStatus] = useState<TournamentStatus>(
    getDynamicTournamentStatus(tournament)
  );
  
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    // If it's overridden or finished, no need to tick
    if (tournament.status === 'CANCELLED' || tournament.status === 'DRAFT' || tournament.isPaused) {
      setCurrentStatus(tournament.isPaused ? 'DRAFT' : tournament.status);
      return;
    }

    const startTimeStr = tournament.tournamentStart || tournament.matchTime;
    const startTime = startTimeStr ? new Date(startTimeStr).getTime() : 0;
    
    if (startTime === 0) return;

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

  const isLive = currentStatus === 'LIVE';
  const isCompleted = currentStatus === 'FINISHED' || currentStatus === 'CANCELLED';
  const isUpcoming = currentStatus === 'UPCOMING';

  const getGameBadge = (game?: string, title?: string) => {
    const g = (game || '').toUpperCase();
    const t = (title || '').toLowerCase();

    if (g === 'EFOOTBALL' || t.includes('efootball') || t.includes('pes')) {
      return { name: 'eFootball', icon: '⚽', color: 'bg-blue-600/90 text-white border-blue-400/40 shadow-blue-500/20' };
    }
    if (g === 'PUBG_MOBILE' || t.includes('pubg') || t.includes('bgmi')) {
      return { name: 'PUBG Mobile', icon: '🪖', color: 'bg-amber-600/90 text-white border-amber-400/40 shadow-amber-500/20' };
    }
    if (g === 'VALORANT' || t.includes('valorant')) {
      return { name: 'Valorant', icon: '🎯', color: 'bg-rose-600/90 text-white border-rose-400/40 shadow-rose-500/20' };
    }
    if (g === 'MLBB' || t.includes('mobile legends') || t.includes('mlbb')) {
      return { name: 'MLBB', icon: '⚔️', color: 'bg-purple-600/90 text-white border-purple-400/40 shadow-purple-500/20' };
    }
    if (g === 'COD_MOBILE' || t.includes('cod') || t.includes('call of duty')) {
      return { name: 'COD Mobile', icon: '💥', color: 'bg-emerald-600/90 text-white border-emerald-400/40 shadow-emerald-500/20' };
    }
    if (g === 'LUDO_KING' || t.includes('ludo')) {
      return { name: 'Ludo King', icon: '🎲', color: 'bg-indigo-600/90 text-white border-indigo-400/40 shadow-indigo-500/20' };
    }
    return { name: 'Free Fire', icon: '🔥', color: 'bg-orange-600/90 text-white border-orange-400/40 shadow-orange-500/20' };
  };

  const gameInfo = getGameBadge(tournament.game, tournament.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl overflow-hidden flex flex-col justify-between relative group border border-slate-200 hover:border-brand-orange/50 transition-all duration-300 shadow-sm hover:shadow-lg"
    >
      {/* Banner & Badges Overlay */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-50">
        <img
          src={tournament.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
          alt={tournament.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-black/30"></div>

        {/* Game Badge on Top-Left */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wide backdrop-blur-md border shadow-md ${gameInfo.color}`}>
            <span>{gameInfo.icon}</span>
            <span>{tournament.gameName || gameInfo.name}</span>
          </span>
        </div>

        {/* Status / Entry Badge on Top-Right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {isFree ? (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-600/90 text-white font-black text-[10px] uppercase backdrop-blur-md border border-emerald-400/40 shadow-md">
              🎁 FREE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-black/60 text-amber-400 font-black text-[10px] uppercase backdrop-blur-md border border-amber-400/40 shadow-md">
              ৳{tournament.entryFee}
            </span>
          )}

          {isLive ? (
            <span className="px-2.5 py-1 rounded-xl bg-brand-red text-white font-black text-[10px] uppercase animate-pulse border border-red-400/50 shadow-md">
              🔴 LIVE
            </span>
          ) : isUpcoming ? (
            <span className="px-2 py-1 rounded-xl bg-slate-900/80 text-white font-black text-[10px] uppercase backdrop-blur-md border border-slate-700">
              🕒 UPCOMING
            </span>
          ) : null}
        </div>

        {/* Mode Tag on Bottom-Left */}
        <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 text-slate-200 text-[10px] font-extrabold uppercase backdrop-blur-md">
            {tournament.mode}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 text-brand-gold text-[10px] font-extrabold uppercase backdrop-blur-md">
            Pool: ৳{tournament.prizePool.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-heading font-extrabold text-lg text-slate-900 group-hover:text-brand-orange transition-colors line-clamp-1">
            {tournament.title}
          </h3>
          <p className="text-slate-600 text-xs mt-1 line-clamp-2 leading-relaxed">
            {stripHtml(tournament.description)}
          </p>
        </div>

        <Link href={`/tournaments/${tournament.id}`} className="block w-full">
          <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-bold text-sm shadow-neon-orange hover:shadow-neon-red transition-all flex items-center justify-center space-x-2 cursor-pointer">
            <Trophy className="w-4 h-4" />
            <span>{t('view_details', 'VIEW TOURNAMENT')}</span>
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
