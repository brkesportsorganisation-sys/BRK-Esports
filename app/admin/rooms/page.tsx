'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Key,
  Gamepad2,
  Trophy,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Shield,
  AlertTriangle,
  Loader2,
  Sparkles,
  Lock,
  Radio,
  Layers,
  Trash2,
  X,
  UserCheck
} from 'lucide-react';

interface SlotParticipant {
  id: string;
  registrationId: string;
  tournamentId: string;
  userId: string;
  squadName: string;
  iglName: string;
  captainName: string;
  captainWhatsApp: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  joinedAt: string;
}

interface TournamentRoom {
  id: string;
  title: string;
  game: string;
  gameName: string;
  banner: string;
  status: string;
  matchTime?: string;
  maxTeams: number;
  registeredCount: number;
  verifiedCount: number;
  pendingCount: number;
  roomId: string;
  roomPassword: string;
  roomEnabled: boolean;
  isRoomSet: boolean;
  slots: SlotParticipant[];
}

export default function AdminRoomsPage() {
  const [tournaments, setTournaments] = useState<TournamentRoom[]>([]);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    roomsReleased: 0,
    roomsPending: 0,
    totalCaptains: 0,
  });
  const [loading, setLoading] = useState(true);

  // Selected Tournament Drill-down
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_ROOM' | 'RELEASED_ROOM' | 'ACTIVE'>('ALL');

  // Room Form State for Selected Tournament
  const [formRoomId, setFormRoomId] = useState('');
  const [formRoomPass, setFormRoomPass] = useState('');
  const [formCustomNote, setFormCustomNote] = useState('');
  const [savingDb, setSavingDb] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Single Captain WhatsApp Modal
  const [singleWhatsappModal, setSingleWhatsappModal] = useState<{
    open: boolean;
    recipientName: string;
    phone: string;
    squadName: string;
    roomId: string;
    roomPass: string;
    customNote: string;
  }>({
    open: false,
    recipientName: '',
    phone: '',
    squadName: '',
    roomId: '',
    roomPass: '',
    customNote: '',
  });
  const [sendingSingle, setSendingSingle] = useState(false);

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedText(null), 2000);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/rooms', { 
        credentials: 'include',
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTournaments(data.tournaments || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.message || 'Failed to load tournament rooms.', 'error');
      }
    } catch (err) {
      console.warn('Load rooms error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const selectedTournament = useMemo(() => {
    if (!selectedTourId) return null;
    return tournaments.find((t) => t.id === selectedTourId) || null;
  }, [selectedTourId, tournaments]);

  // Sync form inputs when selected tournament changes
  useEffect(() => {
    if (selectedTournament) {
      setFormRoomId(selectedTournament.roomId || '');
      setFormRoomPass(selectedTournament.roomPassword || '');
      setFormCustomNote('');
    }
  }, [selectedTournament]);

  // Handle Save to Database (and optional WhatsApp broadcast)
  const handleSaveRoom = async (broadcastWhatsApp: boolean) => {
    if (!selectedTournament) return;
    if (!formRoomId.trim() || !formRoomPass.trim()) {
      showToast('Both Custom Room ID and Password are required.', 'error');
      return;
    }

    if (broadcastWhatsApp) {
      setBroadcasting(true);
    } else {
      setSavingDb(true);
    }

    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          roomId: formRoomId.trim(),
          roomPassword: formRoomPass.trim(),
          broadcastWhatsApp,
          customMessage: formCustomNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Room ID and Password saved successfully!', 'success');
        await loadData(true);
      } else {
        showToast(data.message || 'Failed to save room details.', 'error');
      }
    } catch {
      showToast('Network error while saving room details.', 'error');
    } finally {
      setSavingDb(false);
      setBroadcasting(false);
    }
  };

  // Handle Clear Room Credentials
  const handleClearRoom = async () => {
    if (!selectedTournament) return;
    if (!confirm(`Are you sure you want to clear Room ID and Password for "${selectedTournament.title}" from the database?`)) return;

    setClearing(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          action: 'CLEAR',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Room ID & Password cleared from database.', 'success');
        setFormRoomId('');
        setFormRoomPass('');
        await loadData(true);
      } else {
        showToast(data.message || 'Failed to clear room.', 'error');
      }
    } catch {
      showToast('Network error while clearing room.', 'error');
    } finally {
      setClearing(false);
    }
  };

  // Handle Send to Single Captain Modal
  const openSingleCaptainModal = (slot: SlotParticipant) => {
    setSingleWhatsappModal({
      open: true,
      recipientName: slot.captainName || slot.iglName || slot.squadName,
      phone: slot.captainWhatsApp || '',
      squadName: slot.squadName,
      roomId: formRoomId.trim() || selectedTournament?.roomId || '',
      roomPass: formRoomPass.trim() || selectedTournament?.roomPassword || '',
      customNote: '',
    });
  };

  const handleSendSingleWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleWhatsappModal.phone.trim()) {
      showToast('Captain WhatsApp phone number is required', 'error');
      return;
    }
    if (!singleWhatsappModal.roomId.trim() || !singleWhatsappModal.roomPass.trim()) {
      showToast('Room ID and Password are required', 'error');
      return;
    }

    setSendingSingle(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'SINGLE',
          playerPhone: singleWhatsappModal.phone.trim(),
          playerName: singleWhatsappModal.recipientName,
          tournamentTitle: selectedTournament?.title || 'EZBD Tournament',
          roomId: singleWhatsappModal.roomId.trim(),
          pass: singleWhatsappModal.roomPass.trim(),
          customMessage: singleWhatsappModal.customNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'WhatsApp message sent to captain successfully!', 'success');
        setSingleWhatsappModal((prev) => ({ ...prev, open: false }));
      } else {
        showToast(data.message || 'Failed to send WhatsApp message.', 'error');
      }
    } catch {
      showToast('Network error sending WhatsApp message.', 'error');
    } finally {
      setSendingSingle(false);
    }
  };

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.roomId.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'PENDING_ROOM') return !t.isRoomSet;
      if (statusFilter === 'RELEASED_ROOM') return t.isRoomSet;
      if (statusFilter === 'ACTIVE') return t.status === 'ACTIVE' || t.status === 'ONGOING' || t.status === 'UPCOMING';

      return true;
    });
  }, [tournaments, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans px-4 sm:px-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 1: ALL TOURNAMENTS ROOMS DIRECTORY */}
      {/* ========================================================================= */}
      {!selectedTourId && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-[26px] sm:text-[30px] font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Key className="w-7 h-7 text-emerald-600" />
                <span>Room ID &amp; Password Dispatch</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Save match Room ID and Password directly to Database. Instantly displays on player match screen and broadcasts to Captain WhatsApp numbers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Total Tournaments</span>
                <Trophy className="w-4 h-4 text-pink-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalTournaments}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-600">Rooms Released (Live)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{stats.roomsReleased}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-600">Pending Room ID</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 flex items-center gap-2">
                <span>{stats.roomsPending}</span>
                {stats.roomsPending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Confirmed Captains</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-600">{stats.totalCaptains}</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tournament by title, game, Room ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 shadow-xs rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div className="flex gap-1 bg-white border border-slate-200 shadow-xs rounded-xl p-1 shrink-0 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Tournaments' },
                { id: 'PENDING_ROOM', label: `Pending Room (${stats.roomsPending})`, highlight: stats.roomsPending > 0 },
                { id: 'RELEASED_ROOM', label: `Rooms Released (${stats.roomsReleased})` },
                { id: 'ACTIVE', label: 'Live / Upcoming' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : tab.highlight
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tournaments Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-500 bg-white rounded-3xl border border-slate-200/80">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="font-bold text-sm">Loading tournament room tables...</span>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-6">
              <Key className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-bold text-base text-slate-800">No Tournaments Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No tournaments match your filter. Try adjusting your search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTournaments.map((tour) => {
                const fillPercent = Math.min(100, Math.round((tour.registeredCount / (tour.maxTeams || 12)) * 100));

                return (
                  <div
                    key={tour.id}
                    onClick={() => setSelectedTourId(tour.id)}
                    className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Banner Header */}
                      <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                        <img
                          src={tour.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
                          alt={tour.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                        
                        {/* Game Tag */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md text-[10px] font-black uppercase text-white border border-white/10 tracking-wider">
                            {tour.gameName || tour.game}
                          </span>
                        </div>

                        {/* Room Status Badge */}
                        <div className="absolute top-3 right-3">
                          {tour.isRoomSet ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase shadow-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Room Live</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase shadow-md flex items-center gap-1 animate-pulse">
                              <Lock className="w-3 h-3" />
                              <span>Room Pending</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-white font-black text-base line-clamp-1 group-hover:text-emerald-400 transition-colors">
                            {tour.title}
                          </h3>
                          <div className="text-[11px] text-slate-300 font-semibold mt-0.5 flex items-center gap-2">
                            <span>Schedule: {tour.matchTime ? new Date(tour.matchTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBA'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-5 space-y-3.5">
                        
                        {/* Room ID State Pill */}
                        <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                          tour.isRoomSet
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/60 border-amber-200 text-amber-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Key className={`w-4 h-4 ${tour.isRoomSet ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <div>
                              <div className="text-[10px] uppercase font-black tracking-wider text-slate-500">Room Status</div>
                              <div className="text-xs font-bold font-mono mt-0.5">
                                {tour.isRoomSet ? (
                                  <span>ID: <strong className="text-emerald-700">{tour.roomId}</strong> • Pass: <strong className="text-emerald-700">{tour.roomPassword}</strong></span>
                                ) : (
                                  <span className="text-amber-700 font-sans font-semibold">Not Released Yet</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                            tour.isRoomSet ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-amber-200 text-amber-700'
                          }`}>
                            {tour.isRoomSet ? 'Unlocked' : 'Locked'}
                          </span>
                        </div>

                        {/* Slots Progress */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-600">Registered Slots</span>
                            <span className="text-slate-900 font-mono font-black">{tour.registeredCount} / {tour.maxTeams} Teams ({fillPercent}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                fillPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Captains Counter */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-100">
                          <span className="text-emerald-600 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> {tour.verifiedCount} Verified Captains
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp Ready
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Footer Button */}
                    <div className="px-5 pb-5 pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTourId(tour.id);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Manage Room &amp; Captains ({tour.registeredCount}) &rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: TOURNAMENT ROOM MANAGEMENT & DISPATCH CENTER */}
      {/* ========================================================================= */}
      {selectedTourId && selectedTournament && (
        <div className="space-y-6">
          
          {/* Back Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTourId(null)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                title="Back to All Tournaments"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-[10px] font-black uppercase text-white">
                    {selectedTournament.gameName || selectedTournament.game}
                  </span>
                  <span className="text-xs font-bold text-slate-400">&bull;</span>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedTournament.matchTime ? new Date(selectedTournament.matchTime).toLocaleString() : 'Schedule TBA'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {selectedTournament.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Top 2 Columns: Room Credential Box + Live User Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box (7 cols): Room Credentials Database Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Custom Match Room Credentials</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Values entered here save directly to Supabase Database for this tournament.
                    </p>
                  </div>
                </div>

                {selectedTournament.isRoomSet && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live in DB
                  </span>
                )}
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Custom Room ID *
                    </label>
                    <div className="relative">
                      <Gamepad2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. 8492048"
                        value={formRoomId}
                        onChange={(e) => setFormRoomId(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Room Password *
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. 1234"
                        value={formRoomPass}
                        onChange={(e) => setFormRoomPass(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Match Instructions (Optional note for WhatsApp broadcast)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Join slot on time. Gun attributes OFF. Emotes allowed."
                    value={formCustomNote}
                    onChange={(e) => setFormCustomNote(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-medium resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingDb || broadcasting}
                    onClick={() => handleSaveRoom(false)}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {savingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span>{savingDb ? 'Saving to Database...' : 'Save to Database (Unlock Player Screen)'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={savingDb || broadcasting || selectedTournament.verifiedCount === 0}
                    onClick={() => handleSaveRoom(true)}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    title={`Broadcast to all ${selectedTournament.verifiedCount} verified captains on WhatsApp`}
                  >
                    {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    <span>{broadcasting ? 'Broadcasting...' : `Save & Broadcast WhatsApp (${selectedTournament.verifiedCount})`}</span>
                  </button>

                  {selectedTournament.isRoomSet && (
                    <button
                      type="button"
                      disabled={clearing}
                      onClick={handleClearRoom}
                      className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                      title="Clear Room ID & Password from database"
                    >
                      {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Box (5 cols): Live Player Interface Preview */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Live Player Match Screen Preview</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">/tournaments/{selectedTournament.id}</span>
                </div>

                <p className="text-[11px] text-slate-500 font-medium mt-2 mb-3">
                  Here is how the Room ID widget looks in real-time to registered players:
                </p>

                {/* EXACT COMPACT USER-FACING PREVIEW MATCHING USER SCREENSHOT */}
                <div className="p-4 bg-gradient-to-br from-white via-orange-50/20 to-red-50/30 border border-orange-200/90 rounded-2xl shadow-2xs space-y-3 text-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-orange-100 text-brand-orange">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>Match Room Slots</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold">
                            {selectedTournament.registeredCount}/{selectedTournament.maxTeams} Filled
                          </span>
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* UNLOCKED VS LOCKED PREVIEW */}
                  {formRoomId.trim() ? (
                    <div className="grid grid-cols-2 gap-2 pt-0.5 animate-in fade-in">
                      <div className="p-2.5 bg-white border border-orange-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Room ID</span>
                          <span className="text-xs font-mono font-black text-brand-orange tracking-wider">{formRoomId}</span>
                        </div>
                        <span className="p-1.5 bg-orange-50 text-brand-orange rounded-lg text-xs font-bold">
                          <Copy className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Password</span>
                          <span className="text-xs font-mono font-black text-slate-900 tracking-wider">{formRoomPass || '1234'}</span>
                        </div>
                        <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                          <Copy className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-white/90 border border-slate-200/80 rounded-xl flex items-center justify-between text-[11px] text-slate-600 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Room ID &amp; Password unlocks <strong>15 mins before match</strong> for registered players.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <span>Database Sync Status:</span>
                <strong className={selectedTournament.isRoomSet ? 'text-emerald-600 font-mono' : 'text-amber-600 font-mono'}>
                  {selectedTournament.isRoomSet ? `ID: ${selectedTournament.roomId}` : 'NOT SAVED YET'}
                </strong>
              </div>
            </div>

          </div>

          {/* Bottom Table: Slot List & Captain WhatsApp Contacts */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Registered Squads &amp; Captain WhatsApp Contacts</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold">
                    {selectedTournament.slots.length} Teams
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Direct WhatsApp numbers and roster status for each registered slot.
                </p>
              </div>

              {selectedTournament.verifiedCount > 0 && formRoomId.trim() && (
                <button
                  type="button"
                  disabled={broadcasting}
                  onClick={() => handleSaveRoom(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Broadcast Room to All ({selectedTournament.verifiedCount}) Captains</span>
                </button>
              )}
            </div>

            {selectedTournament.slots.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No teams registered yet for this tournament.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase font-black text-slate-400">
                      <th className="py-3 px-3">Slot</th>
                      <th className="py-3 px-3">Squad Name</th>
                      <th className="py-3 px-3">IGL / Captain</th>
                      <th className="py-3 px-3">WhatsApp Number</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">WhatsApp Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTournament.slots.map((slot, idx) => {
                      const isVerified = slot.status === 'VERIFIED';
                      const cleanPhone = slot.captainWhatsApp.replace(/\D/g, '');

                      return (
                        <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Slot # */}
                          <td className="py-3.5 px-3 font-mono font-black text-slate-900">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs">
                              #{idx + 1}
                            </span>
                          </td>

                          {/* Squad Name */}
                          <td className="py-3.5 px-3">
                            <div className="font-black text-slate-900 text-sm">{slot.squadName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{slot.registrationId}</div>
                          </td>

                          {/* IGL / Captain */}
                          <td className="py-3.5 px-3 font-bold text-slate-800">
                            {slot.captainName || slot.iglName || '-'}
                          </td>

                          {/* WhatsApp Phone */}
                          <td className="py-3.5 px-3">
                            {slot.captainWhatsApp ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-slate-800">{slot.captainWhatsApp}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(slot.captainWhatsApp)}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copy Phone Number"
                                >
                                  {copiedText === slot.captainWhatsApp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                  title="Chat with Captain on WhatsApp"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">No phone</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              slot.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {slot.status}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => openSingleCaptainModal(slot)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all ml-auto cursor-pointer"
                              title="Send Room ID & Password to Captain via WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Send Room Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE CAPTAIN WHATSAPP DISPATCH MODAL */}
      {/* ========================================================================= */}
      {singleWhatsappModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Send Room Credentials via WhatsApp</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Squad: <strong>{singleWhatsappModal.squadName}</strong> ({singleWhatsappModal.recipientName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSingleWhatsappModal((prev) => ({ ...prev, open: false }))}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendSingleWhatsapp} className="p-6 space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Captain WhatsApp Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={singleWhatsappModal.phone}
                    onChange={(e) => setSingleWhatsappModal((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+88017XXXXXXXX"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Custom Room ID *
                  </label>
                  <div className="relative">
                    <Gamepad2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={singleWhatsappModal.roomId}
                      onChange={(e) => setSingleWhatsappModal((prev) => ({ ...prev, roomId: e.target.value }))}
                      placeholder="e.g. 8492048"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Room Password *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={singleWhatsappModal.roomPass}
                      onChange={(e) => setSingleWhatsappModal((prev) => ({ ...prev, roomPass: e.target.value }))}
                      placeholder="e.g. 1234"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Custom Match Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={singleWhatsappModal.customNote}
                  onChange={(e) => setSingleWhatsappModal((prev) => ({ ...prev, customNote: e.target.value }))}
                  placeholder="Leave empty to use standard EZBD Esports tournament template."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSingleWhatsappModal((prev) => ({ ...prev, open: false }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingSingle}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {sendingSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sendingSingle ? 'Dispatching...' : 'Send WhatsApp Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
