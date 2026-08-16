'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  MessageSquare
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType, Announcement } from '@/lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const cur = db.getCurrentUser();
    setCurrentUser(cur);
    
    async function loadLiveNavbarData() {
      try {
        const [annRes, userRes] = await Promise.all([
          fetch('/api/announcements'),
          cur ? fetch(`/api/auth/me?id=${cur.id}`) : Promise.resolve(null)
        ]);

        if (annRes.ok) {
          const annData = await annRes.json();
          if (annData.announcements) {
            setAnnouncements(annData.announcements);
            setUnreadCount(annData.announcements.length);
          }
        }

        if (userRes && userRes.ok) {
          const uData = await userRes.json();
          if (uData.user) {
            setCurrentUser(uData.user);
            db.setCurrentUser(uData.user);
          }
        }
      } catch (err) {
        console.warn('Navbar live load error:', err);
      }
    }

    // Load local fallback
    const loadedAnnouncements = db.getAnnouncements();
    setAnnouncements(loadedAnnouncements);
    setUnreadCount(loadedAnnouncements.length);

    loadLiveNavbarData();
  }, []);

  const handleRoleSwitch = (role: 'ADMIN' | 'MODERATOR' | 'USER') => {
    if (!currentUser) return;
    const updated = db.updateUser(currentUser.id, { role });
    if (updated) {
      setCurrentUser({ ...updated });
      setIsProfileOpen(false);
    }
  };

  const navLinks: { name: string; href: string; icon: React.ElementType; isLive?: boolean }[] = [
    { name: 'Home', href: '/', icon: Flame },
    { name: 'Tournaments', href: '/tournaments', icon: Trophy },
    { name: 'Squad Finder', href: '/lfg', icon: Users },
    { name: 'Ad', href: '/ads', icon: PlusSquare },
    { name: 'Leaderboard', href: '/leaderboard', icon: Award },
    { name: 'Community', href: '/community', icon: MessageSquare },
  ];

  const isAdminOrMod = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MODERATOR';

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200/60 backdrop-blur-2xl bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-red via-brand-orange to-brand-gold p-0.5 shadow-neon-red group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Flame className="w-6 h-6 text-brand-red animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-heading font-black text-lg md:text-2xl tracking-wider text-slate-900 flex items-center gap-1 md:gap-1.5 leading-tight">
                BLACK ROCK <span className="hidden sm:inline text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange">ESPORTS</span>
              </span>
              <span className="text-[8px] md:text-[10px] text-slate-500 block -mt-0.5 md:-mt-1 font-semibold uppercase tracking-widest">
                Free Fire Championship Hub
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-brand-orange'} ${link.isLive ? 'animate-pulse' : ''}`} />
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


          </div>

          {/* User Right Action Panel */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Wallet Balance Badge inside Navbar */}
            {currentUser && (
              <div className="flex space-x-3">
                <Link 
                  href="/profile" 
                  className="flex items-center space-x-2.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 transition-all group shadow-sm"
                >
                  <div className="w-7 h-7 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Wallet className="w-3.5 h-3.5 text-brand-orange" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Wallet</div>
                    <div className="text-xs font-heading font-black text-orange-500">
                      ৳ {currentUser.walletBalance.toLocaleString()}
                    </div>
                  </div>
                </Link>

                <Link 
                  href="/profile" 
                  className="flex items-center space-x-2.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 transition-all group shadow-sm"
                >
                  <div className="w-7 h-7 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                    <Coins className="w-3.5 h-3.5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] text-slate-500 font-bold uppercase leading-none">Coins</div>
                    <div className="text-xs font-heading font-black text-yellow-600">
                      {currentUser.coinBalance?.toLocaleString() || 0}
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen) setUnreadCount(0);
                }}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-brand-red transition-all relative shadow-sm"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-red text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-80 bg-white rounded-2xl p-4 z-50 border border-slate-200 shadow-lg"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h4 className="font-heading font-bold text-lg text-slate-900">Notifications</h4>
                      <span className="text-xs text-brand-orange font-semibold cursor-pointer">Mark all as read</span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {announcements.length === 0 ? (
                        <div className="text-xs text-slate-500 text-center py-4">No new notifications</div>
                      ) : (
                        announcements.map((ann, idx) => {
                          const Content = (
                            <>
                              {ann.imageUrl && (
                                <img src={ann.imageUrl} alt="Notification Banner" className="w-full h-16 object-cover rounded-lg mb-2" />
                              )}
                              <div className="font-bold text-slate-900">{ann.title}</div>
                              <div className="text-slate-600">{ann.content}</div>
                              <div className="text-[9px] text-slate-400 mt-1">{new Date(ann.createdAt).toLocaleString()}</div>
                            </>
                          );
                          
                          const baseClasses = `block p-3 rounded-xl bg-slate-50 border-l-4 text-xs space-y-0.5 hover:bg-slate-100 transition-colors ${ann.category === 'GENERAL' ? 'border-brand-orange' : 'border-brand-red'}`;

                          return ann.link ? (
                            <Link key={idx} href={ann.link} onClick={() => setIsNotificationsOpen(false)} className={baseClasses}>
                              {Content}
                            </Link>
                          ) : (
                            <div key={idx} className={baseClasses}>
                              {Content}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 bg-white p-1.5 pr-3 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                  />
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                      {currentUser.inGameName || currentUser.name}
                    </div>
                    <div className="text-[10px] font-bold text-brand-orange uppercase flex items-center gap-1">
                      <span>{currentUser.role}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-64 bg-white rounded-2xl p-3 z-50 border border-slate-200 shadow-lg"
                    >
                      <div className="p-3 border-b border-slate-100 mb-2 bg-slate-50 rounded-xl">
                        <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                        <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                        <div className="text-xs font-mono text-indigo-500 mt-1">
                          FF UID: {currentUser.freeFireUid || 'Not Set'}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Link
                          href="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <User className="w-4 h-4 text-brand-orange" />
                          <span>My Gaming Profile</span>
                        </Link>

                        <Link
                          href="/profile?tab=teams"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <Users className="w-4 h-4 text-indigo-500" />
                          <span>My Roster / Clan</span>
                        </Link>



                        <Link
                          href="/login"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-brand-red hover:bg-brand-red/10 transition-colors mt-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-red hover:brightness-110 transition-all"
              >
                LOGIN / REGISTER
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex lg:hidden items-center space-x-3">
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-heading font-black text-brand-orange bg-orange-50 px-2 py-1 rounded-lg border border-orange-200 shadow-sm flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> ৳ {currentUser.walletBalance.toLocaleString()}
                </div>
                <div className="text-[10px] font-heading font-black text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200 shadow-sm flex items-center gap-1">
                  <Coins className="w-3 h-3" /> {currentUser.coinBalance?.toLocaleString() || 0}
                </div>
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 shadow-sm"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Icon className="w-5 h-5 text-brand-orange" />
                  <span>{link.name}</span>
                </Link>
              );
            })}



            {currentUser ? (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold"
                >
                  <User className="w-5 h-5 text-brand-orange" />
                  <span>Profile ({currentUser.inGameName || currentUser.name})</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-black"
              >
                LOGIN / REGISTER
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
