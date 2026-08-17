'use client';

import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Bell, Trash2, RefreshCw, Loader2, Sparkles, Users, MessageSquare } from 'lucide-react';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState<'ALL' | 'TOURNAMENT_PLAYERS'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadNotifications = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetGroup,
        }),
      });

      if (res.ok) {
        setSentSuccess(true);
        setTitle('');
        setMessage('');
        await loadNotifications();
        setTimeout(() => setSentSuccess(false), 4000);
      } else {
        const err = await res.json();
        alert(err.message || 'Error sending notification.');
      }
    } catch (err) {
      console.error('Notification dispatch error:', err);
      alert('Network error while dispatching notification.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications(notifications.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const handlePreset = (presetTitle: string, presetMsg: string) => {
    setTitle(presetTitle);
    setMessage(presetMsg);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Announcements & Push Notifications
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Broadcast match room IDs, payout notices, and system alerts to registered players.
          </p>
        </div>

        <button
          onClick={loadNotifications}
          disabled={loadingHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-[#2563EB]' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {sentSuccess && (
        <div className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>Broadcast notification successfully dispatched to players in Supabase!</span>
        </div>
      )}

      {/* 2. Presets */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Quick Template Presets</div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => handlePreset('🎮 Custom Room ID Published!', 'Room ID and Password for your registered match are now live on your match detail tab.')}
            className="px-3.5 py-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold border border-blue-200 transition-colors"
          >
            🎮 Room ID Alert
          </button>
          <button
            type="button"
            onClick={() => handlePreset('💰 Tournament Winnings Credited', 'Congratulations! Your tournament winning prize has been credited to your wallet balance.')}
            className="px-3.5 py-1.5 rounded-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
          >
            💰 Payout Notice
          </button>
          <button
            type="button"
            onClick={() => handlePreset('⚠️ Anti-Cheat Fair Play Warning', 'Using third-party script tools or modified APKs will result in immediate permanent device ban.')}
            className="px-3.5 py-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border border-red-200 transition-colors"
          >
            ⚠️ Anti-Cheat Warning
          </button>
        </div>
      </div>

      {/* 3. Broadcast Form & History (Grid 6+6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Broadcast Form (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-4">
            <Send className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">Broadcast Composer</h2>
              <p className="text-[12px] text-[#64748B]">Sends instant in-app alerts</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-[#475569] mb-1.5 font-semibold">Target Audience</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">All Registered Players (Global Broadcast)</option>
                <option value="TOURNAMENT_PLAYERS">Active Tournament Joined Players</option>
              </select>
            </div>

            <div>
              <label className="block text-[#475569] mb-1.5 font-semibold">Notification Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Free Fire Squad Match Room ID Ready"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[#475569] mb-1.5 font-semibold">Message Body *</label>
              <textarea
                rows={4}
                required
                placeholder="Enter alert message details for players..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSending ? 'Broadcasting to Supabase...' : 'Send Broadcast Notification'}</span>
            </button>
          </form>
        </div>

        {/* Live Notification History (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-[17px] font-bold text-[#0F172A]">Recent Broadcasts</h2>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {notifications.length} Sent
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-1">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-16 text-[#2563EB]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-600 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-[#0F172A]">No Broadcasts Yet</div>
                <div className="text-xs font-medium">Sent alerts will appear here in real-time.</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-start justify-between gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-xs text-[#0F172A] truncate">{n.title}</div>
                    <div className="text-[11px] text-slate-700 font-medium line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-slate-500 font-mono font-medium">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
