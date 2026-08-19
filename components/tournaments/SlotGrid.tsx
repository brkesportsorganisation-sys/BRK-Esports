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
      <div className="p-6 bg-gradient-to-br from-white via-red-50/25 to-orange-50/35 border-2 border-red-200/90 rounded-3xl shadow-sm space-y-4 text-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-50 text-brand-orange border border-orange-200">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Custom Match Room Table (12-Slot Grid)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  LIVE SLOTS
                </span>
              </h3>
              <p className="text-xs text-slate-600">
                Join your assigned slot number in Free Fire custom room on time.
              </p>
            </div>
          </div>

          {/* Live Countdown */}
          {timeLeft && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs">
              <Clock className="w-4 h-4 text-brand-orange animate-spin" />
              <div className="text-xs">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Match Countdown</span>
                <span className="text-slate-900 font-mono font-black text-sm">
                  {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Room ID / Pass Display or Lock Status */}
        {roomId && isUserRegistered ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fadeIn">
            <div className="p-4 bg-white border border-red-200/90 shadow-2xs rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Custom Room ID</span>
                <span className="text-lg font-mono font-black text-brand-orange tracking-wider">{roomId}</span>
              </div>
              <button
                onClick={() => handleCopy(roomId, 'ROOM')}
                className="px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-brand-orange rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedRoom ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedRoom ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="p-4 bg-white border border-red-200/90 shadow-2xs rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Room Password</span>
                <span className="text-lg font-mono font-black text-slate-900 tracking-wider">{roomPassword || 'None'}</span>
              </div>
              {roomPassword && (
                <button
                  onClick={() => handleCopy(roomPassword, 'PASS')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedPass ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white/90 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Room ID & Password will unlock <strong className="text-slate-900">10-15 minutes before match start</strong> for registered players.</span>
            </div>
            {!isUserRegistered && (
              <span className="text-[10px] font-bold text-brand-orange bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 shrink-0">
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
                ? 'bg-white border-2 border-brand-orange/40 shadow-md shadow-orange-500/5'
                : 'bg-white/60 border-slate-300 border-dashed opacity-75'
            }`}
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-brand-orange font-mono font-black text-xs">
                SLOT #{slotNumber}
              </span>
              <span className={`text-[10px] font-bold uppercase ${
                participant ? 'text-emerald-700 flex items-center gap-1 font-extrabold' : 'text-slate-400'
              }`}>
                {participant ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
                  <h4 className="text-sm font-black text-slate-900 truncate">{participant.squadName}</h4>
                  {participant.iglName && (
                    <span className="text-[11px] text-slate-500 block truncate">
                      IGL: <strong className="text-slate-800">{participant.iglName}</strong>
                    </span>
                  )}
                </div>

                {/* Team Members List */}
                <div className="space-y-1 pt-1 text-[11px] text-slate-600 font-mono">
                  {participant.player1Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                      <span className="truncate">{participant.player1Name}</span>
                    </div>
                  )}
                  {participant.player2Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                      <span className="truncate">{participant.player2Name}</span>
                    </div>
                  )}
                  {participant.player3Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                      <span className="truncate">{participant.player3Name}</span>
                    </div>
                  )}
                  {participant.player4Name && (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                      <span className="truncate">{participant.player4Name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                <Users className="w-6 h-6 mx-auto text-slate-300" />
                <p>Slot Available</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
