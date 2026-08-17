'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Gamepad2, 
  Clock, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX,
  Flame,
  Sparkles,
  Radio
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
  const [soundMuted, setSoundMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

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

  // Generate 12 slots mapping
  const totalSlots = Math.min(12, maxTeams || 12);
  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const slotNum = i + 1;
    const participant = participants[i];
    return {
      slotNumber: slotNum,
      participant: participant || null,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Room ID & Match Timer Status Banner */}
      <div className="p-6 bg-gradient-to-r from-orange-950/60 via-slate-900 to-slate-900 border border-orange-500/40 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Custom Match Room Table (12-Slot Grid)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold">
                  LIVE SLOTS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Join your assigned slot number in Free Fire custom room on time.
              </p>
            </div>
          </div>

          {/* Live Countdown */}
          {timeLeft && (
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800">
              <Clock className="w-4 h-4 text-orange-400 animate-spin" />
              <div className="text-xs">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Match Countdown</span>
                <span className="text-white font-mono font-black text-sm">
                  {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Room ID / Pass Display or Lock Status */}
        {roomId && isUserRegistered ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fadeIn">
            <div className="p-4 bg-slate-950/90 border border-orange-500/50 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Custom Room ID</span>
                <span className="text-lg font-mono font-black text-orange-400 tracking-wider">{roomId}</span>
              </div>
              <button
                onClick={() => handleCopy(roomId, 'ROOM')}
                className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedRoom ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedRoom ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="p-4 bg-slate-950/90 border border-orange-500/50 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Room Password</span>
                <span className="text-lg font-mono font-black text-white tracking-wider">{roomPassword || 'None'}</span>
              </div>
              {roomPassword && (
                <button
                  onClick={() => handleCopy(roomPassword, 'PASS')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedPass ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Room ID & Password will unlock <strong>10-15 minutes before match start</strong> for registered players.</span>
            </div>
            {!isUserRegistered && (
              <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/30">
                Register Slot to View
              </span>
            )}
          </div>
        )}
      </div>

      {/* 12-Slot Visual Battle Royale Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {slots.map(({ slotNumber, participant }) => (
          <div
            key={slotNumber}
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              participant
                ? 'bg-slate-900/80 border-orange-500/40 shadow-lg shadow-orange-950/20'
                : 'bg-slate-950/40 border-slate-800/80 border-dashed opacity-60'
            }`}
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 font-mono font-black text-xs">
                SLOT #{slotNumber}
              </span>
              <span className={`text-[10px] font-bold uppercase ${
                participant ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500'
              }`}>
                {participant ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    CONFIRMED
                  </>
                ) : (
                  'OPEN'
                )}
              </span>
            </div>

            {/* Squad Content */}
            {participant ? (
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-black text-white truncate">{participant.squadName}</h4>
                  {participant.iglName && (
                    <span className="text-[11px] text-slate-400 block truncate">
                      IGL: <strong className="text-slate-300">{participant.iglName}</strong>
                    </span>
                  )}
                </div>

                {/* Team Members List */}
                <div className="space-y-1 pt-1 text-[11px] text-slate-400 font-mono">
                  {participant.player1Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span className="truncate">{participant.player1Name}</span>
                    </div>
                  )}
                  {participant.player2Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span className="truncate">{participant.player2Name}</span>
                    </div>
                  )}
                  {participant.player3Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span className="truncate">{participant.player3Name}</span>
                    </div>
                  )}
                  {participant.player4Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <span className="truncate">{participant.player4Name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-600 space-y-1">
                <Users className="w-6 h-6 mx-auto text-slate-700" />
                <p>Slot Available</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
