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
  Sparkles,
  Search,
  ExternalLink
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
        const res = await fetch('/api/admin/registrations', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const count = (data.registrations || []).filter((r: any) => r.status === 'PENDING').length;
          setPendingCount(count);
        }
      } catch {}
    };
    void loadPending();
    const interval = setInterval(() => void loadPending(), 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: AdminPermissionKey;
  badge?: number;
  ownerOnly?: boolean;
}

interface NavSection {
  title: string;
  links: NavLinkItem[];
}

  // All 25 menu routes categorized into clean sections
  const navSections: NavSection[] = [
    {
      title: 'OPERATIONS & TOURNAMENTS',
      links: [
        { href: '/admin', label: 'Dashboard Overview', icon: LayoutGrid, permission: 'view_dashboard' },
        { href: '/admin/tournaments', label: 'Tournaments & Slots', icon: Trophy, permission: 'manage_tournaments' },
        { href: '/admin/matches', label: 'Match Results & Kills', icon: Gamepad2, permission: 'enter_results' },
        { href: '/admin/registrations', label: 'Slot Registrations', icon: ClipboardList, badge: pendingCount, permission: 'manage_tournaments' },
      ]
    },
    {
      title: 'FINANCIAL CONTROL',
      links: [
        { href: '/admin/payments', label: 'Deposit Verifications', icon: CreditCard, permission: 'manage_deposits' },
        { href: '/admin/withdrawals', label: 'Winning Payouts', icon: ArrowUpRight, permission: 'manage_withdrawals' },
      ]
    },
    {
      title: 'PLAYERS & COMMUNITY',
      links: [
        { href: '/admin/users', label: 'Player Accounts', icon: Users, permission: 'manage_users' },
        { href: '/admin/lfg', label: 'LFG Recruitment Board', icon: Crosshair, permission: 'moderate_lfg' },
        { href: '/admin/notifications', label: 'Announcements & Alerts', icon: Bell, permission: 'send_notifications' },
        { href: '/admin/ads', label: 'Video Ads & Rewards', icon: PlaySquare, permission: 'manage_watch_earn' },
      ]
    },
    {
      title: 'OWNER SECURITY & SETTINGS',
      links: [
        { href: '/admin/roles', label: 'Sub-Admin Roles', icon: KeyRound, permission: 'manage_roles', ownerOnly: true },
        { href: '/admin/delete-requests', label: 'Delete Approvals', icon: ShieldAlert, permission: 'approve_deletes', ownerOnly: true },
        { href: '/admin/activity-log', label: 'Activity Audit Log', icon: History, permission: 'manage_roles', ownerOnly: true },
        { href: '/admin/settings', label: 'Platform Settings', icon: Settings, permission: 'manage_settings', ownerOnly: true },
      ]
    }
  ];

  const isOwner = sessionUser?.role === 'OWNER' || sessionUser?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-body flex flex-col lg:flex-row antialiased selection:bg-brand-red selection:text-white">
      
      {/* Sleek Dark Obsidian Sidebar */}
      <aside className="w-full lg:w-72 bg-[#0D1322]/95 border-b lg:border-b-0 lg:border-r border-slate-800/80 backdrop-blur-2xl p-4 lg:p-5 flex flex-col justify-between z-30 lg:min-h-screen">
        <div>
          
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/60">
            <Link href="/admin" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange p-0.5 shadow-neon-red flex items-center justify-center">
                <div className="w-full h-full bg-[#090D16] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-brand-red group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="font-heading font-black text-base tracking-wider text-white flex items-center gap-1.5">
                  <span>BLACKROCK</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red font-mono font-bold">PRO</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Executive Admin Suite</div>
              </div>
            </Link>

            <button 
              className="lg:hidden p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Active Admin Profile Card */}
          {sessionUser && (
            <div className="my-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center space-x-3 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {sessionUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-200 truncate">{sessionUser.displayName}</div>
                <div className="text-[10px] font-mono text-brand-cyan flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-brand-cyan" />
                  <span>{isOwner ? 'Platform Owner (Master)' : `@${sessionUser.username}`}</span>
                </div>
              </div>
            </div>
          )}

          {/* Nav Links with Sections */}
          <div className={`${open ? 'block' : 'hidden lg:block'} max-h-[calc(100vh-250px)] overflow-y-auto pr-1 space-y-5 custom-scrollbar`}>
            {navSections.map((section) => {
              const visibleSectionLinks = section.links.filter((link) => {
                if (!sessionUser) return true;
                if (isOwner) return true;
                if (link.ownerOnly) return false;
                return sessionUser.permissions?.includes(link.permission);
              });

              if (visibleSectionLinks.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1.5">
                  <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-3">
                    {section.title}
                  </div>
                  <div className="space-y-1">
                    {visibleSectionLinks.map((link) => {
                      const Icon = link.icon;
                      const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                            active
                              ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red font-extrabold'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                          <span className="flex-1 truncate">{link.label}</span>
                          {Boolean((link as any).badge && (link as any).badge > 0) && (
                            <span className="px-2 py-0.5 rounded-full bg-brand-red text-white text-[10px] font-extrabold shadow-sm animate-pulse">
                              {(link as any).badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer Quick Actions */}
        <div className={`${open ? 'block' : 'hidden lg:block'} pt-4 border-t border-slate-800/80 space-y-2 mt-4`}>
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
              <span>Live Website</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>

          {timeLeft !== null && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-900/80 p-2 text-[10px] font-mono text-slate-400 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-brand-gold" />
              <span>Session Expires in: <strong className="text-white">{Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}</strong></span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-900/40 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Console</span>
          </button>
        </div>

      </aside>

      {/* Main Executive Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Header Breadcrumb Bar */}
        <header className="h-16 bg-[#0D1322]/80 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <span>Admin Console</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-bold capitalize">
              {pathname.replace('/admin/', '').replace('/', '') || 'Overview'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>SUPABASE LIVE</span>
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

    </div>
  );
}
