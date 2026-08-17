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
  MessageSquare
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
                      <div className="font-bold text-[#0F172A] text-xs">{m.senderName}</div>
                      <div className="text-[10px] font-mono text-slate-500 font-bold">ID: {m.senderId}</div>
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
                        <Link
                          href={`/admin/users?id=${m.senderId}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          User Profile
                        </Link>
                        <button
                          onClick={() => handleDeleteFlagged(m.id)}
                          disabled={processingId === m.id}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
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

    </div>
  );
}
