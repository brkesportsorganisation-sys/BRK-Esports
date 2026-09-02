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
  Tv,
  ExternalLink,
  Eye,
  X,
  Radio,
  Medal,
  Award,
} from 'lucide-react';
import { Tournament, TournamentRoom, TournamentRoadmapConfig, TournamentStage } from '@/lib/types';
import { formatRoomLabel, generateDefaultRoadmap } from '@/lib/tournament-rooms-utils';

interface TournamentRoadmapViewProps {
  tournament: Tournament;
  rooms?: TournamentRoom[];
  roadmap?: TournamentRoadmapConfig | null;
}

export default function TournamentRoadmapView({
  tournament,
  rooms = [],
  roadmap: initialRoadmap,
}: TournamentRoadmapViewProps) {
  // Use provided roadmap or generate smart defaults
  const activeRoadmap: TournamentRoadmapConfig = useMemo(() => {
    if (initialRoadmap && initialRoadmap.stages && initialRoadmap.stages.length > 0) {
      return initialRoadmap;
    }
    if (tournament.roadmapConfig && tournament.roadmapConfig.stages && tournament.roadmapConfig.stages.length > 0) {
      return tournament.roadmapConfig;
    }
    return generateDefaultRoadmap(tournament, rooms);
  }, [initialRoadmap, tournament, rooms]);

  const stages: TournamentStage[] = activeRoadmap.stages || [];

  // Default to first LIVE stage or first stage
  const initialStageId = useMemo(() => {
    const liveStage = stages.find((s) => s.status === 'LIVE');
    if (liveStage) return liveStage.id;
    return stages[0]?.id || 'STAGE_1';
  }, [stages]);

  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId);
  const [selectedGroupForRoster, setSelectedGroupForRoster] = useState<TournamentRoom | null>(null);

  const selectedStage = useMemo(() => {
    return stages.find((s) => s.id === selectedStageId) || stages[0];
  }, [stages, selectedStageId]);

  // Filter rooms for currently selected stage
  const filteredRooms = useMemo(() => {
    if (stages.length <= 1) return rooms;

    const isFinalStage = selectedStage?.id === 'FINALS' || selectedStage?.name.toLowerCase().includes('final');
    
    const matched = rooms.filter((r) => {
      if (r.stageId) return r.stageId === selectedStageId;
      if (isFinalStage) return r.roomType === 'FINAL' || r.roomLabel.toLowerCase().includes('final');
      return r.roomType !== 'FINAL';
    });

    return matched.length > 0 ? matched : rooms;
  }, [rooms, stages, selectedStage, selectedStageId]);

  const defaultMaps = ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra'];

  const rulesList = activeRoadmap.rules && activeRoadmap.rules.length > 0 ? activeRoadmap.rules : [
    {
      stepNumber: 1,
      title: '12 Squads Per Room',
      description: 'Each custom room hosts 12 squads (48 players). Room ID & Password are time-locked and revealed dynamically only to assigned captains.',
    },
    {
      stepNumber: 2,
      title: 'Official Placement Points',
      description: '1st (Booyah): 12 pts, 2nd: 9 pts, 3rd: 8 pts, 4th: 7 pts + 1 pt per kill. AI Scoreboard vision scanner calculates standings instantly.',
    },
    {
      stepNumber: 3,
      title: 'Auto-Advancement to Finals',
      description: 'Top qualifying squads from each round auto-advance to the Championship Final Room for the grand prize pool showdown.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-200">
      {/* ─── 1. Header & Stage Pipeline Tracker ─────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                <Trophy className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-heading font-black text-white uppercase tracking-wider">
                {activeRoadmap.pipelineTitle || 'TOURNAMENT ROADMAP & SCHEDULE'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeRoadmap.pipelineSubtitle || 'Multi-Stage tournament progression pipeline, group schedules, and map rotations.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-800/60 font-bold text-xs">
              {activeRoadmap.pipelineFormat || (tournament.tournamentBatchFormat === 'QUALIFIER_FINAL' ? '🔥 Format A: Qualifier → Final' : '🛡️ Standard Tournament')}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs">
              {stages.length} {stages.length === 1 ? 'Stage' : 'Stages'}
            </span>
          </div>
        </div>

        {/* Stage Timeline Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {stages.map((stg, idx) => {
            const isSelected = selectedStage?.id === stg.id;
            return (
              <button
                key={stg.id || idx}
                onClick={() => setSelectedStageId(stg.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-purple-900/40 via-purple-950/20 to-slate-900 border-purple-500 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    STAGE {stg.stageNumber || idx + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      stg.status === 'LIVE'
                        ? 'text-red-400 animate-pulse'
                        : stg.status === 'COMPLETED'
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {stg.status === 'LIVE' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>LIVE</span>
                      </>
                    ) : stg.status === 'COMPLETED' ? (
                      '✓ DONE'
                    ) : (
                      'UPCOMING'
                    )}
                  </span>
                </div>

                <h4 className="font-heading font-black text-sm text-white truncate">
                  {stg.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {stg.subtitle || (stg.advancingPerGroup ? `Top ${stg.advancingPerGroup} Advance` : 'Match Series')}
                </p>

                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. Active Stage Banner & Details ──────────────────────────────── */}
      {selectedStage && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                ACTIVE STAGE
              </span>
              <h4 className="text-base font-heading font-black text-white uppercase tracking-wider">
                {selectedStage.name}
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              {selectedStage.subtitle || 'Scheduled group matches & map rotations for this round.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Stream Button */}
            {selectedStage.streamUrl && (
              <a
                href={selectedStage.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Watch Stage Stream</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. Groups & Matches Grid for Active Stage ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-brand-orange" />
            <h4 className="text-base font-heading font-black text-white uppercase tracking-wider">
              {selectedStage?.name || 'Match Groups'}
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredRooms.length} Custom {filteredRooms.length === 1 ? 'Room' : 'Rooms'}
          </span>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/50 space-y-3">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
            <h5 className="text-sm font-bold text-white">Groups Being Scheduled</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Custom rooms and group schedules for this stage are being finalized by tournament admins. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room, idx) => {
              const isFinal = room.roomType === 'FINAL' || room.roomLabel.toLowerCase() === 'final';
              const assignedMap = room.mapName || defaultMaps[idx % defaultMaps.length];
              const matchTimeStr = room.matchTime || selectedStage?.matchTime || tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : '');
              const participants = (room as any).participants || [];
              const capacity = room.capacity || tournament.roomCapacity || 12;
              const fillPercentage = Math.min(100, Math.round((participants.length / capacity) * 100));

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
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                          isFinal
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                        }`}
                      >
                        {isFinal ? '🏆 Championship Final Room' : formatRoomLabel(room.roomLabel, room.roomType)}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          room.status === 'LIVE'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : room.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : room.status === 'FULL'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {room.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
                        {room.status || 'SCHEDULED'}
                      </span>
                    </div>

                    {/* Match Schedule Details */}
                    <div className="mt-4 space-y-2 text-xs font-mono">
                      {/* Match Time */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <Clock className="w-3.5 h-3.5 text-purple-400" /> Match Time
                        </span>
                        <span className="font-bold text-white font-mono">
                          {matchTimeStr
                            ? new Date(matchTimeStr).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              }) +
                              ' • ' +
                              new Date(matchTimeStr).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'TBA'}
                        </span>
                      </div>

                      {/* Map Rotation */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-brand-orange" /> Map Rotation
                        </span>
                        <span className="font-bold text-brand-orange font-sans">
                          {assignedMap}
                        </span>
                      </div>

                      {/* Squads Count & Progress */}
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between font-sans">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-400" /> Squads Roster
                          </span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {participants.length || room.currentCount || 0} / {capacity}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Credentials unlock 15m before match</span>
                    </span>

                    <div className="flex items-center gap-2 ml-auto">
                      {room.streamUrl && (
                        <a
                          href={room.streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800/80 text-red-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Tv className="w-3 h-3" />
                          <span>Stream</span>
                        </a>
                      )}

                      <button
                        onClick={() => setSelectedGroupForRoster(room)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                      >
                        <Eye className="w-3 h-3 text-purple-400" />
                        <span>Squads ({participants.length})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 4. Esports Advancement Architecture & Rules ──────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-gold" />
          <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider">
            Mega Tournament Rules &amp; Advancement Architecture
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          {rulesList.map((rule, rIdx) => {
            const bgBadgeColor =
              rIdx === 0
                ? 'bg-purple-600'
                : rIdx === 1
                ? 'bg-amber-600'
                : 'bg-emerald-600';

            return (
              <div
                key={rule.stepNumber || rIdx}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full ${bgBadgeColor} text-white font-bold flex items-center justify-center text-[10px] shrink-0`}
                  >
                    {rule.stepNumber || rIdx + 1}
                  </span>
                  <span>{rule.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {rule.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Official Placement Points Matrix */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-brand-gold shrink-0" />
            <span className="font-bold text-white">Official Points System:</span>
            <span className="text-slate-400">
              1st (Booyah): 12 pts • 2nd: 9 pts • 3rd: 8 pts • 4th: 7 pts • 5th: 6 pts • 6th: 5 pts • 7th: 4 pts • 8th: 3 pts • 9th: 2 pts • 10th: 1 pt
            </span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-purple-900/60 border border-purple-700/60 text-purple-300 font-mono font-bold shrink-0 text-center">
            🔥 +1 Point Per Kill
          </div>
        </div>
      </div>

      {/* ─── 5. Squad Roster Modal ────────────────────────────────────────── */}
      {selectedGroupForRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-950 text-purple-300 border border-purple-800">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-heading font-black text-white text-base">
                    Group {selectedGroupForRoster.roomLabel} Squad Roster
                  </h3>
                  <p className="text-xs text-slate-400">
                    {(selectedGroupForRoster as any).participants?.length || 0} Registered Squads
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGroupForRoster(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Participants list */}
            {!(selectedGroupForRoster as any).participants || (selectedGroupForRoster as any).participants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No squads assigned to this group yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedGroupForRoster as any).participants.map((p: any, idx: number) => (
                  <div
                    key={p.id || idx}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <span className="text-[10px] font-mono font-bold text-purple-400 block">
                        SLOT #{p.slotNumber || idx + 1}
                      </span>
                      <div className="font-bold text-white text-xs truncate">
                        {p.squadName}
                      </div>
                      {p.iglName && (
                        <div className="text-[10px] text-slate-400 truncate">
                          IGL: {p.iglName}
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-bold text-[9px] uppercase">
                      CONFIRMED
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedGroupForRoster(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
