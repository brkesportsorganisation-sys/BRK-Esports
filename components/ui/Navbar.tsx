'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Trophy, 
  Award, 
  Users, 
  Wallet, 
  Bell, 
  User, 
  ShieldCheck, 
  Menu, 
  X, 
  LogOut, 
  ChevronDown,
  Gift,
  PlusSquare,
  Coins,
  MessageSquare,
  Radio,
  Gamepad2,
  DollarSign,
  ShieldAlert,
  CheckCheck,
  Trash2,
  ExternalLink,
  Sparkles,
  Globe,
  Megaphone,
  Swords,
  Diamond,
  Crown
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType, Notification as NotificationType } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';
import { useRealtimeUser, useRealtimeNotifications } from '@/lib/use-realtime';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Real-time live Supabase WebSockets listeners
  useRealtimeUser(currentUser?.id, (updatedUser) => {
    setCurrentUser(updatedUser);
  });

  useRealtimeNotifications(currentUser?.id, (newNotif) => {
    setNotifications((prev) => [newNotif, ...prev]);
    setUnreadCount((prev) => prev + 1);
  });

  // Load user notifications from API
  const loadUserNotifications = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load user notifications:', err);
    }
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    setCurrentUser(cur);
    
    async function loadLiveNavbarData() {
      try {
        const [userRes, setRes] = await Promise.all([
          cur ? fetch(`/api/auth/me?id=${cur.id}`) : Promise.resolve(null),
          fetch('/api/settings')
        ]);

        if (setRes && setRes.ok) {
          const setData = await setRes.json();
          const s = setData.settings || {};
          const isLive = s.YOUTUBE_LIVE_IS_ACTIVE === 'true' || s.YOUTUBE_LIVE_IS_ACTIVE === true || Boolean(s.YOUTUBE_LIVE_URL);
          setIsLiveActive(Boolean(isLive));
        }

        if (userRes) {
          if (userRes.ok) {
            const uData = await userRes.json();
            if (uData.user) {
              setCurrentUser(uData.user);
              db.setCurrentUser(uData.user);
              loadUserNotifications(uData.user.id);
            }
          } else if (userRes.status === 404 || userRes.status === 401) {
            setCurrentUser(null);
            db.setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('Navbar live load error:', err);
      }
    }

    if (cur?.id) {
      loadUserNotifications(cur.id);
    }

    loadLiveNavbarData();

    // Periodic refresh for notifications every 25 seconds
    const interval = setInterval(() => {
      const activeUser = db.getCurrentUser();
      if (activeUser?.id) {
        loadUserNotifications(activeUser.id);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true, userId: currentUser.id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  // Mark single notification as read & handle link
  const handleNotificationClick = async (notif: NotificationType) => {
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.id, isRead: true })
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }

    if (notif.link) {
      setIsNotificationsOpen(false);
      router.push(notif.link);
    }
  };

  // Delete notification
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

  const handleSignOut = () => {
    db.logout();
    setCurrentUser(null);
    setIsProfileOpen(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const { t, language, toggleLanguage, isBangla } = useLanguage();

  type NavLinkItem = { name: string; href: string; icon: React.ElementType; isLive?: boolean };

  const primaryNavLinks: NavLinkItem[] = [
    { name: t('nav_home', 'Home'), href: '/', icon: Flame },
    { name: t('nav_tournaments', 'Tournaments'), href: '/tournaments', icon: Trophy },
    { name: '1v1 Arena', href: '/arena', icon: Swords },
    { name: 'Rewards', href: '/ads', icon: Gift },
    { name: t('nav_live', 'Live'), href: '/live', icon: Radio, isLive: isLiveActive },
  ];

  const moreNavLinks: NavLinkItem[] = [
    { name: 'Diamonds & Top-up', href: '/shop', icon: Diamond },
    { name: 'Hall of Champions', href: '/champions', icon: Crown },
    { name: 'Notices & Rules', href: '/announcements', icon: Megaphone },
    { name: 'Squad Finder (LFG)', href: '/lfg', icon: Users },
    { name: 'Community Hub', href: '/community', icon: MessageSquare },
  ];

  const allNavLinks: NavLinkItem[] = [
    ...primaryNavLinks,
    ...moreNavLinks
  ];

  // Helper for notification type icons
  const getNotifIcon = (type?: string) => {
    switch (type) {
      case 'ROOM_ID':
        return <Gamepad2 className="w-4 h-4 text-purple-600" />;
      case 'PAYOUT':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'WARNING':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'MATCH':
        return <Trophy className="w-4 h-4 text-blue-600" />;
      case 'REWARD':
        return <Gift className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-brand-orange" />;
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeNotifTab === 'UNREAD') return !n.isRead;
    return true;
  });

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/60 backdrop-blur-2xl bg-white/85 font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group flex-shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-brand-red via-brand-orange to-brand-gold p-0.5 shadow-neon-red group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-brand-red animate-pulse" />
              </div>
            </div>
            <div className="whitespace-nowrap">
              <div className="font-heading font-black text-lg sm:text-2xl tracking-wider text-slate-900 leading-none">
                BLACKROCK <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange">ESPORTS</span>
              </div>
              <div className="hidden sm:block text-[9px] sm:text-[10px] text-slate-600 font-semibold uppercase tracking-widest mt-1">
                Free Fire Championship Hub
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-0.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 flex-shrink-0">
            {primaryNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-brand-orange'} ${link.isLive ? 'animate-pulse' : ''}`} />
                    {link.isLive && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-red"></span>
                      </span>
                    )}
                  </div>
                  <span className={link.isLive ? 'text-brand-red' : ''}>{link.name}</span>
                </Link>
              );
            })}

            {/* More ▾ Dropdown */}
            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`flex items-center space-x-1 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isMoreOpen || moreNavLinks.some(l => l.href === pathname)
                    ? 'bg-slate-200/80 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <span>{isBangla ? 'আরো' : 'More'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-52 bg-white rounded-2xl p-1.5 z-50 border border-slate-200/90 shadow-xl"
                  >
                    {moreNavLinks.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                            isItemActive
                              ? 'bg-orange-50 text-brand-orange'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-brand-orange" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* User Right Action Panel (Desktop) */}
          <div className="hidden lg:flex items-center space-x-1.5 xl:space-x-2 flex-shrink-0">
            
            {currentUser ? (
              <>
                {/* Wallet Balance Badge */}
                <Link 
                  href="/wallet" 
                  className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-2xl border border-slate-200 transition-all group shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform flex-shrink-0">
                    <Wallet className="w-3 h-3 text-brand-orange" />
                  </div>
                  <div className="text-left">
                    <div className="text-[8px] text-slate-500 font-bold uppercase leading-none">Wallet</div>
                    <div className="text-xs font-heading font-black text-orange-600">
                      ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                    </div>
                  </div>
                </Link>

                {/* Rich In-App Notification Bell & Popover */}
                <div className="relative" ref={notifDropdownRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all relative shadow-2xs cursor-pointer ${
                      isNotificationsOpen
                        ? 'bg-orange-50 border-brand-orange text-brand-orange'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300'
                    }`}
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md shadow-orange-500/30">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-3xl p-4 z-50 border border-slate-200/90 shadow-2xl shadow-slate-900/10"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-extrabold text-base text-slate-900">Notifications</h4>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-brand-orange">
                                {unreadCount} new
                              </span>
                            )}
                          </div>

                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-[11px] text-brand-orange hover:text-orange-700 font-bold flex items-center gap-1 transition-colors"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Mark all read</span>
                            </button>
                          )}
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center gap-2 pt-2.5 pb-1">
                          <button
                            onClick={() => setActiveNotifTab('ALL')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              activeNotifTab === 'ALL'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            All ({notifications.length})
                          </button>
                          <button
                            onClick={() => setActiveNotifTab('UNREAD')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              activeNotifTab === 'UNREAD'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Unread ({unreadCount})
                          </button>
                        </div>

                        {/* Notification List */}
                        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 mt-2 divide-y divide-slate-50">
                          {filteredNotifs.length === 0 ? (
                            <div className="text-center py-10 space-y-2">
                              <Bell className="w-8 h-8 text-slate-200 mx-auto" />
                              <div className="text-xs font-bold text-slate-700">
                                {activeNotifTab === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Match room details and tournament updates will show up here.
                              </div>
                            </div>
                          ) : (
                            filteredNotifs.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 rounded-2xl text-xs transition-all cursor-pointer relative group flex items-start gap-3 pt-3 ${
                                  !notif.isRead
                                    ? 'bg-orange-50/60 border border-orange-200/70 hover:bg-orange-50'
                                    : 'bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100'
                                }`}
                              >
                                {/* Icon Badge / Image Thumbnail */}
                                {notif.imageUrl ? (
                                  <img
                                    src={notif.imageUrl}
                                    alt="Thumbnail"
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                    {getNotifIcon(notif.type)}
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-extrabold text-slate-900 text-xs truncate">
                                      {notif.title}
                                    </span>
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-brand-orange flex-shrink-0 animate-pulse" />
                                    )}
                                  </div>

                                  <div className="text-slate-600 text-[11px] leading-snug line-clamp-2">
                                    {notif.message}
                                  </div>

                                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                                    <span>
                                      {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                    </span>
                                    {notif.link && (
                                      <span className="text-brand-orange font-bold font-sans flex items-center gap-0.5">
                                        <span>View</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Delete button on hover */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-all flex-shrink-0"
                                  title="Dismiss"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Footer Inbox Link */}
                        <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
                          <Link
                            href="/notifications"
                            onClick={() => setIsNotificationsOpen(false)}
                            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-brand-orange font-bold text-center transition-colors block"
                          >
                            Open Notification Center →
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-1.5 bg-white p-1 pr-2 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
                  >
                    <img
                      src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-xl object-cover border border-slate-200"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-3 w-60 bg-white rounded-2xl p-2 z-50 border border-slate-200 shadow-xl"
                      >
                        <div className="p-3 border-b border-slate-100 bg-slate-50/60 rounded-xl mb-1">
                          <div className="font-bold text-sm text-slate-900">{currentUser.name}</div>
                          <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                          {currentUser.freeFireUid && (
                            <div className="text-[11px] font-mono font-bold text-brand-orange mt-1">
                              UID: {currentUser.freeFireUid}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                              <Coins className="w-3 h-3" /> {(currentUser.coinBalance || 0).toLocaleString()} Coins
                            </span>
                          </div>
                        </div>

                        <div className="py-1 space-y-0.5">
                          <Link
                            href="/profile"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{t('nav_profile', 'Player Profile')}</span>
                          </Link>

                          <Link
                            href="/messages"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <span>Messages Inbox</span>
                          </Link>

                          <Link
                            href="/notifications"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <Bell className="w-4 h-4 text-slate-400" />
                              <span>{t('nav_notifications', 'Notifications')}</span>
                            </div>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-orange text-white">
                                {unreadCount}
                              </span>
                            )}
                          </Link>

                          <Link
                            href="/wallet"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Wallet className="w-4 h-4 text-slate-400" />
                            <span>{t('nav_wallet', 'Dual Wallet & Cashouts')}</span>
                          </Link>

                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-red hover:bg-brand-red/10 transition-colors mt-2 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t('nav_logout', 'Sign Out')}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* If NOT logged in: Render clean LOGIN Button ONLY */
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-red hover:brightness-110 transition-all flex items-center space-x-1.5 whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t('nav_login', 'LOGIN')}</span>
              </Link>
            )}

            {/* Desktop Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition-all text-xs font-extrabold shadow-2xs cursor-pointer group"
              title={isBangla ? "Switch to English" : "বাংলায় দেখুন"}
            >
              <Globe className="w-3.5 h-3.5 text-brand-orange group-hover:rotate-45 transition-transform" />
              <span className="font-heading font-black">{isBangla ? 'EN' : 'বাংলা'}</span>
            </button>

          </div>

          {/* Mobile Hamburger & Quick Badges */}
          <div className="flex lg:hidden items-center space-x-1.5 flex-shrink-0">
            {/* Mobile Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] font-extrabold shadow-2xs cursor-pointer"
              title={isBangla ? "Switch to English" : "বাংলায় দেখুন"}
            >
              <Globe className="w-3.5 h-3.5 text-brand-orange" />
              <span>{isBangla ? 'EN' : 'বাংলা'}</span>
            </button>

            {currentUser ? (
              <>
                {/* Mobile Notification Bell */}
                <Link
                  href="/notifications"
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 relative shadow-2xs"
                  title="Notifications"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-orange text-white text-[9px] font-black flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Mobile Quick Wallet Badge (hidden on extra small, shown on sm) */}
                <Link 
                  href="/wallet" 
                  className="hidden sm:flex text-[10px] font-heading font-black text-brand-orange bg-orange-50 px-2 py-1.5 rounded-xl border border-orange-200 shadow-2xs items-center gap-1"
                >
                  <Wallet className="w-3 h-3" /> ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-[11px] shadow-sm whitespace-nowrap"
              >
                {t('nav_login', 'LOGIN')}
              </Link>
            )}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-800" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-2.5 shadow-xl max-h-[80vh] overflow-y-auto"
          >
            {/* If logged in: Show Player Header in Drawer */}
            {currentUser && (
              <div className="p-3 bg-gradient-to-r from-slate-50 to-orange-50/40 rounded-2xl border border-slate-200/80 mb-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 leading-tight">
                        {currentUser.inGameName || currentUser.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {currentUser.freeFireUid ? `UID: ${currentUser.freeFireUid}` : currentUser.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/wallet"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-white rounded-xl border border-slate-200 text-left flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">Wallet</div>
                      <div className="text-xs font-black font-heading text-orange-600">
                        ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                      </div>
                    </div>
                    <Wallet className="w-3.5 h-3.5 text-brand-orange" />
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-white rounded-xl border border-slate-200 text-left flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">Coins</div>
                      <div className="text-xs font-black font-heading text-yellow-600">
                        {(currentUser.coinBalance || 0).toLocaleString()}
                      </div>
                    </div>
                    <Coins className="w-3.5 h-3.5 text-yellow-600" />
                  </Link>
                </div>
              </div>
            )}

            {allNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                    isActive 
                      ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold' 
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : link.isLive ? 'text-red-600 animate-pulse' : 'text-brand-orange'}`} />
                    <span>{link.name}</span>
                  </div>
                  {link.isLive && (
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] animate-pulse ${isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                      LIVE
                    </span>
                  )}
                </Link>
              );
            })}

            {currentUser ? (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <Link
                  href="/messages"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-4 h-4 text-brand-orange" />
                    <span>Messages Inbox</span>
                  </div>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-brand-red hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav_logout', 'Sign Out')}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-xs mt-2"
              >
                {t('nav_login', 'LOGIN')}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
