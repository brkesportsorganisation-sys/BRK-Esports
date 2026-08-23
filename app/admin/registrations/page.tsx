'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users, Search, Loader2, ChevronDown, ChevronRight,
  RefreshCw, Trophy, Phone, User, Shield, ArrowLeft,
  CheckCircle2, XCircle, Clock, Wallet, AlertTriangle,
  MessageSquare, Send, X, Key, Gamepad2, Copy, Check,
  Calendar, Layers, Sparkles, Filter, ExternalLink
} from 'lucide-react';

interface Registration {
  id: string;
  registrationId: string;
  teamId: string;
  tournamentId: string;
  tournamentTitle: string;
  tournamentBanner?: string;
  tournamentGame?: string;
  tournamentGameName?: string;
  entryFee: number;
  coinEntryFee?: number;
  prizePool?: number;
  maxTeams?: number;
  matchTime?: string;
  userId: string;
  userName: string;
  userEmail: string;
  squadName: string;
  iglName: string;
  captainWhatsApp: string;
  player1Name: string;
  player2Name: string;
  player3Name: string;
  player4Name: string;
  backupPlayerName: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  joinedAt: string;
}

interface TournamentSummary {
  id: string;
  title: string;
  game: string;
  gameName: string;
  banner: string;
  entryFee: number;
  coinEntryFee?: number;
  prizePool: number;
  maxTeams: number;
  registeredCount: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalCollectedFees: number;
  matchTime?: string;
  status?: string;
  registrationOpen?: boolean;
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Drilldown State: selectedTournamentId = null (Level 1: Tournaments List), or string (Level 2: Specific Tournament Slots)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // Search & Filters
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'FINISHED'>('ALL');
  
