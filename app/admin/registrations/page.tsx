'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Search, Loader2, ChevronDown, ChevronRight,
  Download, RefreshCw, Trophy, Phone, User, Shield,
  CheckCircle2, XCircle, Clock, Wallet, AlertTriangle,
  MessageSquare, Send, X, Key, Gamepad2
} from 'lucide-react';

interface Registration {
  id: string;
  registrationId: string;
  teamId: string;
  tournamentId: string;
  tournamentTitle: string;
  entryFee: number;
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

const STATUS_CONFIG = {
  PENDING: {
    label: 'PENDING',
    icon: 'clock',
    badgeClass: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
    rowBorderClass: 'border-yellow-500/40',
  },
  VERIFIED: {
    label: 'CONFIRMED',
    icon: 'check',
    badgeClass: 'bg-green-900/30 text-green-400 border-green-500/30',
    rowBorderClass: 'border-slate-700/50',
  },
  REJECTED: {
    label: 'REJECTED',
    icon: 'x',
    badgeClass: 'bg-red-900/30 text-red-400 border-red-500/30',
    rowBorderClass: 'border-red-500/20',
  },
};

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tournamentFilter, setTournamentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

  const openBroadcastWhatsappModal = (tournamentTitle: string, sampleReg: Registration) => {
    setWhatsappModal({
      open: true,
      isBroadcast: true,
      tournamentId: sampleReg.tournamentId,
      tournamentTitle: tournamentTitle,
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
      showToast('Player WhatsApp phone number is required', 'error');
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


  const loadRegistrations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/registrations', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setRegistrations(data.registrations || []);
        setLastRefresh(new Date());
      }
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    void loadRegistrations();
    const interval = setInterval(() => void loadRegistrations(true), 30000);
    return () => clearInterval(interval);
  }, [loadRegistrations]);

