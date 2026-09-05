'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  LogOut, 
  LayoutGrid, 
  Trophy, 
  Users, 
  CreditCard, 
  Settings, 
  Menu, 
  ClipboardList, 
  Bell, 
  PlaySquare, 
  Clock, 
  ArrowUpRight, 
  History, 
  KeyRound, 
  Gamepad2, 
  Crosshair, 
  UserCheck, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Search, 
  ExternalLink,
  Ticket,
  Truck,
  DollarSign,
  Store,
  FileText,
  Package,
  ShoppingBag,
  BarChart3,
  Coins,
  Gift,
  Mail,
  Globe,
  ShoppingCart,
  Diamond,
  Swords,
  Headphones,
  MessageSquare,
  MessageCircle,
  Crown,
  Database,
  Server,
  Activity,
  HardDrive,
  Calendar,
  Layers,
  CloudDownload
} from 'lucide-react';

import { AdminPermissionKey } from '@/lib/types';

interface AdminShellProps {
  children: React.ReactNode;
}

interface AdminSessionUser {
  id: string;
  username: string;
  displayName: string;
  role: 'OWNER' | 'SUB_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  permissions: AdminPermissionKey[];
}

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [sessionUser, setSessionUser] = useState<AdminSessionUser | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingShopCount, setPendingShopCount] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  useEffect(() => {
    if (pathname === '/admin/login') return;

    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'include' });
        if (!res.ok) {
          router.replace('/admin/login');
        } else {
          const data = await res.json();
          if (data.user) {
            setSessionUser(data.user);
          }
          if (data.exp) {
            const expTime = data.exp * 1000;
            const updateTimer = () => {
              const remaining = Math.max(0, expTime - Date.now());
              setTimeLeft(remaining);
              if (remaining === 0) {
                router.replace('/admin/login');
              }
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
          }
        }
      } catch {
        router.replace('/admin/login');
      }
    };

    void verifySession();
  }, [router, pathname]);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const loadPending = async () => {
      try {
        const [regRes, shopRes] = await Promise.all([
          fetch('/api/admin/registrations', { credentials: 'include' }),
          fetch('/api/admin/shop', { credentials: 'include' }),
        ]);

        if (regRes.ok) {
          const data = await regRes.json();
          const count = (data.registrations || []).filter((r: any) => r.status === 'PENDING').length;
          setPendingCount(count);
        }

        if (shopRes.ok) {
          const shopData = await shopRes.json();
          const sCount = (shopData.orders || []).filter((o: any) => o.status === 'PENDING').length;
          setPendingShopCount(sCount);
        }
      } catch {}
    };
    void loadPending();
    const handleAdminShellPoll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadPending();
    };
    const interval = setInterval(handleAdminShellPoll, 60000);
    document.addEventListener('visibilitychange', handleAdminShellPoll);
    return () => {
      document.removeEventListener('visibilitychange', handleAdminShellPoll);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login?reason=logout');
  };

  // 10-Minute Inactivity Auto-Logout Tracker
  useEffect(() => {
    if (pathname === '/admin/login') return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        void handleLogout();
      }, INACTIVITY_LIMIT_MS);
    };

    resetInactivity();

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetInactivity));

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetInactivity));
    };
  }, [pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  interface NavLinkItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    permission: AdminPermissionKey;
    badge?: number;
    ownerOnly?: boolean;
  }

  interface NavSection {
    title: string;
    links: NavLinkItem[];
  }

  // Top Standalone Quick Access Links
  const topStandaloneLinks: NavLinkItem[] = [
    { href: '/admin', label: 'Dashboard Overview', icon: LayoutGrid, colorClass: 'text-blue-600', permission: 'view_dashboard' },
  ];

  // 6 Clean, Organized Categories for Administrative Control
  const navSections: NavSection[] = [
    {
      title: '🏆 TOURNAMENTS & MATCHES',
      links: [
        { href: '/admin/tournaments', label: 'All Tournaments', icon: Trophy, colorClass: 'text-pink-500', permission: 'manage_tournaments' },
        { href: '/admin/roadmaps', label: 'Roadmap & Schedules (🎯)', icon: Calendar, colorClass: 'text-amber-400', permission: 'manage_tournaments' },
        { href: '/admin/groups', label: 'Groups & Squad Rosters (👥)', icon: Users, colorClass: 'text-purple-400', permission: 'manage_tournaments' },
        { href: '/admin/rooms', label: 'Room ID & Pass (🔑)', icon: KeyRound, colorClass: 'text-emerald-500', permission: 'manage_tournaments' },
        { href: '/admin/registrations', label: 'Slot Registrations', icon: ClipboardList, colorClass: 'text-blue-500', badge: pendingCount, permission: 'manage_tournaments' },
        { href: '/admin/matches', label: 'Match Results & Scores', icon: Gamepad2, colorClass: 'text-amber-600', permission: 'enter_results' },
        { href: '/admin/champions', label: 'Hall of Champions (👑)', icon: Crown, colorClass: 'text-amber-500', permission: 'manage_tournaments' },
        { href: '/admin/arena', label: '1v1 Arena Duels (⚔️)', icon: Swords, colorClass: 'text-red-500', permission: 'manage_tournaments' },
        { href: '/admin/tournament-settings', label: 'Tournament Match Rules', icon: FileText, colorClass: 'text-pink-500', permission: 'manage_settings' },
      ]
    },
    {
      title: '🏪 HOSTS & VENDORS',
      links: [
        { href: '/admin/vendors', label: 'Vendors & Hosts (🏪)', icon: Store, colorClass: 'text-violet-600', permission: 'manage_tournaments' },
        { href: '/admin/withdrawals', label: 'Host Earnings & Payouts', icon: Coins, colorClass: 'text-amber-500', permission: 'manage_withdrawals' },
      ]
    },
    {
      title: '🛍️ SHOP & COMMERCE',
      links: [
        { href: '/admin/shop', label: 'Shop Products Catalog (📦)', icon: ShoppingBag, colorClass: 'text-cyan-500', permission: 'manage_deposits' },
        { href: '/admin/shop/orders', label: 'Order Fulfillment & Delivery (📋)', icon: Package, colorClass: 'text-orange-500', badge: pendingShopCount, permission: 'manage_deposits' },
        { href: '/admin/coupons', label: 'Promo Coupons (🎟️)', icon: Ticket, colorClass: 'text-pink-500', permission: 'manage_deposits' },
        { href: '/admin/shop/banners', label: 'Shop Banners & Slider (🖼️)', icon: Sparkles, colorClass: 'text-amber-500', permission: 'manage_settings' },
        { href: '/admin/shop/analytics', label: 'Shop Revenue Analytics (📊)', icon: BarChart3, colorClass: 'text-violet-500', permission: 'view_financial_reports' },
        { href: '/admin/payments', label: 'Deposit & Revenue Ledger', icon: DollarSign, colorClass: 'text-emerald-500', permission: 'manage_deposits' },
        { href: '/admin/unlocks', label: 'Contact Unlocks (৳)', icon: DollarSign, colorClass: 'text-emerald-600', permission: 'view_financial_reports' },
        { href: '/admin/ads', label: 'Earn Rewards & Lottery', icon: Gift, colorClass: 'text-amber-500', permission: 'manage_watch_earn' },
      ]
    },
    {
      title: '💬 WHATSAPP & AUTOMATION',
      links: [
        { href: '/admin/conversations', label: 'User Inbox & Chat Monitor (💬)', icon: MessageCircle, colorClass: 'text-sky-500', permission: 'moderate_messages' },
        { href: '/admin/whatsapp', label: 'WhatsApp Bot & Schedules', icon: MessageSquare, colorClass: 'text-emerald-500', permission: 'send_notifications' },
        { href: '/admin/support', label: 'Live Support Chat Desk', icon: Headphones, colorClass: 'text-blue-500', permission: 'moderate_messages' },
        { href: '/admin/notifications', label: 'Broadcast Alerts & Notices', icon: Bell, colorClass: 'text-pink-400', permission: 'send_notifications' },
      ]
    },
    {
      title: '👥 PLAYERS & COMMUNITY',
      links: [
        { href: '/admin/users', label: 'Player Accounts Directory', icon: Users, colorClass: 'text-purple-600', permission: 'manage_users' },
        { href: '/admin/squads', label: 'Squad & Clan Management (🛡️)', icon: Swords, colorClass: 'text-orange-500', permission: 'manage_tournaments' },
        { href: '/admin/lfg', label: 'LFG Recruitment Board', icon: Crosshair, colorClass: 'text-blue-500', permission: 'moderate_lfg' },
        { href: '/admin/user-logs', label: 'Player Activity Logs (👥)', icon: History, colorClass: 'text-[#2563EB]', permission: 'manage_users' },
        { href: '/admin/moderation', label: 'Chat Moderation & Bans', icon: ShieldAlert, colorClass: 'text-red-500', permission: 'moderate_messages' },
      ]
    },
    {
      title: '🛡️ SECURITY & SETTINGS',
      links: [
        { href: '/admin/anti-cheat', label: 'Anti-Cheat Shield (🛡️)', icon: ShieldAlert, colorClass: 'text-red-600', permission: 'manage_users', ownerOnly: true },
        { href: '/admin/banners', label: 'Banners & Sliders (🖼️)', icon: Sparkles, colorClass: 'text-orange-500', permission: 'manage_settings' },
        { href: '/admin/roles', label: 'Sub-Admin Role Manager', icon: KeyRound, colorClass: 'text-indigo-500', permission: 'manage_roles', ownerOnly: true },
        { href: '/admin/delete-requests', label: 'Delete Approvals', icon: ShieldAlert, colorClass: 'text-red-500', permission: 'approve_deletes', ownerOnly: true },
        { href: '/admin/activity-log', label: 'Admin Activity Log (🛡️)', icon: ShieldCheck, colorClass: 'text-teal-600', permission: 'manage_roles', ownerOnly: true },
        { href: '/admin/settings', label: 'Platform Settings & CMS', icon: Settings, colorClass: 'text-slate-400', permission: 'manage_settings', ownerOnly: true },
      ]
    },
    {
      title: '🖥️ SERVER & DATABASE',
      links: [
        { href: '/admin/server/usage', label: 'Server Resource Usage', icon: Server, colorClass: 'text-indigo-500', permission: 'view_dashboard', ownerOnly: true },
        { href: '/admin/server/database', label: 'Database Metrics', icon: Database, colorClass: 'text-emerald-500', permission: 'view_dashboard', ownerOnly: true },
        { href: '/admin/server/storage', label: 'Storage & Media Buckets', icon: HardDrive, colorClass: 'text-amber-500', permission: 'view_dashboard', ownerOnly: true },
        { href: '/admin/server/page-speed', label: 'Page Speed & Latency', icon: Activity, colorClass: 'text-rose-500', permission: 'view_dashboard', ownerOnly: true },
        { href: '/admin/server/backup', label: 'Data Backup', icon: CloudDownload, colorClass: 'text-cyan-600', permission: 'view_dashboard', ownerOnly: true },
      ]
    }
  ];

  const isOwner = sessionUser?.role === 'OWNER' || sessionUser?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col lg:flex-row antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Clean Modern White Sidebar (Fixed Left) */}
      <aside className="w-full lg:w-72 lg:h-screen lg:sticky lg:top-0 lg:flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-4 lg:p-5 flex flex-col z-30 overflow-hidden shadow-xs">
        
        {/* Top Header & Brand */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <Link href="/admin" className="flex items-center space-x-3 group flex-shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-slate-700/50 bg-slate-950 p-0.5">
                <img src="/logo.png" alt="ESPORTS ZONE BD" className="w-full h-full object-cover rounded-[10px]" />
              </div>
              <div className="whitespace-nowrap">
                <div className="font-heading font-black text-xl text-slate-900 leading-none flex items-center gap-1.5">
                  <span>ESPORTS ZONE BD</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-red/10 text-brand-red font-mono font-bold">PRO</span>
                </div>
                <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider mt-1">ADMIN DASHBOARD</div>
              </div>
            </Link>

            <button 
              className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Nav Area */}
        <div className={`${open ? 'block' : 'hidden lg:block'} flex-1 overflow-y-auto pr-1 py-3.5 space-y-4 custom-scrollbar min-h-0 text-sm`}>
          
          {/* 1. Standalone Top Menu Items */}
          <div className="space-y-1">
            {topStandaloneLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3.5 rounded-[12px] px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-blue-50 text-[#2563EB] font-bold shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${link.colorClass}`} />
                  <span className="flex-1 truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* 2. Categorized Dropdown Sections (VENDORS, COMMUNITY, SETTINGS) */}
          {navSections.map((section) => {
            const isCollapsed = Boolean(collapsedSections[section.title]);
            const visibleSectionLinks = section.links.filter((link) => {
              if (!sessionUser) return true;
              if (isOwner) return true;
              if (link.ownerOnly) return false;
              return sessionUser.permissions?.includes(link.permission);
            });

            if (visibleSectionLinks.length === 0) return null;

            return (
              <div key={section.title} className="pt-2.5 pb-0.5 space-y-1">
                {/* Bold & High-Contrast Accordion Section Capsule Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer select-none border ${
                    isCollapsed
                      ? 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 border-slate-200/70 shadow-2xs'
                      : 'bg-slate-100 text-slate-900 border-slate-200 shadow-2xs hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-3.5 rounded-full bg-blue-600 flex-shrink-0" />
                    <span className="font-black text-slate-800 truncate">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white font-bold text-slate-500 border border-slate-200/80 shadow-2xs">
                      {visibleSectionLinks.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </button>

                {/* Sub-links with clean tree indentation & visual grouping */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pl-2 border-l-2 border-slate-200/70 ml-2.5 my-1">
                    {visibleSectionLinks.map((link) => {
                      const Icon = link.icon;
                      const active = pathname === link.href;
                      return (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-[12px] px-3 py-2 text-sm font-semibold transition-colors ${
                            active
                              ? 'bg-blue-50 text-[#2563EB] font-bold shadow-xs'
                              : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${link.colorClass}`} />
                          <span className="flex-1 truncate">{link.label}</span>
                          {Boolean((link as any).badge && (link as any).badge > 0) && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs">
                              {(link as any).badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Bottom Button: View Website */}
        <div className={`${open ? 'block' : 'hidden lg:block'} flex-shrink-0 pt-3 border-t border-[#F1F5F9] mt-auto`}>
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-[12px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#2563EB] text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
          >
            <Globe className="w-5 h-5 text-[#2563EB]" />
            <span>View Website</span>
          </Link>
        </div>

      </aside>

      {/* Main Executive Content Area (Independently Scrollable) */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen bg-[#F8FAFC]">
        
        {/* Top Header Bar matching reference image structure */}
        <header className="h-[60px] bg-white border-b border-[#E2E8F0] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 flex-shrink-0 shadow-xs">
          
          {/* Left Title / Breadcrumb */}
          <div className="flex items-center space-x-2 text-[15px] font-bold text-[#0F172A]">
            <span>Admin Panel</span>
          </div>

          {/* Right Action Widgets (Session Shield + View Website + Logout) */}
          <div className="flex items-center space-x-3">
            
            {/* Session Expiry Pill */}
            {timeLeft !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[12px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                <span>Session expires in: <strong className="font-semibold">{Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}</strong></span>
              </div>
            )}

            {/* View Website Button */}
            <Link
              href="/"
              target="_blank"
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1 rounded-[10px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] text-[12px] font-medium transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <span>View Website</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-[12px] font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

    </div>
  );
}