  const [slotSearch, setSlotSearch] = useState('');
  const [slotStatusFilter, setSlotStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // WhatsApp Room Modal State
  const [whatsappModal, setWhatsappModal] = useState<{
    open: boolean;
    isBroadcast: boolean;
    tournamentId?: string;
    tournamentTitle: string;
    phone: string;
    recipientName: string;
    roomId: string;
    roomPass: string;
    customNote: string;
  }>({
    open: false,
    isBroadcast: false,
    tournamentTitle: '',
    phone: '',
    recipientName: '',
    roomId: '',
    roomPass: '',
    customNote: '',
  });
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

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
      const res = await fetch('/api/admin/registrations', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setRegistrations(data.registrations || []);
        setTournaments(data.tournaments || []);
      }
    } catch (err) {
      console.warn('Failed to load registrations:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAction = async (regId: string, action: 'APPROVE' | 'REJECT', fee: number) => {
    const confirmMsg = action === 'APPROVE'
      ? `Approve this team registration slot?`
      : `Reject this team registration slot?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(regId);
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ registrationId: regId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Slot updated successfully!', 'success');
        await loadData(true);
      } else {
        showToast(data.message || 'Action failed.', 'error');
      }
    } catch {
      showToast('Network error while processing registration.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openSingleWhatsappModal = (reg: Registration) => {
    setWhatsappModal({
      open: true,
      isBroadcast: false,
      tournamentId: reg.tournamentId,
      tournamentTitle: reg.tournamentTitle,
      phone: reg.captainWhatsApp || '',
      recipientName: reg.iglName || reg.squadName || reg.userName || 'Captain',
      roomId: '',
      roomPass: '',
      customNote: '',
    });
  };

  const openBroadcastWhatsappModal = (tour: TournamentSummary) => {
    setWhatsappModal({
      open: true,
      isBroadcast: true,
      tournamentId: tour.id,
      tournamentTitle: tour.title,
      phone: '',
      recipientName: 'All Verified Captains',
      roomId: '',
      roomPass: '',
      customNote: '',
    });
  };

  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappModal.roomId.trim() || !whatsappModal.roomPass.trim()) {
      showToast('Room ID and Password are required', 'error');
      return;
    }

    if (!whatsappModal.isBroadcast && !whatsappModal.phone.trim()) {
      showToast('Captain WhatsApp phone number is required', 'error');
      return;
    }

    setSendingWhatsapp(true);
    try {
      const payload = whatsappModal.isBroadcast
        ? {
            action: 'BROADCAST',
            tournamentId: whatsappModal.tournamentId,
            tournamentTitle: whatsappModal.tournamentTitle,
            roomId: whatsappModal.roomId.trim(),
            pass: whatsappModal.roomPass.trim(),
          }
        : {
            action: 'SINGLE',
            playerPhone: whatsappModal.phone.trim(),
            playerName: whatsappModal.recipientName,
            tournamentTitle: whatsappModal.tournamentTitle,
            roomId: whatsappModal.roomId.trim(),
            pass: whatsappModal.roomPass.trim(),
            customMessage: whatsappModal.customNote.trim() || undefined,
          };

      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'WhatsApp message(s) dispatched successfully!', 'success');
        setWhatsappModal((prev) => ({ ...prev, open: false }));
      } else {
        showToast(data.message || 'Failed to send WhatsApp message.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error sending WhatsApp message.', 'error');
    } finally {
      setSendingWhatsapp(false);
    }
  };

  // Top Global Summary KPIs
  const totalTeamsRegistered = registrations.length;
  const totalPendingSlots = registrations.filter((r) => r.status === 'PENDING').length;
  const totalApprovedSlots = registrations.filter((r) => r.status === 'VERIFIED').length;
  const totalFeesCollected = registrations
    .filter((r) => r.status === 'VERIFIED')
    .reduce((acc, r) => acc + (Number(r.entryFee) || 0), 0);

  // Selected Tournament Object
  const selectedTournament = useMemo(() => {
    if (!selectedTournamentId) return null;
    return tournaments.find((t) => t.id === selectedTournamentId) || null;
  }, [selectedTournamentId, tournaments]);

  // Selected Tournament Slots
  const currentTournamentSlots = useMemo(() => {
    if (!selectedTournamentId) return [];
    return registrations.filter((r) => r.tournamentId === selectedTournamentId);
  }, [selectedTournamentId, registrations]);

  // Filtered Tournaments for Level 1 List
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(tournamentSearch.toLowerCase()) ||
        t.game.toLowerCase().includes(tournamentSearch.toLowerCase()) ||
        t.gameName.toLowerCase().includes(tournamentSearch.toLowerCase());

      if (!matchSearch) return false;

      if (tournamentStatusFilter === 'PENDING') return t.pendingCount > 0;
      if (tournamentStatusFilter === 'ACTIVE') return t.status === 'ACTIVE' || t.status === 'ONGOING' || t.status === 'UPCOMING';
      if (tournamentStatusFilter === 'FINISHED') return t.status === 'COMPLETED' || t.status === 'CANCELLED';

      return true;
    });
  }, [tournaments, tournamentSearch, tournamentStatusFilter]);

  // Filtered Slots for Level 2 Detail View
  const filteredSlots = useMemo(() => {
    return currentTournamentSlots.filter((slot) => {
      const matchSearch =
        slot.squadName.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.iglName.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.captainWhatsApp.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.player1Name.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.player2Name.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.player3Name.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.player4Name.toLowerCase().includes(slotSearch.toLowerCase()) ||
        slot.registrationId.toLowerCase().includes(slotSearch.toLowerCase());

      if (!matchSearch) return false;
      if (slotStatusFilter !== 'ALL' && slot.status !== slotStatusFilter) return false;
      return true;
    });
  }, [currentTournamentSlots, slotSearch, slotStatusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans px-4 sm:px-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 1: ALL TOURNAMENTS OVERVIEW (ডিফল্ট টুর্নামেন্ট তালিকা ভিউ) */}
      {/* ========================================================================= */}
      {!selectedTournamentId && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-[26px] sm:text-[30px] font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Layers className="w-7 h-7 text-red-600" />
                <span>Tournament Slot Registrations</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Select a tournament below to inspect registered team rosters, approve slots, and broadcast WhatsApp room details.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-500' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Total Tournaments</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">{tournaments.length}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Total Registered Teams</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-600">{totalTeamsRegistered}</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Pending Approvals</span>
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-black text-orange-600 flex items-center gap-2">
                <span>{totalPendingSlots}</span>
                {totalPendingSlots > 0 && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Confirmed Entry Fees</span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600">৳ {totalFeesCollected.toLocaleString()}</div>
            </div>
          </div>

          {/* Search & Tournament Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tournaments by title, game name..."
                value={tournamentSearch}
                onChange={(e) => setTournamentSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 shadow-xs rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 font-semibold"
              />
            </div>

            <div className="flex gap-1 bg-white border border-slate-200 shadow-xs rounded-xl p-1 shrink-0 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Tournaments' },
                { id: 'PENDING', label: `Pending Approvals (${totalPendingSlots})`, highlight: totalPendingSlots > 0 },
                { id: 'ACTIVE', label: 'Live / Upcoming' },
                { id: 'FINISHED', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTournamentStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    tournamentStatusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : tab.highlight
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
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
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="font-bold text-sm">Loading tournaments & rosters...</span>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-6">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-bold text-base text-slate-800">No Tournaments Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No tournaments match your filter. Try adjusting your search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTournaments.map((tour) => {
                const fillPercent = Math.min(100, Math.round((tour.registeredCount / (tour.maxTeams || 48)) * 100));
                
                return (
                  <div
                    key={tour.id}
                    onClick={() => setSelectedTournamentId(tour.id)}
                    className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-lg hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    {/* Card Top / Banner */}
                    <div>
                      <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                        <img
                          src={tour.banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'}
                          alt={tour.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                        
                        {/* Game Tag & Status */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md text-[10px] font-black uppercase text-white border border-white/10 tracking-wider">
                            {tour.gameName || tour.game}
                          </span>
                        </div>

                        {tour.pendingCount > 0 && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2.5 py-1 rounded-lg bg-orange-500/95 backdrop-blur-md text-[10px] font-black uppercase text-white shadow-md flex items-center gap-1.5 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>{tour.pendingCount} Pending</span>
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-white font-black text-base line-clamp-1 group-hover:text-red-400 transition-colors">
                            {tour.title}
                          </h3>
                          <div className="text-[11px] text-slate-300 font-semibold mt-0.5 flex items-center gap-2">
                            {tour.matchTime ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {new Date(tour.matchTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span>Schedule TBA</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Content & Metrics */}
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Entry Fee</div>
                            <div className="text-xs font-black text-slate-900 mt-0.5">
                              {tour.entryFee > 0 ? `৳ ${tour.entryFee} BDT` : 'FREE Entry'}
                              {tour.coinEntryFee ? ` / ${tour.coinEntryFee} 🪙` : ''}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                            <div className="text-[10px] uppercase font-bold text-amber-600">Prize Pool</div>
                            <div className="text-xs font-black text-amber-700 mt-0.5">
                              ৳ {tour.prizePool.toLocaleString()} BDT
                            </div>
                          </div>
                        </div>

                        {/* Slot Fill Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-600">Slots Filled</span>
                            <span className="text-slate-900 font-mono font-black">{tour.registeredCount} / {tour.maxTeams || 48} ({fillPercent}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                fillPercent >= 100 ? 'bg-emerald-500' : fillPercent > 50 ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Slot Summary Badges */}
                        <div className="flex items-center justify-between text-[11px] font-bold pt-1 border-t border-slate-100">
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {tour.verifiedCount} Approved
                          </span>
                          {tour.rejectedCount > 0 && (
                            <span className="text-red-500 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> {tour.rejectedCount} Rejected
                            </span>
                          )}
                          <span className="text-slate-500 font-mono">
                            Collected: ৳{tour.totalCollectedFees}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="px-5 pb-5 pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTournamentId(tour.id);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 group-hover:bg-red-600 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Manage Slots &amp; Rosters ({tour.registeredCount}) &rarr;</span>
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
      {/* LEVEL 2: TOURNAMENT SLOT DRILL-DOWN VIEW (টুর্নামেন্ট সিলেক্ট করার পর স্লট তালিকা) */}
      {/* ========================================================================= */}
      {selectedTournamentId && selectedTournament && (
        <div className="space-y-6">
          
          {/* Back Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedTournamentId(null);
                  setSlotSearch('');
                  setSlotStatusFilter('ALL');
                }}
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

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentTournamentSlots.filter((r) => r.status === 'VERIFIED').length > 0 && (
                <button
                  onClick={() => openBroadcastWhatsappModal(selectedTournament)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Broadcast Room via WhatsApp</span>
                </button>
              )}
              <button
                onClick={() => loadData(true)}
                disabled={loading}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Refresh Slots"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tournament Slot Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Registered Slots</div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {currentTournamentSlots.length} <span className="text-xs font-normal text-slate-400">/ {selectedTournament.maxTeams || 48} max</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-orange-600">Pending Approvals</div>
              <div className="text-2xl font-black text-orange-600 mt-1 font-mono">
                {currentTournamentSlots.filter((r) => r.status === 'PENDING').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Approved &amp; Confirmed</div>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                {currentTournamentSlots.filter((r) => r.status === 'VERIFIED').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-500">Collected Entry Fees</div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                ৳ {(currentTournamentSlots.filter((r) => r.status === 'VERIFIED').length * selectedTournament.entryFee).toLocaleString()} BDT
              </div>
            </div>
          </div>

          {/* Search & Slot Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search slot by squad name, IGL, player name, WhatsApp phone, ID..."
                value={slotSearch}
                onChange={(e) => setSlotSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 shadow-xs rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 font-semibold"
              />
            </div>

            <div className="flex gap-1 bg-white border border-slate-200 shadow-xs rounded-xl p-1 shrink-0 overflow-x-auto">
              {[
                { id: 'ALL', label: `All Slots (${currentTournamentSlots.length})` },
                { id: 'PENDING', label: `Pending (${currentTournamentSlots.filter((r) => r.status === 'PENDING').length})`, highlight: currentTournamentSlots.filter((r) => r.status === 'PENDING').length > 0 },
                { id: 'VERIFIED', label: `Approved (${currentTournamentSlots.filter((r) => r.status === 'VERIFIED').length})` },
                { id: 'REJECTED', label: `Rejected (${currentTournamentSlots.filter((r) => r.status === 'REJECTED').length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSlotStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    slotStatusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : tab.highlight
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slots List */}
          {filteredSlots.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-6">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="font-bold text-base text-slate-800">No Slots Found for This Filter</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No squad registered under this criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSlots.map((reg, idx) => {
                const isPending = reg.status === 'PENDING';
                const isVerified = reg.status === 'VERIFIED';
                const isRejected = reg.status === 'REJECTED';
                const isExpanded = expandedSlotId === reg.id;
                const isActing = actionLoading === reg.id;

                const formattedDate = reg.joinedAt
                  ? new Date(reg.joinedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'N/A';

                return (
                  <div
                    key={reg.id}
                    className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                      isPending ? 'border-orange-300 shadow-md shadow-orange-500/5' : isRejected ? 'border-red-200' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Slot Header Row */}
                    <div
                      onClick={() => setExpandedSlotId(isExpanded ? null : reg.id)}
                      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors flex-wrap sm:flex-nowrap"
                    >
                      {/* Slot Number */}
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black font-mono text-xs flex items-center justify-center shrink-0 shadow-xs">
                        #{idx + 1}
                      </div>

                      {/* Squad & IGL Details */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">{reg.squadName}</span>
                          
                          {/* Status Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isPending ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {isPending ? 'Pending Approval' : isVerified ? 'Approved' : 'Rejected'}
                          </span>

                          <span className="text-[11px] font-mono text-slate-400">
                            {reg.registrationId}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2 flex-wrap">
                          <span>IGL: <strong className="text-slate-800">{reg.iglName}</strong></span>
                          <span>&bull;</span>
                          <span>Players: <span className="text-slate-700">{reg.player1Name}, {reg.player2Name}, {reg.player3Name}, {reg.player4Name}</span></span>
                          {reg.backupPlayerName && <span className="text-slate-400"> (Backup: {reg.backupPlayerName})</span>}
                        </div>
                      </div>

                      {/* WhatsApp Phone */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{reg.captainWhatsApp || 'No phone'}</span>
                        {reg.captainWhatsApp && (
                          <>
                            <button
                              onClick={() => copyToClipboard(reg.captainWhatsApp)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedText === reg.captainWhatsApp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a
                              href={`https://wa.me/${reg.captainWhatsApp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>

                      {/* Date */}
                      <div className="text-[11px] text-slate-400 font-mono shrink-0 hidden md:block text-right">
                        <div>{formattedDate}</div>
                        <div className="text-[10px] text-slate-500 font-bold">Fee: ৳{reg.entryFee}</div>
                      </div>

                      {/* Actions */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 shrink-0"
                      >
                        {isPending ? (
                          <>
                            <button
                              disabled={isActing}
                              onClick={() => handleAction(reg.id, 'APPROVE', reg.entryFee)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>Approve</span>
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => handleAction(reg.id, 'REJECT', reg.entryFee)}
                              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openSingleWhatsappModal(reg)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="Send Room ID & Pass to Captain via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp Room</span>
                          </button>
                        )}

                        <div className="p-1 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Roster Drawer */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-50 border-t border-slate-200/80 space-y-4">
                        
                        {/* Pending Alert banner */}
                        {isPending && (
                          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                              <span className="text-xs font-bold text-orange-800">
                                This team registration is awaiting admin verification.
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAction(reg.id, 'APPROVE', reg.entryFee)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs"
                              >
                                Approve Slot
                              </button>
                              <button
                                onClick={() => handleAction(reg.id, 'REJECT', reg.entryFee)}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold text-xs"
                              >
                                Reject Slot
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Player Lineup Grid */}
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>Full Squad Lineup (5 Players)</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            {[
                              { role: 'IGL / Captain', name: reg.iglName, isLeader: true },
                              { role: 'Player 1', name: reg.player1Name },
                              { role: 'Player 2', name: reg.player2Name },
                              { role: 'Player 3', name: reg.player3Name },
                              { role: 'Player 4', name: reg.player4Name },
                              ...(reg.backupPlayerName ? [{ role: 'Backup Player', name: reg.backupPlayerName }] : []),
                            ].map((p) => (
                              <div
                                key={p.role}
                                className={`p-3 rounded-xl border text-center shadow-xs ${
                                  p.isLeader ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200/80'
                                }`}
                              >
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-1.5 text-slate-600">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[9px] uppercase font-black text-slate-400">{p.role}</div>
                                <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{p.name || '-'}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Registration Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Account User</div>
                            <div className="font-bold text-slate-800 mt-0.5">{reg.userName || 'Captain'}</div>
                            <div className="text-[11px] text-slate-400">{reg.userEmail}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Registration ID</div>
                            <div className="font-mono font-bold text-slate-800 mt-0.5">{reg.registrationId}</div>
                            <div className="text-[11px] text-slate-400">{formattedDate}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Fee Paid</div>
                            <div className="font-mono font-bold text-emerald-600 mt-0.5">৳ {reg.entryFee} BDT</div>
                            <div className="text-[11px] text-slate-400">Status: {reg.status}</div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* WHATSAPP ROOM ID / PASSWORD SENDER MODAL */}
      {/* ========================================================================= */}
      {whatsappModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {whatsappModal.isBroadcast ? 'Broadcast Room ID to All Verified Captains' : 'Send Room Details via WhatsApp'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {whatsappModal.tournamentTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModal((prev) => ({ ...prev, open: false }))}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendWhatsapp} className="p-6 space-y-4 text-xs font-medium">
              {!whatsappModal.isBroadcast && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Captain WhatsApp Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={whatsappModal.phone}
                      onChange={(e) => setWhatsappModal((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+88017XXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Recipient: <strong>{whatsappModal.recipientName}</strong>
                  </span>
                </div>
              )}

              {whatsappModal.isBroadcast && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <span className="font-bold block mb-0.5">📢 Broadcast Mode Enabled:</span>
                  <span>This will dispatch the Room ID & Password via WhatsApp to all <strong>approved squad captains</strong> in {whatsappModal.tournamentTitle}.</span>
                </div>
              )}

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
                      value={whatsappModal.roomId}
                      onChange={(e) => setWhatsappModal((prev) => ({ ...prev, roomId: e.target.value }))}
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
                      value={whatsappModal.roomPass}
                      onChange={(e) => setWhatsappModal((prev) => ({ ...prev, roomPass: e.target.value }))}
                      placeholder="e.g. 1234"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Custom Message / Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={whatsappModal.customNote}
                  onChange={(e) => setWhatsappModal((prev) => ({ ...prev, customNote: e.target.value }))}
                  placeholder="Leave empty to use standard BRK Esports tournament template."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModal((prev) => ({ ...prev, open: false }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingWhatsapp}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {sendingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sendingWhatsapp ? 'Dispatching...' : whatsappModal.isBroadcast ? 'Broadcast via WhatsApp' : 'Send WhatsApp Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}