  const handleAction = async (regId: string, action: 'APPROVE' | 'REJECT', entryFee: number) => {
    const confirmMsg = action === 'APPROVE'
      ? `Approve this registration? Entry fee of BDT ${entryFee} will be deducted from the player wallet.`
      : `Reject this registration? No wallet deduction will be made.`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(regId);
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: regId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Action successful!', 'success');
        await loadRegistrations(true);
      } else {
        showToast(data.message || 'Something went wrong.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Registration ID', 'Tournament', 'Squad Name', 'IGL', 'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Backup', 'Captain', 'WhatsApp', 'Entry Fee', 'Status', 'Registered At'].join(','),
      ...registrations.map((r) => [
        r.registrationId, `"${r.tournamentTitle}"`, `"${r.squadName}"`,
        r.iglName, r.player1Name, r.player2Name, r.player3Name, r.player4Name,
        r.backupPlayerName || '-', r.userName, r.captainWhatsApp,
        r.entryFee, r.status, new Date(r.joinedAt).toLocaleString()
      ].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `registrations_${Date.now()}.csv`;
    a.click();
  };

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length;
  const verifiedCount = registrations.filter(r => r.status === 'VERIFIED').length;
  const rejectedCount = registrations.filter(r => r.status === 'REJECTED').length;

  const tournaments = ['ALL', ...Array.from(new Set(registrations.map((r) => r.tournamentTitle)))];

  const filtered = registrations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || `${r.squadName} ${r.iglName} ${r.userName} ${r.captainWhatsApp} ${r.registrationId} ${r.player1Name} ${r.player2Name} ${r.player3Name} ${r.player4Name}`
      .toLowerCase().includes(q);
    const matchTournament = tournamentFilter === 'ALL' || r.tournamentTitle === tournamentFilter;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchTournament && matchStatus;
  });

  const grouped = filtered.reduce<Record<string, Registration[]>>((acc, r) => {
    if (!acc[r.tournamentTitle]) acc[r.tournamentTitle] = [];
    acc[r.tournamentTitle].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 flex flex-col font-body pb-20 lg:pb-0">

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:'24px',right:'24px',zIndex:9999,display:'flex',alignItems:'center',gap:'8px'}}
          className={`px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-8 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-red-500" />
              </div>
              <h1 className="font-heading font-black text-2xl text-slate-900">REGISTERED TEAMS</h1>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-extrabold border border-blue-100">
                {registrations.length} Total
              </span>
              {pendingCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-extrabold border border-orange-200">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              All tournament registrations &bull; Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void loadRegistrations()} className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Refresh
            </button>
            <button onClick={handleExport} className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 transition-colors">
              <Download className="w-3.5 h-3.5 text-orange-500" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">



        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Teams', value: registrations.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Pending', value: pendingCount, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
            { label: 'Approved', value: verifiedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Rejected', value: rejectedCount, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
            { label: 'Confirmed Fees', value: `BDT ${registrations.filter(r => r.status === 'VERIFIED').reduce((a, r) => a + r.entryFee, 0).toLocaleString()}`, color: 'text-slate-900', bg: 'bg-slate-50', border: 'border-slate-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 border shadow-sm ${s.border} ${s.bg} text-center`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{s.label}</div>
              <div className={`text-2xl font-heading font-extrabold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search squad, IGL, player name, WhatsApp, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 shadow-sm rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 font-medium"
            />
          </div>
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300 min-w-[200px] font-semibold"
          >
            {tournaments.map((t) => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Tournaments' : t}</option>
            ))}
          </select>
          {/* Status Filter Tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 shadow-sm rounded-xl p-1">
            {[
              { value: 'ALL', label: 'All' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'VERIFIED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === opt.value
                    ? 'bg-red-500 text-white shadow'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {opt.label}
                {opt.value === 'PENDING' && pendingCount > 0 && (
                  <span className="ml-1 bg-orange-500 text-white rounded-full text-[9px] px-1.5 py-0.5">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading registrations...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <div className="font-heading font-bold text-lg text-slate-700">No registrations found</div>
            <div className="text-sm mt-1">When players register for tournaments, they will appear here.</div>
          </div>
        ) : tournamentFilter === 'ALL' ? (
          <div className="space-y-8">
            {Object.entries(grouped).map(([tournamentTitle, regs]) => (
              <div key={tournamentTitle}>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-heading font-extrabold text-slate-900 text-base">{tournamentTitle}</div>
                    <div className="text-xs text-slate-500 font-medium">{regs.length} team{regs.length > 1 ? 's' : ''} &bull; Entry Fee: BDT {regs[0].entryFee}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {regs.filter(r => r.status === 'VERIFIED').length > 0 && (
                      <button
                        onClick={() => openBroadcastWhatsappModal(tournamentTitle, regs[0])}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Broadcast Room via WhatsApp</span>
                      </button>
                    )}
                    {regs.filter(r => r.status === 'PENDING').length > 0 && (
                      <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200">
                        {regs.filter(r => r.status === 'PENDING').length} Pending
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-200">
                      {regs.length} Teams
                    </span>
                  </div>
                </div>
                <RegistrationTable
                  regs={regs}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  actionLoading={actionLoading}
                  onAction={handleAction}
                  onOpenWhatsapp={openSingleWhatsappModal}
                />
              </div>
            ))}
          </div>
        ) : (
          <RegistrationTable
            regs={filtered}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            actionLoading={actionLoading}
            onAction={handleAction}
            onOpenWhatsapp={openSingleWhatsappModal}
          />
        )}

        {/* WhatsApp Room ID / Password Sender Modal */}
        {whatsappModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-slate-900 text-base">
                      {whatsappModal.isBroadcast ? 'Broadcast Room ID to All Teams' : 'Send Room Details via WhatsApp'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {whatsappModal.tournamentTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsappModal((prev) => ({ ...prev, open: false }))}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80"
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
                    <span className="font-bold block">📢 Broadcast Mode Enabled:</span>
                    <span>This will deliver the Room ID & Password via WhatsApp to all <strong>verified squad captains</strong> in {whatsappModal.tournamentTitle}.</span>
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
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingWhatsapp}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {sendingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{sendingWhatsapp ? 'Sending via Zavu...' : whatsappModal.isBroadcast ? 'Broadcast via WhatsApp' : 'Send WhatsApp Message'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function RegistrationTable({
  regs,
  expandedId,
  setExpandedId,
  actionLoading,
  onAction,
  onOpenWhatsapp,
}: {
  regs: Registration[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  actionLoading: string | null;
  onAction: (id: string, action: 'APPROVE' | 'REJECT', fee: number) => void;
  onOpenWhatsapp: (reg: Registration) => void;
}) {
  return (
    <div className="space-y-2">
      {regs.map((reg, idx) => {
        const cfg = STATUS_CONFIG[reg.status];
        const isPending = reg.status === 'PENDING';
        const isActing = actionLoading === reg.id;

        return (
          <div key={reg.id} className={`bg-white rounded-2xl border overflow-hidden transition-all shadow-sm ${isPending ? 'border-orange-200 shadow-md shadow-orange-500/10' : reg.status === 'REJECTED' ? 'border-red-200' : 'border-slate-200'} hover:border-red-300`}>
            {/* Main Row */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-extrabold text-slate-700">#{idx + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-extrabold text-slate-900 text-sm">{reg.squadName}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    reg.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    reg.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {reg.status === 'PENDING' ? 'PENDING APPROVAL' : reg.status === 'VERIFIED' ? 'APPROVED' : 'REJECTED'}
                  </span>
                  {isPending && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100/50 text-orange-600 border border-orange-200 text-[10px] font-bold">
                      BDT {reg.entryFee} pending
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  IGL: <span className="text-slate-900 font-semibold">{reg.iglName}</span>
                  {' '}&bull;{' '}
                  <span className="text-slate-600">{reg.player1Name}, {reg.player2Name}, {reg.player3Name}, {reg.player4Name}</span>
                  {reg.backupPlayerName && <span className="text-slate-500"> (Backup: {reg.backupPlayerName})</span>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {isPending ? (
                  <>
                    <button
                      disabled={isActing}
                      onClick={() => onAction(reg.id, 'APPROVE', reg.entryFee)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      disabled={isActing}
                      onClick={() => onAction(reg.id, 'REJECT', reg.entryFee)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onOpenWhatsapp(reg)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shadow-xs"
                    title="Send Room ID & Pass to Captain via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Room</span>
                  </button>
                )}
              </div>

              <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                <div className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                  <Phone className="w-3 h-3" /> {reg.captainWhatsApp}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 font-medium">
                  {new Date(reg.joinedAt).toLocaleDateString()} {new Date(reg.joinedAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="shrink-0 ml-1">
                {expandedId === reg.id
                  ? <ChevronDown className="w-4 h-4 text-slate-600" />
                  : <ChevronRight className="w-4 h-4 text-slate-600" />}
              </div>
            </div>

            {/* Expanded Detail */}
            {expandedId === reg.id && (
              <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-4 shadow-inner">

                {/* Pending Action Banner */}
                {isPending && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <div className="text-orange-700 font-bold text-sm">Awaiting Admin Approval</div>
                        <div className="text-orange-600 text-xs mt-0.5 font-medium">BDT {reg.entryFee} will be deducted from wallet on approval. Rejecting will not charge the player.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={!!actionLoading}
                        onClick={() => onAction(reg.id, 'APPROVE', reg.entryFee)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                      >
                        {actionLoading === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => onAction(reg.id, 'REJECT', reg.entryFee)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white border border-red-600 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                      >
                        {actionLoading === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Squad Identity */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Squad Identity
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'Squad Name', value: reg.squadName, highlight: true },
                      { label: 'Registration ID', value: reg.registrationId, mono: true },
                      { label: 'Team ID', value: reg.teamId, mono: true },
                      { label: 'Registered On', value: new Date(reg.joinedAt).toLocaleString() },
                      { label: 'Entry Fee', value: `BDT ${reg.entryFee}` },
                      { label: 'Status', value: isPending ? 'Pending Approval' : reg.status === 'VERIFIED' ? 'Approved' : 'Rejected' },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{item.label}</div>
                        <div className={`text-sm font-semibold break-all ${(item as any).mono ? 'font-mono text-slate-600 text-xs' : (item as any).highlight ? 'text-slate-900 font-black' : 'text-slate-700'}`}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Player Lineup */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Player Lineup
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {[
                      { role: 'IGL / Captain', name: reg.iglName, color: 'text-slate-900', border: 'border-slate-300 bg-slate-50', iconColor: 'text-slate-500' },
                      { role: 'Player 1', name: reg.player1Name, color: 'text-slate-700', border: 'border-slate-200 bg-white', iconColor: 'text-slate-400' },
                      { role: 'Player 2', name: reg.player2Name, color: 'text-slate-700', border: 'border-slate-200 bg-white', iconColor: 'text-slate-400' },
                      { role: 'Player 3', name: reg.player3Name, color: 'text-slate-700', border: 'border-slate-200 bg-white', iconColor: 'text-slate-400' },
                      { role: 'Player 4', name: reg.player4Name, color: 'text-slate-700', border: 'border-slate-200 bg-white', iconColor: 'text-slate-400' },
                      ...(reg.backupPlayerName ? [{ role: 'Backup', name: reg.backupPlayerName, color: 'text-slate-500', border: 'border-slate-200 bg-slate-50', iconColor: 'text-slate-400' }] : []),
                    ].map((p) => (
                      <div key={p.role} className={`p-3 rounded-xl border ${p.border} text-center shadow-sm`}>
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 border border-slate-200">
                          <User className={`w-4 h-4 ${p.iconColor}`} />
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">{p.role}</div>
                        <div className={`text-xs font-bold ${p.color}`}>{p.name || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact & WhatsApp Action */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> Contact & WhatsApp Dispatch
                    </div>
                    <button
                      onClick={() => onOpenWhatsapp(reg)}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send Room Details to WhatsApp</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'Registered User', value: reg.userName },
                      { label: 'Email', value: reg.userEmail },
                      { label: 'Captain WhatsApp', value: reg.captainWhatsApp },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{item.label}</div>
                        <div className="text-sm font-semibold text-slate-800 break-all">{item.value || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}