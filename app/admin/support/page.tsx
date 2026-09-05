'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  Send, 
  CheckCircle2, 
  Clock, 
  Search, 
  User, 
  RefreshCw, 
  ShieldCheck, 
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Phone,
  Mail,
  Sparkles,
  Download,
  Trash2,
  Database,
  Archive,
  Check,
  X,
  FileText,
  ShieldAlert,
  Crown,
  ChevronDown
} from 'lucide-react';
import { SupportTicket, SupportMessage } from '@/lib/types';
import FormattedMessage from '@/components/ui/FormattedMessage';

const ESPORTS_ROLES = [
  { role: 'RUSHER', label: 'Rusher', icon: '⚡' },
  { role: 'NADER', label: 'Nader', icon: '💥' },
  { role: 'SUPPORTER', label: 'Supporter', icon: '🛡️' },
  { role: 'SNIPER', label: 'Sniper', icon: '🎯' },
  { role: 'FLANKER', label: 'Flanker', icon: '🦅' },
  { role: 'IGL', label: 'IGL / Leader', icon: '👑' },
  { role: 'COACH', label: 'Coach', icon: '🧠' },
  { role: 'ANALYST', label: 'Analyst', icon: '📊' },
];

const CANNED_REPLIES = [
  '👋 আসসালামু আলাইকুম! ESPORTS ZONE BD সাপোর্ট থেকে অ্যাডমিন বলছি। আপনাকে কীভাবে সহায়তা করতে পারি?',
  '🔑 আপনার টুর্নামেন্টের নাম এবং ফ্রি ফায়ার UID টি লিখে পাঠান, দ্রুত চেক করে দিচ্ছি।',
  '💰 বিকাশ/নগদ ডিপোজিট বা উইথড্রোর ট্রানজেকশন আইডি (TrxID) নাম্বারটি দিন।',
  '✅ আপনার সমস্যার সমাধান করে দেওয়া হয়েছে। আর কোনো বিষয়ে সহায়তার প্রয়োজন আছে কি?',
  '📌 যেকোনো জরুরি নোটিফিকেশন পেতে আমাদের অফিশিয়াল Discord সার্ভারে যোগ দিন: https://discord.gg/esportszonebd'
];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  // Active user's in-game and system role
  const [userInGameRole, setUserInGameRole] = useState<string>('RUSHER');
  const [userSystemRole, setUserSystemRole] = useState<string>('USER');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);

  // Backup & Archive Modal State
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupStats, setBackupStats] = useState<{
    totalConversations: number;
    totalMessages: number;
    activeMessagesCount: number;
    archivedMessagesCount: number;
  } | null>(null);
  const [loadingBackupStats, setLoadingBackupStats] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeTicketRef = useRef<SupportTicket | null>(null);

  // Fetch active user role when ticket selected
  const fetchUserRole = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/auth/me?id=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserInGameRole(data.user.inGameRole || 'RUSHER');
          setUserSystemRole(data.user.role || 'USER');
        }
      }
    } catch {}
  };

  const handleUpdateRoleFromSupport = async (newInGameRole: string, newSystemRole?: string) => {
    if (!activeTicket) return;
    setRoleSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: activeTicket.userId,
          inGameRole: newInGameRole,
          role: newSystemRole || userSystemRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUserInGameRole(newInGameRole);
        if (newSystemRole) setUserSystemRole(newSystemRole);
        setRoleModalOpen(false);
        alert(`User role updated to ${newInGameRole} successfully in Database!`);
        // Auto pre-fill confirmation reply text for quick admin response
        const roleLabel = ESPORTS_ROLES.find(r => r.role === newInGameRole)?.label || newInGameRole;
        const roleIcon = ESPORTS_ROLES.find(r => r.role === newInGameRole)?.icon || '⚡';
        setReplyText(`✅ প্রিয় ${activeTicket.userName}, আপনার রোল পরিবর্তন করে "${roleIcon} ${roleLabel}" সেট করে দেওয়া হয়েছে এবং ডাটাবেজে পার্মানেন্ট সেভ করা হয়েছে! ধন্যবাদ।`);
      } else {
        alert(data.message || 'Failed to update role.');
      }
    } catch {
      alert('Error updating user role in database.');
    } finally {
      setRoleSaving(false);
    }
  };

  useEffect(() => {
    activeTicketRef.current = activeTicket;
    if (activeTicket?.userId) {
      fetchUserRole(activeTicket.userId);
    }
  }, [activeTicket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = async (isInitial = false) => {
    try {
      const res = await fetch('/api/support?adminAll=true');
      if (res.ok) {
        const data = await res.json();
        const list: SupportTicket[] = data.tickets || [];
        setTickets(list);

        // Auto select first ticket if none selected yet
        if (!activeTicketRef.current && list.length > 0) {
          setActiveTicket(list[0]);
          activeTicketRef.current = list[0];
          fetchMessages(list[0].id, isInitial);
          fetchUserRole(list[0].userId);
        } else if (activeTicketRef.current) {
          // Keep active ticket metadata in sync
          const currentInList = list.find(t => t.id === activeTicketRef.current?.id);
          if (currentInList) {
            setActiveTicket(prev => prev ? { ...prev, ...currentInList } : currentInList);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load support tickets:', err);
    } finally {
      if (isInitial) {
        setLoadingTickets(false);
      }
    }
  };

  const fetchMessages = async (ticketId: string, showSpinner = false) => {
    if (showSpinner) {
      setLoadingMessages(true);
    }
    try {
      const res = await fetch(`/api/support?ticketId=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        const newMsgs = data.messages || [];
        setMessages(newMsgs);
        if (data.ticket) {
          setActiveTicket(prev => prev?.id === data.ticket.id ? { ...prev, ...data.ticket } : prev);
        }
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.warn('Failed to load messages:', err);
    } finally {
      if (showSpinner) {
        setLoadingMessages(false);
      }
    }
  };

  const fetchBackupStats = async () => {
    setLoadingBackupStats(true);
    try {
      const res = await fetch('/api/admin/support/backup');
      if (res.ok) {
        const data = await res.json();
        setBackupStats(data.stats || null);
      }
    } catch (err) {
      console.warn('Failed to fetch backup stats:', err);
    } finally {
      setLoadingBackupStats(false);
    }
  };

  const handleOpenBackupModal = () => {
    setBackupModalOpen(true);
    setPurgeSuccessMsg('');
    fetchBackupStats();
  };

  const handleDownloadBackup = (scope: 'archived' | 'all') => {
    window.open(`/api/admin/support/backup?download=true&scope=${scope}`, '_blank');
  };

  const handlePurgeArchived = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to permanently delete all archived messages older than 30 days from the database?\n\nPlease make sure you have downloaded a backup first if you need to keep records.'
    );
    if (!confirmed) return;

    setIsPurging(true);
    setPurgeSuccessMsg('');
    try {
      const res = await fetch('/api/admin/support/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PURGE_ARCHIVED' }),
      });

      const data = await res.json();
      if (res.ok) {
        setPurgeSuccessMsg(`✅ ${data.message} (${data.deletedCount} messages deleted).`);
        fetchBackupStats();
        fetchTickets(false);
        if (activeTicketRef.current) fetchMessages(activeTicketRef.current.id, false);
      } else {
        alert(data.error || 'Failed to purge archived messages.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error purging archived messages.');
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    fetchTickets(true);
    const handleTicketPoll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchTickets(false);
    };
    const interval = setInterval(handleTicketPoll, 25000);
    document.addEventListener('visibilitychange', handleTicketPoll);
    return () => {
      document.removeEventListener('visibilitychange', handleTicketPoll);
      clearInterval(interval);
    };
  }, []);

  // Poll messages silently for active ticket
  useEffect(() => {
    if (!activeTicket?.id) return;
    const ticketId = activeTicket.id;
    const handleMsgPoll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch(`/api/support?ticketId=${ticketId}`);
        if (res.ok) {
          const data = await res.json();
          const newMsgs: SupportMessage[] = data.messages || [];
          setMessages(prev => {
            if (newMsgs.length !== prev.length || (newMsgs.length > 0 && prev.length > 0 && newMsgs[newMsgs.length - 1].id !== prev[prev.length - 1].id)) {
              setTimeout(scrollToBottom, 100);
              return newMsgs;
            }
            return prev;
          });
        }
      } catch {}
    };
    const interval = setInterval(handleMsgPoll, 12000);
    document.addEventListener('visibilitychange', handleMsgPoll);
    return () => {
      document.removeEventListener('visibilitychange', handleMsgPoll);
      clearInterval(interval);
    };
  }, [activeTicket?.id]);

  const handleSelectTicket = (ticket: SupportTicket) => {
    if (activeTicket?.id === ticket.id) return;
    setActiveTicket(ticket);
    activeTicketRef.current = ticket;
    fetchMessages(ticket.id, true);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTicket || !replyText.trim() || sendingReply) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setSendingReply(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_ADMIN_REPLY',
          ticketId: activeTicket.id,
          adminName: 'Admin Support',
          content: textToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
        fetchTickets();
      }
    } catch (err) {
      alert('Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    try {
      await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_TICKET',
          ticketId: activeTicket.id,
        }),
      });
      fetchTickets();
      setActiveTicket(prev => prev ? { ...prev, status: 'RESOLVED' } : null);
    } catch {}
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/support?messageId=${messageId}&ticketId=${activeTicket?.id || ''}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        fetchTickets(false);
      } else {
        alert('Failed to delete message.');
      }
    } catch {
      alert('Error deleting message.');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.userName.toLowerCase().includes(q) ||
        (t.userPhone || '').includes(q) ||
        (t.userEmail || '').toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header with WhatsApp / Messenger Style & Backup Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 rounded-[2rem] text-white shadow-xl border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-inner">
              <Headphones className="w-5 h-5 text-brand-orange" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-wide flex items-center gap-2">
                <span>Support Live Messenger</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                  1-to-1 DMs Active
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                Single unified chat thread per user account • 30-day live retention policy.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenBackupModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-heading font-black shadow-md hover:brightness-110 transition-all cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            <span>Chat Backups &amp; 30-Day Archive</span>
          </button>

          <button
            onClick={() => fetchTickets(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Inbox Grid (WhatsApp Web / Messenger Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        
        {/* Left Column: WhatsApp-style User Threads (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          
          {/* Filter & Search Header */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black font-heading text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-brand-orange" />
                <span>Conversations ({tickets.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                30D Live
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, phone or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'OPEN', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    filterStatus === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* User Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingTickets ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-orange" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-bold space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <span>No conversations found.</span>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = activeTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full p-4 text-left transition-all flex items-start gap-3 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-orange-50/70 border-l-4 border-brand-orange'
                        : 'hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${t.userName || t.userId}`}
                        alt={t.userName}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 bg-white shadow-2xs"
                      />
                      {t.status === 'OPEN' && (
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-xs" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-heading font-black text-xs sm:text-sm text-slate-900 truncate">
                          {t.userName || 'Player'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {t.lastMessage || 'No messages yet'}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          {t.userPhone ? `📞 ${t.userPhone}` : `UID: ${t.userId.substring(0, 8)}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          t.status === 'RESOLVED' ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Messenger Chat Thread View (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${activeTicket.userName || activeTicket.userId}`}
                    alt={activeTicket.userName}
                    className="w-10 h-10 rounded-2xl object-cover border border-slate-200 bg-white shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-heading font-black text-slate-900 text-base truncate flex items-center gap-2">
                      <span>{activeTicket.userName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                        Live User
                      </span>
                    </h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono truncate">
                      {activeTicket.userPhone && <span>📞 {activeTicket.userPhone}</span>}
                      {activeTicket.userEmail && <span>• ✉️ {activeTicket.userEmail}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Quick In-Game Role Button */}
                  <button
                    onClick={() => setRoleModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-orange-200 text-orange-900 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Change Player Role in Database"
                  >
                    <span className="text-sm">{ESPORTS_ROLES.find(r => r.role === userInGameRole)?.icon || '⚡'}</span>
                    <span>{ESPORTS_ROLES.find(r => r.role === userInGameRole)?.label || userInGameRole}</span>
                    <span className="text-[10px] bg-orange-200/80 text-orange-800 px-1.5 py-0.2 rounded font-mono">Change</span>
                  </button>

                  {activeTicket.userPhone && (
                    <a
                      href={`https://wa.me/${activeTicket.userPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={handleResolveTicket}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {activeTicket.status === 'RESOLVED' ? 'Re-open' : 'Mark Resolved'}
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/60">
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-slate-200/70 text-slate-600 text-[10px] font-mono font-bold uppercase tracking-wider">
                    30-Day Auto Retention Active • Secure Encrypted Chat
                  </span>
                </div>

                {loadingMessages ? (
                  <div className="p-12 text-center text-xs text-slate-400 font-bold space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
                    <span>Loading chat messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500 font-bold space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
                    <span>No messages yet in this user conversation.</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'ADMIN';

                    return (
                      <div
                        key={msg.id}
                        className={`group/msg relative flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                          isAdmin ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        }`}
                      >
                        {!isAdmin && (
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userName || activeTicket.userName}`}
                            alt={msg.userName}
                            className="w-7 h-7 rounded-lg object-cover bg-white border border-slate-200 shrink-0 mt-1"
                          />
                        )}

                        <div className="space-y-1 relative">
                          <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs relative ${
                            isAdmin
                              ? 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white rounded-tr-none font-medium'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none font-medium'
                          }`}>
                            {isAdmin && (
                              <div className="text-[10px] font-black text-amber-100 flex items-center justify-between gap-1 mb-1.5 font-heading uppercase tracking-wide">
                                <div className="flex items-center gap-1">
                                  <Crown className="w-3.5 h-3.5 text-amber-200" />
                                  <span>Support Admin</span>
                                </div>
                              </div>
                            )}
                            <FormattedMessage
                              content={msg.content}
                              isAdmin={isAdmin}
                              isUser={!isAdmin}
                            />

                            {/* Delete Button on hover */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete this message"
                              className={`absolute -top-2 ${isAdmin ? '-left-2' : '-right-2'} opacity-0 group-hover/msg:opacity-100 bg-slate-900 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-all duration-150 cursor-pointer z-10`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className={`text-[9px] text-slate-400 font-mono px-1 flex items-center gap-1 ${
                            isAdmin ? 'justify-end' : 'justify-start'
                          }`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isAdmin && <Check className="w-3 h-3 text-emerald-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Response Dropdown */}
              <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  ⚡ Quick Replies:
                </span>
                {CANNED_REPLIES.map((canned, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(canned)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200/80 transition-colors whitespace-nowrap cursor-pointer shrink-0 truncate max-w-[200px]"
                    title={canned}
                  >
                    {canned}
                  </button>
                ))}
              </div>

              {/* Chat Input Box with Multiline Support & Quick Insert */}
              <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2">
                <div className="flex items-end gap-3">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim() && !sendingReply) {
                          handleSendReply(e);
                        }
                      }
                    }}
                    placeholder="Type official reply... (Press Enter to Send, Shift+Enter for new line)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white resize-none leading-relaxed transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-heading font-black text-xs uppercase shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0 h-[46px]"
                  >
                    {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyText(prev => prev ? `${prev}\n• ` : '• ')}
                      className="text-slate-500 hover:text-brand-orange transition-colors font-medium cursor-pointer"
                    >
                      + Add Bullet (•)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setReplyText(prev => prev ? `${prev}\n\n` : '')}
                      className="text-slate-500 hover:text-brand-orange transition-colors font-medium cursor-pointer"
                    >
                      + Paragraph Break (↵)
                    </button>
                  </div>
                  <span>Shift + Enter for new line</span>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <div className="font-heading font-black text-lg text-slate-700">No Conversation Selected</div>
              <p className="text-xs max-w-sm">
                Select a user conversation from the left panel to begin live messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Backup & 30-Day Archive Management Modal */}
      {backupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-slate-900">
                    Chat Backups &amp; 30-Day Archive Manager
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Download chat backups and permanently purge archived messages to free database storage.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Retention Policy Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
              <Clock className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
              <div>
                <strong>30-Day Auto Retention Policy:</strong> চ্যাট মেসেজগুলো ৩০ দিন পর্যন্ত লাইভ চ্যাট বক্সে অ্যাক্টিভ থাকে। ৩০ দিন পার হয়ে যাওয়া মেসেজগুলো স্বয়ংক্রিয়ভাবে ব্যাকআপ আর্কাইভে চলে যায়। আপনি নিচে থেকে ব্যাকআপ ফাইল ডাউনলোড করে ডেটাবেজ থেকে পুরোনো মেসেজগুলো পারমানেন্ট ডিলিট করতে পারবেন।
              </div>
            </div>

            {/* Live Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Active (≤30D)</div>
                <div className="text-xl font-black text-emerald-600 font-mono">
                  {loadingBackupStats ? '...' : backupStats?.activeMessagesCount || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Archived (30+ Days)</div>
                <div className="text-xl font-black text-orange-600 font-mono">
                  {loadingBackupStats ? '...' : backupStats?.archivedMessagesCount || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Messages</div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {loadingBackupStats ? '...' : backupStats?.totalMessages || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">User Threads</div>
                <div className="text-xl font-black text-indigo-600 font-mono">
                  {loadingBackupStats ? '...' : backupStats?.totalConversations || 0}
                </div>
              </div>
            </div>

            {purgeSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{purgeSuccessMsg}</span>
              </div>
            )}

            {/* Step 1: Download Backups */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-brand-orange" />
                  <span>Step 1: Download Chat Backup Files (.JSON)</span>
                </h4>
              </div>
              <p className="text-xs text-slate-500">
                ডিলিট করার পূর্বে প্রয়োজনীয় ব্যাকআপ ফাইল ডাউনলোড করে আপনার কম্পিউটারে সংরক্ষণ করুন:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadBackup('archived')}
                  className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <Download className="w-4 h-4 text-orange-600" />
                  <span>Download Archived (30+ Days)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadBackup('all')}
                  className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Download Full Chat History</span>
                </button>
              </div>
            </div>

            {/* Step 2: Delete / Purge from Database */}
            <div className="p-5 rounded-2xl bg-red-50/50 border border-red-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-black text-sm text-red-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Step 2: Permanent Purge from Database</span>
                </h4>
              </div>
              <p className="text-xs text-red-700">
                ব্যাকআপ ডাউনলোড করা শেষ হলে নিচের বাটনে ক্লিক করে ডেটাবেজ থেকে ৩০ দিনের পুরোনো মেসেজগুলো পারমানেন্ট ডিলিট করতে পারবেন:
              </p>

              <button
                type="button"
                disabled={isPurging || (backupStats?.archivedMessagesCount === 0)}
                onClick={handlePurgeArchived}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPurging ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>
                  {isPurging
                    ? 'Purging Database Messages...'
                    : `Permanently Delete ${backupStats?.archivedMessagesCount || 0} Archived Messages from Database`}
                </span>
              </button>
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setBackupModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Role Change Modal from Live Chat */}
      {roleModalOpen && activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">
                  Change Player Role
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {activeTicket.userName} ({activeTicket.userId})
                </p>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  Select In-Game Role (Click to Change & Save):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ESPORTS_ROLES.map((r) => {
                    const isSelected = userInGameRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        disabled={roleSaving}
                        onClick={() => handleUpdateRoleFromSupport(r.role)}
                        className={`p-3 rounded-2xl border font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white border-orange-500 shadow-xs scale-102'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xl">{r.icon}</span>
                        <span className="text-[11px]">{r.label}</span>
                        {isSelected && (
                          <span className="text-[9px] bg-white/30 text-white px-1.5 py-0.2 rounded-full mt-0.5">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-[11px] text-orange-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                  <span>Instant Database Sync:</span>
                </span>
                <p>
                  Changing role updates PostgreSQL directly. A confirmation message will also be auto-drafted into the reply box.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
