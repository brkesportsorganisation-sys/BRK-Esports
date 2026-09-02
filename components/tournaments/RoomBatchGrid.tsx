'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Users,
  Gamepad2,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  Flame,
  Award,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

import { formatRoomLabel } from '@/lib/tournament-rooms-utils';

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
  joinedAt?: string;
}

interface RoomItem {
  id: string;
  roomLabel: string;
  roomType: 'QUALIFIER' | 'FINAL' | 'STANDALONE';
  capacity: number;
  currentCount: number;
  status: 'OPEN' | 'FULL' | 'LIVE' | 'COMPLETED';
  prizePool?: number;
  advancementCount?: number;
  matchTime?: string;
  revealAt?: string;
  isPublished?: boolean;
  participants: ParticipantItem[];
}

interface MyRoomData {
  isRegistered: boolean;
  isUnlocked: boolean;
  qualificationStatus?: 'ACTIVE' | 'QUALIFIED' | 'ELIMINATED';
  roomLabel?: string;
  roomType?: string;
  slotNumber?: number;
  squadName?: string;
  revealAt?: string | null;
  matchTime?: string;
  roomIdCredential?: string;
  roomPassword?: string;
  message?: string;
}

interface RoomBatchGridProps {
  tournamentId: string;
  tournamentTitle: string;
  tournamentFormat?: 'SINGLE_ROOM' | 'QUALIFIER_FINAL' | 'INDEPENDENT_ROOMS';
  gameMode?: string;
  currentUser?: { id: string; name?: string; email?: string } | null;
  startTime?: string;
}

