'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, Flame, ShieldAlert, Award } from 'lucide-react';
import { Tournament, TournamentStatus } from '@/lib/types';
import { getDynamicTournamentStatus } from '@/lib/tournament-utils';

interface TournamentCardProps {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
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

  const progressPercent = Math.min(100, Math.round((tournament.registeredCount / tournament.maxTeams) * 100));

  const formatMatchTime = (isoString: string) => {
    if (!isoString) return 'TBA';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayTime = tournament.tournamentStart || tournament.matchTime;


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
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>

        {/* Hidden decorative badges and status labels */}

        {/* Hidden decorative badges and status labels */}
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-heading font-extrabold text-xl text-slate-900 group-hover:text-brand-orange transition-colors line-clamp-1">
            {tournament.title}
          </h3>
          <p className="text-slate-600 text-xs mt-1 line-clamp-2 leading-relaxed">
            {tournament.description}
          </p>
        </div>

        {/* Extra details hidden from public card view */}

        <Link href={`/tournaments/${tournament.id}`} className="block w-full">
          <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-bold text-sm shadow-neon-orange hover:shadow-neon-red transition-all flex items-center justify-center space-x-2">
            <Trophy className="w-4 h-4" />
            <span>VIEW TOURNAMENT</span>
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
