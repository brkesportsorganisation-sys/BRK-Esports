'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  Gamepad2, 
  DollarSign, 
  ShieldAlert, 
  Trophy, 
  Gift, 
  ExternalLink, 
  Search, 
  Sparkles, 
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User, Notification } from '@/lib/types';

export default function UserNotificationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'ROOM_ID' | 'PAYOUT' | 'WARNING' | 'MATCH' | 'REWARD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadNotifications = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=100&t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    loadNotifications(user.id);
  }, [router]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true, userId: currentUser.id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setActionMessage('All notifications marked as read.');
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  // Clear read notifications
  const handleClearRead = async () => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to clear all read notifications?')) return;
    try {
      const res = await fetch(`/api/notifications?clearRead=true&userId=${currentUser.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => !n.isRead));
        setActionMessage('Read notifications cleared.');
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      console.error('Clear read notifications error:', err);
    }
  };

  // Mark single as read & navigate
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.id, isRead: true })
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch {}
    }

    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Delete individual notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  // Icon helper
  const getNotifIcon = (type?: string) => {
    switch (type) {
      case 'ROOM_ID':
        return <Gamepad2 className="w-5 h-5 text-purple-600" />;
      case 'PAYOUT':
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'WARNING':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      case 'MATCH':
        return <Trophy className="w-5 h-5 text-blue-600" />;
      case 'REWARD':
        return <Gift className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-brand-orange" />;
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'UNREAD' && n.isRead) return false;
      if (activeFilter !== 'ALL' && activeFilter !== 'UNREAD' && n.type !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMsg = n.message?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg) return false;
      }
      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-16 space-y-4 sm:space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange flex items-center justify-center text-white shadow-md shadow-orange-500/20 flex-shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                <span>Player Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand-red text-white animate-pulse">
                    {unreadCount} New
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Custom room credentials, prize money payouts, deposits, and system alerts.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-brand-orange" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={() => currentUser && loadNotifications(currentUser.id)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
              title="Refresh Notifications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-orange' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: 'All', count: notifications.length },
                { id: 'UNREAD', label: 'Unread', count: unreadCount },
                { id: 'ROOM_ID', label: '🎮 Room IDs' },
                { id: 'PAYOUT', label: '💰 Payouts' },
                { id: 'MATCH', label: '🏆 Matches' },
                { id: 'WARNING', label: '⚠️ Warnings' },
                { id: 'REWARD', label: '🎁 Rewards' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-black/15 text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Clear Read Button */}
            {notifications.some(n => n.isRead) && (
              <button
                onClick={handleClearRead}
                className="text-[11px] font-bold text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 self-end sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Read</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search notifications, match titles, or payout updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <span className="text-xs font-bold">Loading your notification inbox...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Inbox className="w-7 h-7" />
              </div>
              <div className="font-heading font-black text-slate-900 text-lg">No Notifications Found</div>
              <div className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {activeFilter !== 'ALL'
                  ? 'No notifications match this category filter.'
                  : 'You have no new alerts at this time. Room credentials, payout confirmations, and tournament reminders will appear here.'}
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer relative group flex items-start gap-4 ${
                  !notif.isRead
                    ? 'bg-white border-brand-orange/50 shadow-md shadow-orange-500/5 hover:border-brand-orange'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
                  {getNotifIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 group-hover:text-brand-orange transition-colors">
                        {notif.title}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now'}
                      </div>
                    </div>

                    {!notif.isRead && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-brand-orange text-white uppercase tracking-wider flex-shrink-0 shadow-2xs">
                        New
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                    {notif.message}
                  </p>

                  {/* Picture / Media Banner */}
                  {notif.imageUrl && (
                    <div className="pt-2">
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-60">
                        <img
                          src={notif.imageUrl}
                          alt="Notification Media"
                          className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {notif.link && (
                    <div className="pt-2">
                      <Link
                        href={notif.link}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange border border-orange-200 text-xs font-bold transition-all shadow-2xs"
                      >
                        <span>Open Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-70 group-hover:opacity-100 cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}
