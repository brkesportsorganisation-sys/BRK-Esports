'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  RefreshCw,
  User,
  Phone,
  Unlock,
  Send,
  Loader2,
  ExternalLink,
  Ban,
  CheckCircle2,
  MessageCircle,
  Eye,
  Info
} from 'lucide-react';

export default function AdminConversationsMonitorPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    totalUnlocks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Selected thread state
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [customWarning, setCustomWarning] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async (query = '') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/conversations?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (convId: string) => {
    try {
      setLoadingThread(true);
      const res = await fetch(`/api/admin/conversations?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveThread(data.conversation || null);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      fetchThread(selectedConvId);
    } else {
      setActiveThread(null);
      setMessages([]);
    }
  }, [selectedConvId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchConversations(search);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/conversations?messageId=${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        alert('Failed to delete message.');
      }
    } catch {
      alert('Error deleting message.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteThread = async (convId: string) => {
    if (!confirm('Are you sure you want to delete this ENTIRE conversation thread and all its messages?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/conversations?conversationId=${convId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedConvId(null);
        setActiveThread(null);
        setMessages([]);
        fetchConversations(search);
      } else {
        alert('Failed to delete conversation.');
      }
    } catch {
      alert('Error deleting conversation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendWarning = async () => {
    if (!selectedConvId) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_warning',
          conversationId: selectedConvId,
          warningText: customWarning,
        }),
      });

      if (res.ok) {
        setCustomWarning('');
        fetchThread(selectedConvId);
        alert('🛡️ Moderation warning delivered to the chat thread!');
      } else {
        alert('Failed to send warning.');
      }
    } catch {
      alert('Error sending warning.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to BAN player "${userName}" from EZBD Esports?`)) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban_user',
          targetUserId: userId,
        }),
      });

      if (res.ok) {
        alert(`Player "${userName}" has been banned.`);
        if (selectedConvId) fetchThread(selectedConvId);
      } else {
        alert('Failed to ban user.');
      }
    } catch {
      alert('Error banning user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="font-heading font-black text-xl text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-sky-500" />
              <span>User Inbox &amp; Chat Monitor (💬)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Real-time security surveillance, foul language prevention &amp; conversation audit across all player chats.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchConversations(search)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Chats</span>
          </button>
        </div>

        {/* ── TOP STATS BAR ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Conversations</div>
              <div className="text-2xl font-black text-slate-900 font-heading">{stats.totalConversations}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Messages Sent</div>
              <div className="text-2xl font-black text-slate-900 font-heading">{stats.totalMessages}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Unlock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unlocked Contacts</div>
              <div className="text-2xl font-black text-slate-900 font-heading">{stats.totalUnlocks}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Security Filter</div>
              <div className="text-xs font-black text-emerald-600 flex items-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Links, Phones &amp; Profanity Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN TWO-COLUMN MONITOR LAYOUT ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row h-[750px]">
          
          {/* ── LEFT PANEL: Conversation Thread List ── */}
          <div className="w-full lg:w-96 border-r border-slate-200 flex flex-col bg-white shrink-0">
            
            {/* Search & Refresh */}
            <div className="p-4 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-orange" />
                  <span>All Active Threads</span>
                </h3>
                <button
                  type="button"
                  onClick={() => fetchConversations(search)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Refresh List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name or EZBD ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange"
                />
              </form>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
                  <span className="text-xs mt-2 block font-medium">Loading conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium space-y-2">
                  <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <div>No conversations found.</div>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`p-3.5 cursor-pointer transition-all hover:bg-slate-50 ${
                        isSelected ? 'bg-orange-50/70 border-l-4 border-brand-orange' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          <span>{conv.buyer?.name || conv.buyerName}</span>
                          <span className="text-slate-400 font-normal mx-1">↔</span>
                          <span>{conv.seller?.name || conv.sellerName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(conv.lastMessageAt || conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-600 font-bold mb-1">
                        <span>{conv.buyer?.accountNumber || 'EZBD-USER'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{conv.seller?.accountNumber || 'EZBD-USER'}</span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {conv.lastMessage || 'No messages yet.'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* ── RIGHT PANEL: Thread Inspector & Live Moderation ── */}
          <div className="flex-1 flex flex-col bg-[#F8FAFC]">
            {selectedConvId && activeThread ? (
              <>
                {/* Thread Header: Participants Info */}
                <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-6">
                    {/* Buyer */}
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {activeThread.buyer?.name?.[0]?.toUpperCase() || 'B'}
                      </div>
                      <div>
                        <div className="font-heading font-black text-xs text-slate-900 flex items-center gap-1">
                          <span>{activeThread.buyer?.name || activeThread.buyerName}</span>
                          {activeThread.buyer?.isBanned && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono font-bold">BANNED</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-blue-600 font-bold">
                          {activeThread.buyer?.accountNumber || 'EZBD-MEMBER'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBanUser(activeThread.buyer?.id || activeThread.buyerId, activeThread.buyer?.name || activeThread.buyerName)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Ban User"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-slate-300 font-bold">⇄</span>

                    {/* Seller */}
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-xs">
                        {activeThread.seller?.name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <div className="font-heading font-black text-xs text-slate-900 flex items-center gap-1">
                          <span>{activeThread.seller?.name || activeThread.sellerName}</span>
                          {activeThread.seller?.isBanned && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono font-bold">BANNED</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-blue-600 font-bold">
                          {activeThread.seller?.accountNumber || 'EZBD-MEMBER'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBanUser(activeThread.seller?.id || activeThread.sellerId, activeThread.seller?.name || activeThread.sellerName)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Ban User"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteThread(selectedConvId)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Delete whole conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Thread</span>
                    </button>
                  </div>
                </div>

                {/* Messages Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingThread ? (
                    <div className="py-20 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
                      <span className="text-xs mt-2 block font-medium">Loading message history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-xs font-medium">
                      No messages recorded in this conversation yet.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isBuyer = msg.senderId === activeThread.buyerId;
                      const isSystem = msg.senderId === 'SYSTEM_ADMIN_BOT';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-2 text-xs font-bold text-amber-900 shadow-2xs max-w-md text-center flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>{msg.content}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col group ${isBuyer ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5 px-1">
                            <span className="text-[10px] font-bold text-slate-600">
                              {msg.senderName || (isBuyer ? activeThread.buyerName : activeThread.sellerName)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 transition-opacity"
                              title="Delete this message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-2xs whitespace-pre-line ${
                              isBuyer
                                ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                : 'bg-slate-900 text-white rounded-tr-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Moderation Warning Toolbar */}
                <div className="p-3.5 bg-white border-t border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type official moderation notice or warning into this chat..."
                      value={customWarning}
                      onChange={(e) => setCustomWarning(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange"
                    />
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleSendWarning}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Issue Warning</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-brand-orange shrink-0" />
                    <span>Sending a warning drops a system announcement badge directly into the chat visible to both users.</span>
                  </div>
                </div>

              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h4 className="font-heading font-black text-base text-slate-700">Select a Conversation Thread</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Pick any user conversation from the left panel to inspect message history, delete abusive content, or issue moderation warnings.
                </p>
              </div>
            )}
          </div>

        </div>
    </div>
  );
}
