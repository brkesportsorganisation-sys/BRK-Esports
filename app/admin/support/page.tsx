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
  Bot
} from 'lucide-react';
import { SupportTicket, SupportMessage } from '@/lib/types';

const CANNED_REPLIES = [
  '👋 আসসালামু আলাইকুম! আমি সাপোর্ট অ্যাডমিন। আপনার কি সমস্যা হচ্ছে বলুন?',
  '📌 দ্রুততম লাইভ সহায়তার জন্য আমাদের Discord সার্ভারে যোগ দিন: https://discord.gg/blackrock-esports',
  '🔑 আপনার টুর্নামেন্টের নাম এবং ফ্রি ফায়ার UID দিন, চেক করে দিচ্ছি।',
  '💰 বিকাশ/নগদ ডিপোজিট বা উইথড্রোর ট্রানজেকশন আইডি (TrxID) দিন।',
  '✅ আপনার সমস্যার সমাধান করে দেওয়া হয়েছে। ধন্যবাদ Black Rock Esports এর সাথে থাকার জন্য!'
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support?adminAll=true');
      if (res.ok) {
        const data = await res.json();
        const list: SupportTicket[] = data.tickets || [];
        setTickets(list);

        // Auto select first ticket if none selected
        if (!activeTicket && list.length > 0) {
          setActiveTicket(list[0]);
          fetchMessages(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load support tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/support?ticketId=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.ticket) {
          setActiveTicket(data.ticket);
        }
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.warn('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 6000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages for active ticket
  useEffect(() => {
    if (!activeTicket) return;
    const interval = setInterval(() => {
      fetch(`/api/support?ticketId=${activeTicket.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.messages && data.messages.length !== messages.length) {
            setMessages(data.messages);
            scrollToBottom();
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicket?.id, messages.length]);

  const handleSelectTicket = (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTicket || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_ADMIN_REPLY',
          ticketId: activeTicket.id,
          adminName: 'Admin Support',
          content: replyText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setReplyText('');
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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Headphones className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black font-heading tracking-wide">
              Live Support & User Inquiries Desk
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Real-time player support chat with automated Discord invitations & instant admin replies.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* Main Inbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        
        {/* Left Column: Tickets List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          
          {/* Filter & Search Header */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, phone or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-brand-orange"
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingTickets ? (
              <div className="p-8 text-center text-xs text-slate-400 font-bold space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-orange" />
                <span>Loading tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-bold space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <span>No support tickets found.</span>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = activeTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full text-left p-4 transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected ? 'bg-orange-50/80 border-l-4 border-brand-orange' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-red/20 to-brand-orange/20 text-brand-orange flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {ticket.userName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-heading font-black text-xs text-slate-900 truncate">
                          {ticket.userName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                          {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 truncate font-medium">
                        {ticket.lastMessage}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          ticket.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {ticket.status}
                        </span>

                        {ticket.unreadCountAdmin > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-brand-red text-white text-[9px] font-black animate-pulse">
                            {ticket.unreadCountAdmin} New
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Active Conversation (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          
          {activeTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
                    {activeTicket.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                      <span>{activeTicket.userName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        activeTicket.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {activeTicket.status}
                      </span>
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      {activeTicket.userPhone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {activeTicket.userPhone}
                        </span>
                      )}
                      {activeTicket.userEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {activeTicket.userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResolveTicket}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {activeTicket.status === 'OPEN' ? 'Mark Resolved' : 'Reopen Ticket'}
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-bold space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-orange" />
                    <span>Loading conversation...</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'ADMIN';
                    const isSystem = msg.senderRole === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="mx-auto max-w-lg p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs space-y-2 shadow-xs">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                            <Bot className="w-4 h-4" />
                            <span>Automated System Notification (Discord Invite)</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed font-sans">
                            {msg.content}
                          </p>
                          <div className="text-[10px] text-indigo-400 font-mono text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {isAdmin ? '🛡️ Admin Support' : msg.userName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                            isAdmin
                              ? 'bg-slate-900 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
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

              {/* Quick Canned Responses */}
              <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 overflow-x-auto flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-500 flex-shrink-0">
                  Quick Reply:
                </span>
                {CANNED_REPLIES.map((canned, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(canned)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-brand-orange hover:text-brand-orange whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {canned.slice(0, 30)}...
                  </button>
                ))}
              </div>

              {/* Admin Reply Box */}
              <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your reply to user..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>SEND</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
              <Headphones className="w-12 h-12 text-slate-300" />
              <div className="font-heading font-bold text-slate-700 text-base">
                Select a Support Ticket
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose an inquiry from the left to start live chatting with the user.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
