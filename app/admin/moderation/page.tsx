'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  Search, 
  CheckCircle2, 
  UserX, 
  ExternalLink,
  AlertTriangle,
  Lock,
  MessageSquare,
  X,
  User,
  Mail,
  Phone,
  Wallet,
  Award,
  Ban,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';

interface FlaggedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  flagReason: string;
  createdAt: string;
}

export default function AdminChatModerationPage() {
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // User Profile Modal State
  const [selectedUserModal, setSelectedUserModal] = useState<any | null>(null);
  const [loadingUserModal, setLoadingUserModal] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const openUserProfile = async (userId: string, fallbackName?: string) => {
    setSelectedUserModal({ id: userId, name: fallbackName || 'Player' });
    setLoadingUserModal(true);
    try {
      // 1. Fetch from player lookup
      const res = await fetch(`/api/players/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setSelectedUserModal(data.user);
          return;
        }
      }
      // 2. Fallback to admin users endpoint
      const resAdmin = await fetch('/api/admin/users', { credentials: 'include' });
      if (resAdmin.ok) {
        const data = await resAdmin.json();
        const found = (data.users || []).find((u: any) => u.id === userId);
        if (found) {
          setSelectedUserModal(found);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load user profile modal:', err);
    } finally {
      setLoadingUserModal(false);
    }
  };

  const handleToggleBan = async (userId: string, currentlyBanned: boolean) => {
    if (!confirm(`Are you sure you want to ${currentlyBanned ? 'UNBAN' : 'BAN'} this user?`)) return;
    setUserActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: currentlyBanned ? 'unban' : 'ban',
          userId,
        }),
      });
      if (res.ok) {
        setSelectedUserModal((prev: any) => prev ? { ...prev, isBanned: !currentlyBanned } : null);
        alert(`User has been ${currentlyBanned ? 'unbanned' : 'banned'}.`);
      } else {
        alert('Action failed.');
      }
    } catch {
      alert('Error updating user status.');
    } finally {
      setUserActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const loadFlagged = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/messages/moderation', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFlaggedMessages(data.flaggedMessages || []);
      }
    } catch (err) {
      console.warn('Failed to load flagged messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlagged();
  }, []);

  const handleDeleteFlagged = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss and delete this violation log?')) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/messages/moderation?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadFlagged();
      } else {
        const err = await res.json();
        alert(err.message || 'Action failed.');
      }
    } catch {
      alert('Network error while deleting log.');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = flaggedMessages.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.senderName?.toLowerCase().includes(q) ||
      m.content?.toLowerCase().includes(q) ||
      m.flagReason?.toLowerCase().includes(q) ||
      m.senderId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Chat Security & Moderation Queue
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Review automatic server-blocked links, off-platform phone attempts, and repeat offenders.
          </p>
        </div>

        <button
          onClick={loadFlagged}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Blocked Violations</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{flaggedMessages.length}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Blocked External Links</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {flaggedMessages.filter((f) => f.flagReason === 'BLOCKED_LINK').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Hidden Phone/WhatsApp Numbers</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {flaggedMessages.filter((f) => f.flagReason === 'BLOCKED_PHONE').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-blue-50 text-blue-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search violations by player, content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-red-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-[#475569] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-[#0F172A] text-base">No Security Violations Logged</div>
            <div className="text-xs">Chat traffic is safe and clean.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Sender</th>
                  <th className="py-3.5 px-5">Violation Type</th>
                  <th className="py-3.5 px-5">Blocked Content</th>
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <button
                        type="button"
                        onClick={() => openUserProfile(m.senderId, m.senderName)}
                        className="font-bold text-[#0F172A] text-xs hover:text-brand-orange text-left transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.senderName}</span>
                      </button>
                      <div className="text-[10px] font-mono text-slate-500 font-bold mt-0.5">ID: {m.senderId}</div>
                    </td>

                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        m.flagReason === 'BLOCKED_LINK' 
                          ? 'bg-red-50 text-red-600 border border-red-200' 
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {m.flagReason === 'BLOCKED_LINK' ? 'External Link Attempt' : 'Phone / WhatsApp Attempt'}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-mono text-xs text-red-700 font-medium bg-red-50/70 p-2 rounded-xl border border-red-100 max-w-md break-all">
                        {m.content}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-xs text-slate-500 font-mono">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openUserProfile(m.senderId, m.senderName)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <User className="w-3 h-3 text-slate-500" />
                          <span>User Profile</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFlagged(m.id)}
                          disabled={processingId === m.id}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Dismiss / Delete Violation Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── USER PROFILE DETAILS MODAL ── */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUserModal.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedUserModal.name || selectedUserModal.id}`}
                  alt={selectedUserModal.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
                />
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-1.5">
                    <span>{selectedUserModal.inGameName || selectedUserModal.name}</span>
                  </h3>
                  <div className="text-xs font-mono text-blue-600 font-bold">
                    {selectedUserModal.accountNumber || `EZBD-${selectedUserModal.id?.substring(0, 6)?.toUpperCase() || 'MEMBER'}`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingUserModal ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
                <span className="text-xs mt-2 block font-medium">Loading user dossier...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-orange-50 text-brand-orange border border-orange-200 font-bold text-[11px]">
                    Role: {selectedUserModal.role || 'PLAYER'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl font-bold text-[11px] uppercase ${
                    selectedUserModal.isBanned
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    Status: {selectedUserModal.isBanned ? 'BANNED' : 'ACTIVE'}
                  </span>
                </div>

                {/* Details List */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Full Name:</span>
                    <span className="font-bold text-slate-900">{selectedUserModal.name || 'N/A'}</span>
                  </div>

                  {selectedUserModal.freeFireUid && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Free Fire UID:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedUserModal.freeFireUid}</span>
                    </div>
                  )}

                  {selectedUserModal.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Email:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">{selectedUserModal.email}</span>
                    </div>
                  )}

                  {selectedUserModal.accountNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Account Number:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedUserModal.accountNumber)}
                        className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{selectedUserModal.accountNumber}</span>
                        {copiedText === selectedUserModal.accountNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500 font-medium">Wallet Balance:</span>
                    <span className="font-bold text-emerald-600 text-sm">৳ {selectedUserModal.walletBalance ?? 0} BDT</span>
                  </div>

                  {selectedUserModal.totalKills !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Total Kills / Wins:</span>
                      <span className="font-bold text-slate-900">{selectedUserModal.totalKills || 0} Kills / {selectedUserModal.totalWins || 0} Wins</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={userActionLoading}
                    onClick={() => handleToggleBan(selectedUserModal.id, selectedUserModal.isBanned)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                      selectedUserModal.isBanned
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>{selectedUserModal.isBanned ? 'UNBAN PLAYER' : 'BAN PLAYER FROM PLATFORM'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/admin/conversations?search=${encodeURIComponent(selectedUserModal.accountNumber || selectedUserModal.name)}`}
                      className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Chat Monitor</span>
                    </Link>

                    <Link
                      href={`/admin/users?id=${selectedUserModal.id}`}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center border border-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Full Directory</span>
                    </Link>
                  </div>
                </div>

              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
