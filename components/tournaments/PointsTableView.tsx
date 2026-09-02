'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Flame, Shield, Award, Medal, CheckCircle2, ChevronRight, Eye, Sparkles, Filter, Layers, Gamepad2 } from 'lucide-react';
import { Tournament, TournamentPointsTable, TournamentRoom } from '@/lib/types';

interface PointsTableViewProps {
  tournament: Tournament;
  rooms?: TournamentRoom[];
  pointsTables: TournamentPointsTable[];
  defaultAdvancementCount?: number;
}

export default function PointsTableView({
  tournament,
  rooms = [],
  pointsTables = [],
  defaultAdvancementCount = 3,
}: PointsTableViewProps) {
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [selectedMatch, setSelectedMatch] = useState<string>('ALL');

  // Available stages from points tables
  const availableStages = useMemo(() => {
    const stagesSet = new Set<string>();
    pointsTables.forEach(t => {
      if (t.stage) stagesSet.add(t.stage);
    });
    return Array.from(stagesSet);
  }, [pointsTables]);

  // Available room options
  const availableRooms = useMemo(() => {
    if (rooms && rooms.length > 0) return rooms;
    const uniqueLabels = Array.from(new Set(pointsTables.map(t => t.roomLabel || 'A')));
    return uniqueLabels.map(label => ({
      id: `room_${label}`,
      roomLabel: label,
      roomType: label === 'Final' ? 'FINAL' : 'STANDALONE',
    })) as TournamentRoom[];
  }, [rooms, pointsTables]);

  // Available matches
  const availableMatches = useMemo(() => {
    const matchNums = Array.from(new Set(pointsTables.map(t => t.matchNumber || 1)));
    return matchNums.sort((a, b) => a - b);
  }, [pointsTables]);

  // Filtered points tables based on stage, room, match
  const filteredTables = useMemo(() => {
    return pointsTables.filter(t => {
      if (selectedStage !== 'ALL' && t.stage !== selectedStage) return false;
      if (selectedRoomId !== 'ALL' && t.roomId !== selectedRoomId && t.roomLabel !== selectedRoomId) return false;
      if (selectedMatch !== 'ALL' && String(t.matchNumber) !== selectedMatch) return false;
      return true;
    });
  }, [pointsTables, selectedStage, selectedRoomId, selectedMatch]);

  // Aggregated Overall Standings for the selected view
  const displayScores = useMemo(() => {
    if (filteredTables.length === 1) {
      return (filteredTables[0].scores || []).map(s => ({
        ...s,
        roomLabel: filteredTables[0].roomLabel || 'A',
        stage: filteredTables[0].stage || 'Match',
      }));
    }

    // Merge and sort all squad scores across matching tables
    const squadMap = new Map<string, any>();

    filteredTables.forEach(t => {
      (t.scores || []).forEach(s => {
        const key = s.teamName.toLowerCase().trim();
        if (!squadMap.has(key)) {
          squadMap.set(key, {
            ...s,
            roomLabel: t.roomLabel || 'A',
            stage: t.stage || 'Match',
            matchesPlayed: 1,
          });
        } else {
          const existing = squadMap.get(key);
          existing.placementPoints = (existing.placementPoints || 0) + (s.placementPoints || 0);
          existing.kills = (existing.kills || 0) + (s.kills || 0);
          existing.killPoints = (existing.killPoints || 0) + (s.killPoints || 0);
          existing.totalPoints = (existing.totalPoints || 0) + (s.totalPoints || 0);
          existing.booyah = existing.booyah || s.booyah;
          existing.matchesPlayed = (existing.matchesPlayed || 1) + 1;
        }
      });
    });

    return Array.from(squadMap.values()).sort((a, b) => {
      const diffPoints = (b.totalPoints || 0) - (a.totalPoints || 0);
      if (diffPoints !== 0) return diffPoints;
      const diffPlacement = (b.placementPoints || 0) - (a.placementPoints || 0);
      if (diffPlacement !== 0) return diffPlacement;
      return (b.kills || 0) - (a.kills || 0);
    });
  }, [filteredTables]);

  const topAdvancement = tournament.defaultAdvancementCount || defaultAdvancementCount || 3;
  const isFormatA = tournament.tournamentBatchFormat === 'QUALIFIER_FINAL';

  return (
    <div className="space-y-6 animate-fadeIn text-slate-200">
      {/* ─── 1. Header & Multi-Dimension Filter Matrix ────────────────────── */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-brand-gold animate-pulse" />
              <h3 className="text-lg font-heading font-black text-white uppercase tracking-wider">
                Official Match Points Table &amp; Standings
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Official placement points (1st: 12, 2nd: 9, 3rd: 8, 4th: 7...) + 1 point per Kill.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-800/60 font-bold">
              {pointsTables.length} Match {pointsTables.length === 1 ? 'Table' : 'Tables'} Published
            </span>
          </div>
        </div>

        {/* Filter Toolbar: Stage, Room, Match */}
        <div className="pt-2 border-t border-slate-800/80 grid gap-3 sm:grid-cols-3">
          {/* 1. Stage Selector */}
          {availableStages.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Stage / Round:</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">🏆 All Stages</option>
                {availableStages.map(stg => (
                  <option key={stg} value={stg}>{stg}</option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Room / Group Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Room / Group:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="ALL">🌐 Overall (All Groups)</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.roomType === 'FINAL' || room.roomLabel.toLowerCase() === 'final' ? '🏆 Final Room' : `Group ${room.roomLabel}`}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Match # Selector */}
          {availableMatches.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Match:</label>
              <select
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">🔥 All Matches Combined</option>
                {availableMatches.map(m => (
                  <option key={m} value={String(m)}>Match #{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. Top 3 Podium Highlights ──────────────────────────────────── */}
      {displayScores.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* #2 Runner Up */}
          {displayScores[1] && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-lg text-center relative overflow-hidden order-2 sm:order-1">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono font-bold">
                RANK #2
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-700/60 border border-slate-500 mx-auto flex items-center justify-center text-slate-300 mb-2">
                <Medal className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-black text-sm text-white truncate">
                {displayScores[1].teamName}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
                <span className="text-slate-400">Pts: <strong className="text-white">{displayScores[1].placementPoints}</strong></span>
                <span className="text-slate-400">Kills: <strong className="text-red-400">{displayScores[1].kills}</strong></span>
                <span className="text-slate-300 font-bold">Total: <strong className="text-brand-gold text-sm">{displayScores[1].totalPoints}</strong></span>
              </div>
            </div>
          )}

          {/* #1 Booyah Champion */}
          {displayScores[0] && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden order-1 sm:order-2 transform sm:-translate-y-1">
              <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> BOOYAH!
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 mx-auto flex items-center justify-center text-amber-400 mb-2 shadow-md shadow-amber-500/20">
                <Trophy className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-black text-base text-amber-400 truncate">
                {displayScores[0].teamName}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
                <span className="text-slate-400">Pts: <strong className="text-white">{displayScores[0].placementPoints}</strong></span>
                <span className="text-slate-400">Kills: <strong className="text-red-400">{displayScores[0].kills}</strong></span>
                <span className="text-amber-300 font-bold">Total: <strong className="text-brand-gold text-base">{displayScores[0].totalPoints}</strong></span>
              </div>
            </div>
          )}

          {/* #3 3rd Place */}
          {displayScores[2] && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-lg text-center relative overflow-hidden order-3">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-700/60 text-amber-400 text-[10px] font-mono font-bold">
                RANK #3
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-800 mx-auto flex items-center justify-center text-amber-500 mb-2">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-black text-sm text-white truncate">
                {displayScores[2].teamName}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
                <span className="text-slate-400">Pts: <strong className="text-white">{displayScores[2].placementPoints}</strong></span>
                <span className="text-slate-400">Kills: <strong className="text-red-400">{displayScores[2].kills}</strong></span>
                <span className="text-slate-300 font-bold">Total: <strong className="text-brand-gold text-sm">{displayScores[2].totalPoints}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Full Points Table ────────────────────────────────────────── */}
      {displayScores.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/50 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Points Table Not Published Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Matches are currently in progress or upcoming. The official points table and standings will be published here right after the match concludes.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Rank</th>
                  <th className="px-4 py-3.5 w-24">Group / Round</th>
                  <th className="px-4 py-3.5">Squad Name</th>
                  <th className="px-4 py-3.5 text-center">Placement Pts</th>
                  <th className="px-4 py-3.5 text-center">Kill Pts</th>
                  <th className="px-4 py-3.5 text-center">Total Score</th>
                  {isFormatA && <th className="px-4 py-3.5 text-right">Advancement</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {displayScores.map((score, index) => {
                  const rank = index + 1;
                  const isBooyah = rank === 1 || score.booyah;
                  const isQualifying = isFormatA && rank <= topAdvancement;

                  return (
                    <tr
                      key={`${score.teamName}-${index}`}
                      className={`transition-colors ${
                        isBooyah
                          ? 'bg-amber-500/10 hover:bg-amber-500/15'
                          : isQualifying
                          ? 'bg-purple-950/20 hover:bg-purple-950/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="px-4 py-3 text-center font-black">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-black font-bold">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-800 text-white font-bold">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-sm">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Group / Round Label */}
                      <td className="px-4 py-3 text-[11px] font-sans">
                        <span className="font-bold text-purple-400 block">
                          Group {score.roomLabel || 'A'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {score.stage || 'Match'}
                        </span>
                      </td>

                      {/* Squad Name */}
                      <td className="px-4 py-3 font-bold text-white font-sans text-sm">
                        <div className="flex items-center gap-2">
                          <span>{score.teamName}</span>
                          {isBooyah && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                              🏆 Booyah
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Placement Pts */}
                      <td className="px-4 py-3 text-center font-bold text-slate-300">
                        {score.placementPoints || 0}
                      </td>

                      {/* Kill Pts */}
                      <td className="px-4 py-3 text-center font-bold text-red-400">
                        {score.kills || score.killPoints || 0}
                      </td>

                      {/* Total Score */}
                      <td className="px-4 py-3 text-center font-black text-amber-400 text-sm">
                        {score.totalPoints || 0}
                      </td>

                      {/* Advancement Status for Format A */}
                      {isFormatA && (
                        <td className="px-4 py-3 text-right">
                          {isQualifying ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-bold text-[10px] uppercase font-sans">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Qualified</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px] font-sans">
                              Eliminated
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
