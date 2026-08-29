'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Gamepad2, 
  Clock, 
  Lock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Sparkles,
  Filter,
  Shield,
  CircleDot
} from 'lucide-react';

interface ParticipantItem {
  id: string;
  squadName: string;
  iglName?: string;
  player1Name?: string;
  player2Name?: string;
  player3Name?: string;
  player4Name?: string;
  slotNumber?: number;
  status?: string;
  createdAt?: string;
}

interface SlotGridProps {
  tournamentId: string;
  tournamentTitle: string;
  gameMode?: string;
  maxTeams?: number;
  participants: ParticipantItem[];
  roomId?: string;
  roomPassword?: string;
  startTime?: string;
  isUserRegistered?: boolean;
}

export default function SlotGrid({
  tournamentId,
  tournamentTitle,
  gameMode = 'Squad BR',
  maxTeams = 12,
  participants = [],
  roomId,
  roomPassword,
  startTime,
  isUserRegistered = false,
}: SlotGridProps) {
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CONFIRMED' | 'OPEN'>('ALL');

  // Countdown timer to match start / Room ID release
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const target = new Date(startTime).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleCopy = (text: string, type: 'ROOM' | 'PASS') => {
    navigator.clipboard.writeText(text);
    if (type === 'ROOM') {
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Generate slots mapping
  const totalSlots = Number(maxTeams) > 0 ? Number(maxTeams) : 12;
  const allSlots = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, i) => {
      const slotNum = i + 1;
      const participant = participants[i];
      return {
        slotNumber: slotNum,
        participant: participant || null,
      };
    });
  }, [totalSlots, participants]);

  const confirmedCount = participants.length;
  const openCount = Math.max(0, totalSlots - confirmedCount);

  const displayedSlots = useMemo(() => {
    if (filterMode === 'CONFIRMED') {
      return allSlots.filter((s) => !!s.participant);
    }
    if (filterMode === 'OPEN') {
      return allSlots.filter((s) => !s.participant);
    }
    return allSlots;
  }, [allSlots, filterMode]);

  return (
    <div className="space-y-3.5">
      
      {/* Compact Room ID & Match Timer Banner */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-br from-white via-orange-50/20 to-red-50/30 border border-orange-200/90 rounded-2xl shadow-2xs space-y-3 text-slate-900">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-100 text-brand-orange">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>Match Room Slots</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold">
                  {confirmedCount}/{totalSlots} Filled
                </span>
              </h3>
            </div>
          </div>

          {/* Live Countdown */}
          {timeLeft && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-brand-orange animate-spin" />
              <span className="text-slate-900 font-mono font-black text-xs">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Room ID / Pass Display or Lock Status */}
        {roomId && isUserRegistered ? (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 bg-white border border-orange-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Room ID</span>
                <span className="text-xs sm:text-sm font-mono font-black text-brand-orange tracking-wider">{roomId}</span>
              </div>
              <button
                onClick={() => handleCopy(roomId, 'ROOM')}
                className="p-1.5 bg-orange-50 hover:bg-orange-100 text-brand-orange rounded-lg text-xs font-bold transition-all cursor-pointer"
                title="Copy Room ID"
              >
                {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Password</span>
                <span className="text-xs sm:text-sm font-mono font-black text-slate-900 tracking-wider">{roomPassword || 'None'}</span>
              </div>
              {roomPassword && (
                <button
                  onClick={() => handleCopy(roomPassword, 'PASS')}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  title="Copy Password"
                >
                  {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-white/90 border border-slate-200/80 rounded-xl flex items-center justify-between text-[11px] text-slate-600 gap-2">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Room ID &amp; Password unlocks <strong>15 mins before match</strong> for registered players.</span>
            </div>
            {!isUserRegistered && (
              <span className="text-[9px] font-extrabold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 shrink-0 whitespace-nowrap">
                Register Slot
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-[11px] font-bold">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({totalSlots})
          </button>
          <button
            onClick={() => setFilterMode('CONFIRMED')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'CONFIRMED'
                ? 'bg-emerald-600 text-white shadow-2xs font-black'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>Filled ({confirmedCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('OPEN')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterMode === 'OPEN'
                ? 'bg-white text-slate-900 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Open ({openCount})
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline-block">
          Click slot for info
        </span>
      </div>

      {/* Compact Responsive Slot Grid (2 columns on mobile, 3-4 on larger screens) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {displayedSlots.map(({ slotNumber, participant }) => (
          <div
            key={slotNumber}
            className={`rounded-xl border transition-all text-left flex flex-col justify-between overflow-hidden ${
              participant
                ? 'bg-white border-orange-300 shadow-2xs p-2.5 sm:p-3 hover:border-orange-400'
                : 'bg-slate-50/70 border-slate-200/90 border-dashed hover:bg-slate-100/70 p-2 sm:p-2.5 min-h-[64px]'
            }`}
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-100">
              <span className={`px-1.5 py-0.5 rounded-md font-mono font-black text-[10px] ${
                participant ? 'bg-orange-100 text-brand-orange' : 'bg-slate-200/80 text-slate-500'
              }`}>
                SLOT #{slotNumber}
              </span>
              <span className={`text-[9px] font-extrabold uppercase tracking-tight ${
                participant ? 'text-emerald-600 flex items-center gap-0.5' : 'text-slate-400'
              }`}>
                {participant ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 inline" />
                    <span>CONFIRMED</span>
                  </>
                ) : (
                  'OPEN'
                )}
              </span>
            </div>

            {/* Slot Content */}
            {participant ? (
              <div className="pt-1.5 space-y-1.5">
                <div>
                  <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                    {participant.squadName}
                  </h4>
                </div>

                {/* Team Members List (Compact 2-col or single-line bullets) */}
                <div className="grid grid-cols-1 gap-0.5 pt-0.5 text-[10px] text-slate-600 font-mono">
                  {[
                    participant.player1Name,
                    participant.player2Name,
                    participant.player3Name,
                    participant.player4Name,
                  ]
                    .filter(Boolean)
                    .map((playerName, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-1 truncate">
                        <span className="w-1 h-1 rounded-full bg-brand-orange shrink-0" />
                        <span className="truncate">{playerName}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="py-1 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <Users className="w-3 h-3 text-slate-300 shrink-0" />
                  <span>Available</span>
                </div>
                <span className="text-[9px] font-bold text-brand-orange bg-orange-50/80 px-1.5 py-0.2 rounded border border-orange-100">
                  + Free
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

