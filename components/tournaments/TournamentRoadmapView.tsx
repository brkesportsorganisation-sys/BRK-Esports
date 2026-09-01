'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Flame,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Gamepad2,
} from 'lucide-react';
import { Tournament, TournamentRoom } from '@/lib/types';

interface TournamentRoadmapViewProps {
  tournament: Tournament;
  rooms?: TournamentRoom[];
}

interface StageInfo {
  id: string;
  name: string;
  subtitle: string;
  totalSquads: number;
  groupsCount: number;
  advancingPerGroup: number;
  totalAdvancing: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
}

export default function TournamentRoadmapView({
  tournament,
  rooms = [],
}: TournamentRoadmapViewProps) {
  const [selectedStage, setSelectedStage] = useState<string>('ROUND_1');
  const [selectedGroupModal, setSelectedGroupModal] = useState<TournamentRoom | null>(null);

  const isMultiStage = tournament.tournamentBatchFormat === 'QUALIFIER_FINAL';
  const totalSlots = tournament.maxTeams || 288;

  // Derive dynamic multi-stage roadmap stages based on total slots
  const stages: StageInfo[] = useMemo(() => {
    if (!isMultiStage) {
      return [
        {
          id: 'ROUND_1',
          name: 'Main Tournament Lobby',
          subtitle: 'Single / Independent Groups',
          totalSquads: tournament.registeredCount || 0,
          groupsCount: Math.max(1, rooms.length),
          advancingPerGroup: 0,
          totalAdvancing: 1,
          status: tournament.status === 'LIVE' ? 'LIVE' : tournament.status === 'FINISHED' ? 'COMPLETED' : 'UPCOMING',
        },
      ];
    }

    // Format A Multi-Stage Pipeline
    const r1Groups = Math.max(1, Math.ceil(totalSlots / 12));
    const r1Adv = tournament.defaultAdvancementCount || 3;
    const r2Squads = r1Groups * r1Adv;
    const r2Groups = Math.max(1, Math.ceil(r2Squads / 12));
    const r3Squads = r2Groups * 4;
    const r3Groups = Math.max(1, Math.ceil(r3Squads / 12));

    return [
      {
        id: 'ROUND_1',
        name: 'Round 1: Qualifiers',
        subtitle: `${r1Groups} Groups • Top ${r1Adv} Advance`,
        totalSquads: totalSlots,
        groupsCount: r1Groups,
        advancingPerGroup: r1Adv,
        totalAdvancing: r2Squads,
        status: tournament.status === 'RUNNING' || tournament.status === 'LIVE' ? 'LIVE' : 'UPCOMING',
      },
      ...(r2Squads > 12
        ? [
            {
              id: 'ROUND_2',
              name: 'Round 2: Quarter-Finals',
              subtitle: `${r2Groups} Groups • Top 4 Advance`,
              totalSquads: r2Squads,
              groupsCount: r2Groups,
              advancingPerGroup: 4,
              totalAdvancing: Math.min(24, r3Squads),
              status: 'UPCOMING' as const,
            },
          ]
        : []),
      ...(r2Squads > 12 && r3Squads > 12
        ? [
            {
              id: 'ROUND_3',
              name: 'Round 3: Semi-Finals',
              subtitle: `${r3Groups} Groups • Top 6 Advance`,
              totalSquads: 24,
              groupsCount: 2,
              advancingPerGroup: 6,
              totalAdvancing: 12,
              status: 'UPCOMING' as const,
            },
          ]
        : []),
      {
        id: 'FINALS',
        name: 'Grand Finals 🏆',
        subtitle: '12 Finalist Squads • Championship Match Series',
        totalSquads: 12,
        groupsCount: 1,
        advancingPerGroup: 1,
        totalAdvancing: 1,
        status: tournament.status === 'FINISHED' ? 'COMPLETED' : 'UPCOMING',
      },
    ];
  }, [tournament, rooms, isMultiStage, totalSlots]);

  // Maps assigned sequentially
  const defaultMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─── 1. Header & Stage Tracker ─────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                <Trophy className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-heading font-black text-white uppercase tracking-wider">
                TOURNAMENT ROADMAP &amp; SCHEDULE
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-Stage tournament progression pipeline, group schedules, and map rotations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-800/60 font-bold text-xs">
              {isMultiStage ? '🔥 Format A: Qualifier → Final' : '🛡️ Standard Tournament'}
            </span>
          </div>
        </div>

        {/* Stage Timeline Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {stages.map((stg, idx) => {
            const isSelected = selectedStage === stg.id;
            return (
              <button
                key={stg.id}
                onClick={() => setSelectedStage(stg.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-purple-900/40 to-slate-900 border-purple-500 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    STAGE {idx + 1}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    stg.status === 'LIVE' ? 'text-red-400 animate-pulse' : stg.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {stg.status === 'LIVE' ? '🔴 LIVE' : stg.status === 'COMPLETED' ? '✓ DONE' : 'UPCOMING'}
                  </span>
                </div>

                <h4 className="font-heading font-black text-sm text-white truncate">
                  {stg.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {stg.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. Groups & Matches Grid for Active Stage ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-brand-orange" />
            <h4 className="text-base font-heading font-black text-white uppercase tracking-wider">
              {stages.find(s => s.id === selectedStage)?.name || 'Match Groups'}
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {rooms.length} Active Custom Rooms
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/50 space-y-3">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
            <h5 className="text-sm font-bold text-white">Groups Being Scheduled</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Custom rooms and group schedules are being finalized by tournament admins. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, idx) => {
              const isFinal = room.roomType === 'FINAL' || room.roomLabel === 'Final';
              const assignedMap = defaultMaps[idx % defaultMaps.length];
              const matchTimeStr = room.matchTime || tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : '');
              const participants = (room as any).participants || [];

              return (
                <div
                  key={room.id}
                  className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between space-y-4 ${
                    isFinal
                      ? 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/60 shadow-xl'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        isFinal
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                      }`}>
                        {isFinal ? '🏆 Grand Final Room' : `Group ${room.roomLabel}`}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        room.status === 'LIVE' ? 'bg-red-950 text-red-400 border border-red-800' :
                        room.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {room.status || 'SCHEDULED'}
                      </span>
                    </div>

                    {/* Match Schedule Details */}
                    <div className="mt-4 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <Clock className="w-3.5 h-3.5 text-purple-400" /> Match Time
                        </span>
                        <span className="font-bold text-white">
                          {matchTimeStr ? new Date(matchTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-brand-orange" /> Map Rotation
                        </span>
                        <span className="font-bold text-brand-orange font-sans">
                          {assignedMap}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <Users className="w-3.5 h-3.5 text-emerald-400" /> Squads
                        </span>
                        <span className="font-bold text-emerald-400">
                          {participants.length || room.currentCount || 0} / {room.capacity || 12} Squads
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-purple-400" /> Credentials unlock 15m before match
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. Esports Progression Explainer ─────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-gold" />
          <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider">
            Mega Tournament Rules &amp; Advancement Architecture
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">1</span>
              <span>12 Squads Per Room</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Each custom room hosts 12 squads (48 players). Room ID &amp; Password are time-locked and revealed dynamically only to assigned captains.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">2</span>
              <span>Official Placement Points</span>
            </div>
            <p className="text-[11px] text-slate-400">
              1st (Booyah): 12 pts, 2nd: 9 pts, 3rd: 8 pts, 4th: 7 pts + 1 pt per kill. AI Scoreboard vision scanner calculates standings instantly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">3</span>
              <span>Auto-Advancement to Finals</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Top qualifying squads from each round auto-advance to the Championship Final Room for the grand prize pool showdown.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
