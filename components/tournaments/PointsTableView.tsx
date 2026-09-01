'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Flame, Shield, Award, Medal, CheckCircle2, ChevronRight, Eye, Sparkles } from 'lucide-react';
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
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');

  // Available room options
  const availableRooms = useMemo(() => {
    if (rooms && rooms.length > 0) return rooms;
    // Derive from points tables if rooms not passed
    const uniqueLabels = Array.from(new Set(pointsTables.map(t => t.roomLabel || 'A')));
    return uniqueLabels.map(label => ({
      id: `room_${label}`,
      roomLabel: label,
      roomType: label === 'Final' ? 'FINAL' : 'STANDALONE',
    })) as TournamentRoom[];
  }, [rooms, pointsTables]);

  // Filtered points tables for selected tab
  const activeTables = useMemo(() => {
    if (selectedRoomId === 'ALL') return pointsTables;
    return pointsTables.filter(t => t.roomId === selectedRoomId || t.roomLabel === selectedRoomId);
  }, [pointsTables, selectedRoomId]);

  // Aggregated Overall Standings when "ALL" is selected
  const overallScores = useMemo(() => {
    if (selectedRoomId !== 'ALL') {
      const single = activeTables[0];
      return single?.scores || [];
    }

    // Merge and sort all squad scores across all rooms
    const allScores: any[] = [];
    pointsTables.forEach(t => {
      (t.scores || []).forEach(s => {
        allScores.push({
          ...s,
          roomLabel: t.roomLabel || 'A',
        });
      });
    });

    // Sort by totalPoints desc, then placementPoints desc, then kills desc
    return allScores.sort((a, b) => {
      const diffPoints = (b.totalPoints || 0) - (a.totalPoints || 0);
      if (diffPoints !== 0) return diffPoints;
      const diffPlacement = (b.placementPoints || 0) - (a.placementPoints || 0);
      if (diffPlacement !== 0) return diffPlacement;
      return (b.kills || 0) - (a.kills || 0);
    });
  }, [pointsTables, selectedRoomId, activeTables]);

  const topAdvancement = tournament.defaultAdvancementCount || defaultAdvancementCount || 3;
  const isFormatA = tournament.tournamentBatchFormat === 'QUALIFIER_FINAL';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── 1. Header & Room Filter Tabs ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-gold animate-pulse" />
            <h3 className="text-lg font-heading font-black text-white uppercase tracking-wider">
              Official Match Points Table &amp; Standings
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official placement points ($12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0$) + $1$ point per Kill.
          </p>
        </div>

        {/* Room Switcher Tabs */}
        {availableRooms.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setSelectedRoomId('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                selectedRoomId === 'ALL'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Overall Standings
            </button>
            {availableRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  selectedRoomId === room.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {room.roomType === 'FINAL' || room.roomLabel === 'Final' ? '🏆 Final Room' : `Room ${room.roomLabel}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. Top 3 Podium Highlights ──────────────────────────────────── */}
      {overallScores.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* #2 Runner Up */}
          {overallScores[1] && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-lg text-center relative overflow-hidden order-2 sm:order-1">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-mono font-bold">
                RANK #2
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-700/60 border border-slate-500 mx-auto flex items-center justify-center text-slate-300 mb-2">
                <Medal className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-black text-sm text-white truncate">
                {overallScores[1].teamName}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
                <span className="text-slate-400">Pts: <strong className="text-white">{overallScores[1].placementPoints}</strong></span>
                <span className="text-slate-400">Kills: <strong className="text-red-400">{overallScores[1].kills}</strong></span>
                <span className="text-slate-300 font-bold">Total: <strong className="text-brand-gold text-sm">{overallScores[1].totalPoints}</strong></span>
              </div>
            </div>
          )}

          {/* #1 Booyah Champion */}
          {overallScores[0] && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/10 text-center relative overflow-hidden order-1 sm:order-2 transform sm:-translate-y-1">
              <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> BOOYAH!
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 mx-auto flex items-center justify-center text-amber-400 mb-2 shadow-md shadow-amber-500/20">
                <Trophy className="w-6 h-6" />
              </div>
              <h4 className="font-heading font-black text-base text-amber-400 truncate">
                {overallScores[0].teamName}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
                <span className="text-slate-400">Pts: <strong className="text-white">{overallScores[0].placementPoints}</strong></span>
                <span className="text-slate-400">Kills: <strong className="text-red-400">{overallScores[0].kills}</strong></span>
                <span className="text-amber-300 font-bold">Total: <strong className="text-brand-gold text-base">{overallScores[0].totalPoints}</strong></span>
              </div>
            </div>
          )}

          {/* #3 3rd Place */}
          {overallScores[2] && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-lg text-center relative overflow-hidden order-3">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-700/60 text-amber-400 text-[10px] font-mono font-bold">
                RANK #3
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-800 mx-auto flex items-center justify-center text-amber-500 mb-2">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-black text-sm text-white truncate">
                {overallScores[2].teamName}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
                <span className="text-slate-400">Pts: <strong className="text-white">{overallScores[2].placementPoints}</strong></span>
                <span className="text-slate-400">Kills: <strong className="text-red-400">{overallScores[2].kills}</strong></span>
                <span className="text-slate-300 font-bold">Total: <strong className="text-brand-gold text-sm">{overallScores[2].totalPoints}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Full Points Table ────────────────────────────────────────── */}
      {overallScores.length === 0 ? (
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
                  {selectedRoomId === 'ALL' && <th className="px-4 py-3.5 w-24">Room</th>}
                  <th className="px-4 py-3.5">Squad Name</th>
                  <th className="px-4 py-3.5 text-center">Placement Pts</th>
                  <th className="px-4 py-3.5 text-center">Kill Pts</th>
                  <th className="px-4 py-3.5 text-center">Total Score</th>
                  {isFormatA && <th className="px-4 py-3.5 text-right">Status</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {overallScores.map((score, index) => {
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

                      {/* Room Label if ALL selected */}
                      {selectedRoomId === 'ALL' && (
                        <td className="px-4 py-3 font-bold text-purple-400">
                          Room {(score as any).roomLabel || 'A'}
                        </td>
                      )}

                      {/* Squad Name */}
                      <td className="px-4 py-3 font-sans font-black text-white text-sm">
                        <div className="flex items-center gap-2">
                          <span>{score.teamName}</span>
                          {isBooyah && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-extrabold border border-amber-500/40 uppercase">
                              Booyah 🔥
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Placement Points */}
                      <td className="px-4 py-3 text-center text-slate-300 font-bold">
                        {score.placementPoints}
                      </td>

                      {/* Kill Points */}
                      <td className="px-4 py-3 text-center text-red-400 font-bold">
                        {score.kills}
                      </td>

                      {/* Total Score */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-xl text-sm font-black ${
                          isBooyah
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-brand-gold border border-slate-700'
                        }`}>
                          {score.totalPoints}
                        </span>
                      </td>

                      {/* Format A Qualification Status */}
                      {isFormatA && (
                        <td className="px-4 py-3 text-right">
                          {isQualifying ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>QUALIFIED 🏆</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px] uppercase">
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