export default function RoomBatchGrid({
  tournamentId,
  tournamentTitle,
  tournamentFormat = 'SINGLE_ROOM',
  gameMode = 'Squad BR',
  currentUser,
  startTime,
}: RoomBatchGridProps) {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CONFIRMED' | 'OPEN'>('ALL');

  // Player room reveal state
  const [myRoom, setMyRoom] = useState<MyRoomData | null>(null);
  const [hasRevealedLocally, setHasRevealedLocally] = useState<boolean>(false);
  const [copiedRoom, setCopiedRoom] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Fetch rooms list
  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rooms`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rooms) && data.rooms.length > 0) {
          setRooms(data.rooms);
          if (!activeRoomId) {
            setActiveRoomId(data.rooms[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('[RoomBatchGrid] Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current player's assigned room
  const fetchMyRoom = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/my-room?userId=${currentUser.id}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setMyRoom(data);
      }
    } catch (err) {
      console.warn('[RoomBatchGrid] Failed to fetch my room:', err);
    }
  };

  useEffect(() => {
    void fetchRooms();
    if (currentUser?.id) {
      void fetchMyRoom();
    }
  }, [tournamentId, currentUser?.id]);

  // Selected room
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;
  }, [rooms, activeRoomId]);

  // Countdown to reveal timer
  const targetRevealTime = myRoom?.revealAt || currentRoom?.revealAt || startTime;
  useEffect(() => {
    if (!targetRevealTime) return;

    const calculateDiff = () => {
      const target = new Date(targetRevealTime).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    calculateDiff();
    const interval = setInterval(calculateDiff, 1000);
    return () => clearInterval(interval);
  }, [targetRevealTime]);

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

  // Generate slots for active room
  const totalSlots = currentRoom?.capacity || 12;
  const participants = currentRoom?.participants || [];
  const confirmedCount = participants.length;
  const openCount = Math.max(0, totalSlots - confirmedCount);

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
    <div className="space-y-4">
      {/* ─── 1. Format Banner & Room Switcher Tabs ───────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-brand-orange">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>Tournament Groups &amp; Squad Rosters</span>
                {tournamentFormat === 'QUALIFIER_FINAL' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-purple-600" />
                    <span>Format A: Qualifier → Final</span>
                  </span>
                )}
                {tournamentFormat === 'INDEPENDENT_ROOMS' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center gap-1">
                    <Award className="w-3 h-3 text-blue-600" />
                    <span>Format B: Independent Standalone Groups</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                {rooms.length > 1
                  ? `Batched into ${rooms.length} Groups (${totalSlots} slots per group). Select a group below to view squad rosters.`
                  : `Single Group with ${totalSlots} max squads capacity.`}
              </p>
            </div>
          </div>

          {/* Live Countdown Badge */}
          {timeLeft && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-brand-orange animate-spin" />
              <span className="text-slate-900 font-mono font-black text-xs">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Group Navigation Tabs */}
        {rooms.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {rooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const isFinal = room.roomType === 'FINAL' || String(room.roomLabel).toLowerCase() === 'final';
              const isFull = (room.participants?.length || 0) >= room.capacity;
              const formattedLabel = formatRoomLabel(room.roomLabel, room.roomType);

              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                    isActive
                      ? isFinal
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md font-black'
                        : 'bg-brand-orange text-white border-brand-orange shadow-md font-black'
                      : isFinal
                      ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isFinal ? <Trophy className="w-3.5 h-3.5" /> : <Gamepad2 className="w-3.5 h-3.5" />}
                    <span>{formattedLabel}</span>
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-black ${
                      isActive
                        ? 'bg-black/20 text-white'
                        : isFull
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {room.participants?.length || 0}/{room.capacity}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 2. "My Assigned Room & Match Hub" Card (Player Exclusive) ────────── */}
      {currentUser && (
        <div className={`p-4 rounded-2xl shadow-xs space-y-3 transition-all ${
          myRoom?.qualificationStatus === 'QUALIFIED'
            ? 'bg-gradient-to-r from-purple-950/20 via-amber-950/20 to-slate-900/20 border-2 border-amber-500/80'
            : myRoom?.qualificationStatus === 'ELIMINATED'
            ? 'bg-slate-50 border border-slate-300'
            : 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 border border-orange-300'
        }`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl text-white shadow-xs ${
                myRoom?.qualificationStatus === 'QUALIFIED'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : myRoom?.qualificationStatus === 'ELIMINATED'
                  ? 'bg-slate-400'
                  : 'bg-brand-orange'
              }`}>
                {myRoom?.qualificationStatus === 'QUALIFIED' ? (
                  <Trophy className="w-5 h-5 text-black" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>My Tournament Match Hub</span>
                  {myRoom?.isRegistered ? (
                    myRoom.qualificationStatus === 'QUALIFIED' ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500 text-black font-black uppercase flex items-center gap-1 animate-pulse">
                        <Trophy className="w-3 h-3" /> QUALIFIED FOR GRAND FINALS!
                      </span>
                    ) : myRoom.qualificationStatus === 'ELIMINATED' ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold uppercase">
                        Eliminated in Qualifiers
                      </span>
                    ) : (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-black">
                        Assigned: {formatRoomLabel(myRoom.roomLabel, myRoom.roomType)} • Slot #{myRoom.slotNumber || 1}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
                      Not Registered
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-600">
                  {myRoom?.isRegistered
                    ? myRoom.qualificationStatus === 'QUALIFIED'
                      ? `Congratulations! Squad "${myRoom.squadName}" has qualified for the Grand Finals! Your Championship Final credentials unlock below.`
                      : myRoom.qualificationStatus === 'ELIMINATED'
                      ? `Your squad "${myRoom.squadName}" has completed its matches in this tournament. Better luck in the next tournament!`
                      : `Your squad "${myRoom.squadName}" is slotted in ${formatRoomLabel(myRoom.roomLabel, myRoom.roomType)}. Credentials unlock 10-15m before match start.`
                    : 'Register for this tournament to get assigned to a match room.'}
                </p>
              </div>
            </div>

            {myRoom?.isRegistered && myRoom.qualificationStatus !== 'ELIMINATED' && (
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                Slot #{myRoom.slotNumber}
              </span>
            )}
          </div>

          {/* Unlock / Reveal Box (Completely Hidden if Eliminated) */}
          {myRoom?.isRegistered && myRoom.qualificationStatus !== 'ELIMINATED' ? (
            myRoom.isUnlocked && myRoom.roomIdCredential ? (
              hasRevealedLocally ? (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                  <div className="p-3 bg-white border-2 border-orange-300 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Room ID</span>
                      <span className="text-xs sm:text-sm font-mono font-black text-brand-orange tracking-wider">
                        {myRoom.roomIdCredential}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(myRoom.roomIdCredential!, 'ROOM')}
                      className="p-1.5 bg-orange-50 hover:bg-orange-100 text-brand-orange rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Copy Room ID"
                    >
                      {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Password</span>
                      <span className="text-xs sm:text-sm font-mono font-black text-slate-900 tracking-wider">
                        {myRoom.roomPassword || 'None'}
                      </span>
                    </div>
                    {myRoom.roomPassword && (
                      <button
                        onClick={() => handleCopy(myRoom.roomPassword!, 'PASS')}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">
                        {myRoom.qualificationStatus === 'QUALIFIED' ? '🏆 Grand Finals Room Credentials Live!' : `${formatRoomLabel(myRoom.roomLabel, myRoom.roomType)} credentials are live!`}
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        Tap reveal to view your Room ID and Password.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setHasRevealedLocally(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal Room Info</span>
                  </button>
                </div>
              )
            ) : (
              <div className="p-2.5 bg-white/90 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Room ID &amp; Password will unlock automatically <strong>10–15 mins before match start</strong> exclusively for qualified/assigned squads.
                  </span>
                </div>
              </div>
            )
          ) : null}
        </div>
      )}

      {/* ─── 3. Active Room Slot Grid ────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Filter Toolbar */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Slots ({totalSlots})
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

          <div className="text-[11px] text-slate-500 font-semibold">
            <span>Viewing: </span>
            <strong className="text-slate-900">{formatRoomLabel(currentRoom?.roomLabel, currentRoom?.roomType)}</strong>
          </div>
        </div>

        {/* Slot Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {displayedSlots.map(({ slotNumber, participant }) => (
            <div
              key={slotNumber}
              className={`rounded-xl border transition-all text-left flex flex-col justify-between overflow-hidden ${
                participant
                  ? 'bg-white border-orange-300 shadow-2xs p-3 hover:border-orange-400'
                  : 'bg-slate-50/70 border-slate-200 border-dashed hover:bg-slate-100/70 p-2.5 min-h-[70px]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-100">
                <span
                  className={`px-1.5 py-0.5 rounded-md font-mono font-black text-[10px] ${
                    participant ? 'bg-orange-100 text-brand-orange' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  SLOT #{slotNumber}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-tight ${
                    participant ? 'text-emerald-600 flex items-center gap-0.5' : 'text-slate-400'
                  }`}
                >
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

              {/* Body */}
              {participant ? (
                <div className="pt-2 space-y-1.5">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                      {participant.squadName}
                    </h4>
                    {participant.iglName && (
                      <span className="text-[9px] text-slate-400 font-mono block truncate">
                        IGL: {participant.iglName}
                      </span>
                    )}
                  </div>

                  {/* Members list */}
                  <div className="grid grid-cols-1 gap-0.5 pt-0.5 text-[10px] text-slate-600 font-mono">
                    {[
                      participant.player1Name,
                      participant.player2Name,
                      participant.player3Name,
                      participant.player4Name,
                    ]
                      .filter(Boolean)
                      .map((pName, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-1 truncate">
                          <span className="w-1 h-1 rounded-full bg-brand-orange shrink-0" />
                          <span className="truncate">{pName}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="py-2 flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                    <Users className="w-3 h-3 text-slate-300 shrink-0" />
                    <span>Available</span>
                  </div>
                  <span className="text-[9px] font-bold text-brand-orange bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                    + Free Slot
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
