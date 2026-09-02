'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  MessageSquare,
  Trophy,
  Calendar,
  Gamepad2,
  ExternalLink,
  ChevronRight,
  Save,
  X,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { Tournament, TournamentRoom, Participant } from '@/lib/types';
import { formatRoomLabel } from '@/lib/tournament-rooms-utils';

export default function AdminGroupsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');

  // Rooms & Participants for Selected Tournament
  const [rooms, setRooms] = useState<TournamentRoom[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isReassigningSquad, setIsReassigningSquad] = useState<string | null>(null);

  // Filters & Search
  const [rosterFilterRoom, setRosterFilterRoom] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');

  // Manual Squad Modal
  const [manualSquadModalOpen, setManualSquadModalOpen] = useState(false);
  const [manualSquadForm, setManualSquadForm] = useState({
    squadName: '',
    iglName: '',
    captainWhatsApp: '',
    player1Name: '',
    player2Name: '',
    player3Name: '',
    player4Name: '',
    roomId: '',
    roomLabel: '1',
    slotNumber: 1,
  });

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [csrfRes, toursRes] = await Promise.all([
          fetch('/api/csrf').then(r => r.json()).catch(() => ({ csrfToken: '' })),
          fetch('/api/admin/tournaments', { credentials: 'include' }).then(r => r.json()).catch(() => ({ tournaments: [] })),
        ]);

        if (csrfRes.csrfToken) setCsrfToken(csrfRes.csrfToken);
        const tourList: Tournament[] = Array.isArray(toursRes.tournaments) ? toursRes.tournaments : [];
        setTournaments(tourList);

        if (tourList.length > 0) {
          setSelectedTourId(tourList[0].id);
        }
      } catch (err) {
        console.error('Failed to init groups page:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Load Rooms and Squads for Selected Tournament
  const loadTournamentData = async (tourId: string) => {
    if (!tourId) return;
    setIsRoomsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tourId}/rooms`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
        setParticipants(data.allParticipants || []);
      }
    } catch (err) {
      console.warn('Failed to load tournament groups data:', err);
    } finally {
      setIsRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTourId) {
      loadTournamentData(selectedTourId);
      setRosterFilterRoom('ALL');
    }
  }, [selectedTourId, tournaments]);

  const selectedTournament = useMemo(() => {
    return tournaments.find(t => t.id === selectedTourId) || null;
  }, [tournaments, selectedTourId]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchGame = gameFilter === 'ALL' || t.game === gameFilter;
      const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGame && matchSearch;
    });
  }, [tournaments, gameFilter, searchQuery]);

  // Actions
  const handleAssignSquadToRoom = async (participantId: string, targetRoomId: string, targetRoomLabel: string, slotNumber?: number) => {
    if (!selectedTournament) return;
    setIsReassigningSquad(participantId);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ASSIGN_SQUAD_TO_ROOM',
          participantId,
          targetRoomId,
          targetRoomLabel,
          slotNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback(data.message || 'Squad assigned successfully!');
        await loadTournamentData(selectedTournament.id);
      } else {
        setFeedbackTone('error');
        setFeedback(data.message || 'Failed to reassign squad.');
      }
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Error reassigning squad');
    } finally {
      setIsReassigningSquad(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleAutoDistributeSquads = async () => {
    if (!selectedTournament) return;
    if (!confirm(`Auto-distribute all ${participants.length} registered squads sequentially across groups (1-12 in Group 1, 13-24 in Group 2, etc.)?`)) return;
    setIsRoomsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ action: 'AUTO_DISTRIBUTE_SQUADS' }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback(data.message || 'Squads distributed across groups!');
        await loadTournamentData(selectedTournament.id);
      } else {
        setFeedbackTone('error');
        setFeedback(data.message || 'Failed to auto-distribute squads.');
      }
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Error distributing squads');
    } finally {
      setIsRoomsLoading(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleAddManualSquad = async () => {
    if (!selectedTournament || !manualSquadForm.squadName.trim()) {
      alert('Squad Name is required');
      return;
    }
    try {
      const targetRoom = rooms.find(r => r.id === manualSquadForm.roomId || r.roomLabel === manualSquadForm.roomLabel) || rooms[0];
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ADD_MANUAL_PARTICIPANT',
          squadData: {
            ...manualSquadForm,
            roomId: targetRoom?.id || manualSquadForm.roomId,
            roomLabel: targetRoom?.roomLabel || manualSquadForm.roomLabel,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setManualSquadModalOpen(false);
        setManualSquadForm({
          squadName: '',
          iglName: '',
          captainWhatsApp: '',
          player1Name: '',
          player2Name: '',
          player3Name: '',
          player4Name: '',
          roomId: '',
          roomLabel: '1',
          slotNumber: 1,
        });
        setFeedbackTone('success');
        setFeedback(data.message || 'Squad registered to room successfully!');
        await loadTournamentData(selectedTournament.id);
      } else {
        alert(data.message || 'Failed to add squad.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error adding squad');
    } finally {
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleRemoveSquad = async (participantId: string, squadName: string) => {
    if (!selectedTournament) return;
    if (!confirm(`Are you sure you want to remove squad "${squadName}" from this tournament?`)) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'REMOVE_SQUAD_FROM_ROOM',
          participantId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback('Squad removed successfully.');
        await loadTournamentData(selectedTournament.id);
      } else {
        alert(data.message || 'Failed to remove squad.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error removing squad');
    } finally {
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleCreateNewRoom = async (customLabel?: string) => {
    if (!selectedTournament) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'CREATE_ROOM',
          roomLabel: customLabel || undefined,
          roomType: customLabel === 'Final' ? 'FINAL' : 'QUALIFIER',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback(data.message || 'New Group created!');
        await loadTournamentData(selectedTournament.id);
      } else {
        alert(data.message || 'Failed to create room.');
      }
    } catch (err) {
      alert('Error creating room');
    } finally {
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const filteredSquads = useMemo(() => {
    return participants.filter(p => {
      // Room Filter
      let matchRoom = true;
      if (rosterFilterRoom === 'UNASSIGNED') {
        matchRoom = !p.roomId && !p.roomLabel;
      } else if (rosterFilterRoom !== 'ALL') {
        matchRoom = p.roomId === rosterFilterRoom || p.roomLabel === rosterFilterRoom;
      }

      // Search Query
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || (
        (p.squadName && p.squadName.toLowerCase().includes(q)) ||
        (p.iglName && p.iglName.toLowerCase().includes(q)) ||
        (p.captainWhatsApp && p.captainWhatsApp.includes(q))
      );

      return matchRoom && matchSearch;
    });
  }, [participants, rosterFilterRoom, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#111827]/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Users className="w-5 h-5" />
              </span>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-400 font-bold">Groups &amp; Roster Allocation Center</p>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-heading font-black text-white">GROUPS &amp; SQUADS ROSTER</h1>
            <p className="mt-1 text-xs text-slate-300 font-medium">
              Manage all registered squads, auto-distribute teams (1-12 in Group 1, 13-24 in Group 2), move teams between groups, and manage slot matrices.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/roadmaps"
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-800/80 bg-amber-950/60 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-900 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Roadmaps &amp; Schedules</span>
            </Link>

            <button
              onClick={handleAutoDistributeSquads}
              className="inline-flex items-center gap-2 rounded-2xl bg-purple-950 hover:bg-purple-900 border border-purple-700 px-4 py-2.5 font-bold text-xs text-purple-300 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span>⚡ AUTO-DISTRIBUTE SQUADS</span>
            </button>

            <button
              onClick={() => setManualSquadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 font-heading font-black text-xs text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ ADD SQUAD TO ROOM</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${feedbackTone === 'error' ? 'border-red-900/50 bg-red-950/40 text-red-300' : 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300'}`}>
            {feedbackTone === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback}</span>
          </div>
        )}

        {/* 2. Tournament Selector Bar */}
        <div className="mt-6 p-4 rounded-2xl border border-slate-800 bg-slate-900/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-bold text-slate-300 shrink-0">Select Tournament:</label>
            <select
              value={selectedTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="w-full sm:max-w-md px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              {filteredTournaments.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.game === 'FREE_FIRE' ? '🔥 Free Fire' : t.game === 'PUBG_MOBILE' ? '🪖 PUBG' : t.game}) - {t.status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateNewRoom()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Group</span>
            </button>
            {selectedTournament?.tournamentBatchFormat === 'QUALIFIER_FINAL' && !rooms.some(r => r.roomType === 'FINAL') && (
              <button
                onClick={() => handleCreateNewRoom('Final')}
                className="px-3.5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trophy className="w-3.5 h-3.5 text-brand-gold" />
                <span>Create Final Room</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Groups Summary Cards */}
      {loading || isRoomsLoading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <span className="text-sm font-medium">Loading groups and squads matrix...</span>
        </div>
      ) : !selectedTournament ? (
        <div className="p-16 text-center text-slate-400 rounded-3xl border border-slate-800 bg-slate-900/40">
          No tournament selected. Please choose a tournament above.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Group Overview Stat Badges */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Registered Squads</p>
                <p className="mt-1 text-2xl font-heading font-black text-white">{participants.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Active Groups</p>
                <p className="mt-1 text-2xl font-heading font-black text-emerald-400">{rooms.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Group Capacity</p>
                <p className="mt-1 text-2xl font-heading font-black text-brand-gold">{selectedTournament.roomCapacity || 12} <span className="text-xs font-normal text-slate-400">squads/room</span></p>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400">
                <Gamepad2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Unassigned Squads</p>
                <p className="mt-1 text-2xl font-heading font-black text-amber-400">
                  {participants.filter(p => !p.roomId && !p.roomLabel).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Squads Matrix Toolbar & Table */}
          <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              {/* Group Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setRosterFilterRoom('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    rosterFilterRoom === 'ALL'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All Teams ({participants.length})
                </button>

                <button
                  onClick={() => setRosterFilterRoom('UNASSIGNED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    rosterFilterRoom === 'UNASSIGNED'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ⚠️ Unassigned ({participants.filter(p => !p.roomId && !p.roomLabel).length})
                </button>

                {rooms.map(r => {
                  const countInRoom = participants.filter(p => p.roomId === r.id || p.roomLabel === r.roomLabel).length;
                  const isFull = countInRoom >= (r.capacity || selectedTournament.roomCapacity || 12);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRosterFilterRoom(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        rosterFilterRoom === r.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final' : formatRoomLabel(r.roomLabel, r.roomType)}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isFull ? 'bg-red-950 text-red-300' : 'bg-slate-800 text-slate-300'}`}>
                        {countInRoom}/{r.capacity || 12}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search squad, IGL, WhatsApp..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Squads Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold border-b border-slate-800 text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 text-center">Slot</th>
                    <th className="px-4 py-3.5">Squad Details</th>
                    <th className="px-4 py-3.5">IGL / Captain</th>
                    <th className="px-4 py-3.5">WhatsApp Chat</th>
                    <th className="px-4 py-3.5">Assigned Group</th>
                    <th className="px-4 py-3.5 text-center">Slot #</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredSquads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No squads found matching your filter criteria. Click &quot;➕ Add Squad to Room&quot; to register teams manually.
                      </td>
                    </tr>
                  ) : (
                    filteredSquads.map((p, idx) => {
                      const assignedRoom = rooms.find(r => r.id === p.roomId || r.roomLabel === p.roomLabel);
                      const isAssigned = Boolean(assignedRoom || p.roomLabel);

                      return (
                        <tr key={p.id || idx} className="hover:bg-slate-900/60 transition-colors">
                          {/* Slot Badge */}
                          <td className="px-4 py-3 text-center font-mono">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-brand-gold font-bold text-[11px]">
                              #{p.slotNumber || idx + 1}
                            </span>
                          </td>

                          {/* Squad Name */}
                          <td className="px-4 py-3 font-bold text-white">
                            <div className="text-sm">{p.squadName}</div>
                            {(p.player1Name || p.player2Name) && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[220px] font-normal mt-0.5">
                                {[p.player1Name, p.player2Name, p.player3Name, p.player4Name].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </td>

                          {/* IGL Name */}
                          <td className="px-4 py-3 text-slate-300 font-medium">
                            {p.iglName || 'Captain'}
                          </td>

                          {/* WhatsApp Chat Link */}
                          <td className="px-4 py-3 font-mono text-xs">
                            {p.captainWhatsApp ? (
                              <a
                                href={`https://wa.me/${p.captainWhatsApp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-1.5"
                                title="Open WhatsApp chat"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 inline" />
                                <span>{p.captainWhatsApp}</span>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic">No WhatsApp</span>
                            )}
                          </td>

                          {/* Room Reassignment Dropdown */}
                          <td className="px-4 py-3">
                            <select
                              value={p.roomId || p.roomLabel || ''}
                              disabled={isReassigningSquad === p.id}
                              onChange={(e) => {
                                const selectedVal = e.target.value;
                                if (!selectedVal) {
                                  handleAssignSquadToRoom(p.id, '', '', p.slotNumber);
                                } else {
                                  const targetR = rooms.find(r => r.id === selectedVal || r.roomLabel === selectedVal);
                                  if (targetR) {
                                    handleAssignSquadToRoom(p.id, targetR.id, targetR.roomLabel, p.slotNumber);
                                  }
                                }
                              }}
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                                isAssigned
                                  ? 'bg-slate-900 border-purple-800/80 text-purple-300 focus:border-purple-500'
                                  : 'bg-amber-950/40 border-amber-800/80 text-amber-300 focus:border-amber-500'
                              }`}
                            >
                              <option value="">⚠️ Unassigned</option>
                              {rooms.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final Room' : formatRoomLabel(r.roomLabel, r.roomType)}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Slot Number In Room */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={p.slotNumber || 1}
                              onChange={(e) => {
                                const newSlot = Number(e.target.value) || 1;
                                handleAssignSquadToRoom(p.id, p.roomId || '', p.roomLabel || '', newSlot);
                              }}
                              className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono font-bold text-white text-xs outline-none focus:border-purple-500"
                            />
                          </td>

                          {/* Action Delete */}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveSquad(p.id, p.squadName)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-400 transition-colors cursor-pointer"
                              title="Remove Squad from tournament"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Manual Squad Add Modal Popup */}
      {manualSquadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Squad to Group / Room</span>
              </h4>
              <button
                onClick={() => setManualSquadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Squad / Team Name *</label>
                <input
                  type="text"
                  required
                  value={manualSquadForm.squadName}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, squadName: e.target.value }))}
                  placeholder="e.g. BD TITANS ESPORTS"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">IGL / Captain Name</label>
                <input
                  type="text"
                  value={manualSquadForm.iglName}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, iglName: e.target.value }))}
                  placeholder="Captain IGN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Captain WhatsApp Number</label>
                <input
                  type="tel"
                  value={manualSquadForm.captainWhatsApp}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, captainWhatsApp: e.target.value }))}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Target Group</label>
                <select
                  value={manualSquadForm.roomId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const r = rooms.find(rm => rm.id === selId);
                    setManualSquadForm(prev => ({
                      ...prev,
                      roomId: selId,
                      roomLabel: r?.roomLabel || '1',
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-emerald-500"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final Room' : formatRoomLabel(r.roomLabel, r.roomType)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Slot Number (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={manualSquadForm.slotNumber}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, slotNumber: Number(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Player 1 (IGN)</label>
                <input
                  type="text"
                  value={manualSquadForm.player1Name}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, player1Name: e.target.value }))}
                  placeholder="Player 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Player 2 (IGN)</label>
                <input
                  type="text"
                  value={manualSquadForm.player2Name}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, player2Name: e.target.value }))}
                  placeholder="Player 2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Player 3 (IGN)</label>
                <input
                  type="text"
                  value={manualSquadForm.player3Name}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, player3Name: e.target.value }))}
                  placeholder="Player 3"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Player 4 (IGN)</label>
                <input
                  type="text"
                  value={manualSquadForm.player4Name}
                  onChange={(e) => setManualSquadForm(prev => ({ ...prev, player4Name: e.target.value }))}
                  placeholder="Player 4"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setManualSquadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddManualSquad}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Register Squad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
