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
  UserCheck
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

  // All 25 menu routes with their required permission key
  const allNavLinks = [
    { href: '/admin', label: 'Overview Dashboard', icon: LayoutGrid, permission: 'view_dashboard' as AdminPermissionKey },
    { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy, permission: 'manage_tournaments' as AdminPermissionKey },
    { href: '/admin/matches', label: 'Match Results Entry', icon: Gamepad2, permission: 'enter_results' as AdminPermissionKey },
    { href: '/admin/registrations', label: 'Registrations', icon: ClipboardList, badge: pendingCount, permission: 'manage_tournaments' as AdminPermissionKey },
    { href: '/admin/users', label: 'User Directory', icon: Users, permission: 'manage_users' as AdminPermissionKey },
    { href: '/admin/lfg', label: 'LFG Squad Moderation', icon: Crosshair, permission: 'moderate_lfg' as AdminPermissionKey },
    { href: '/admin/payments', label: 'Deposit Verifications', icon: CreditCard, permission: 'manage_deposits' as AdminPermissionKey },
    { href: '/admin/withdrawals', label: 'Winning Payouts', icon: ArrowUpRight, permission: 'manage_withdrawals' as AdminPermissionKey },
    { href: '/admin/roles', label: 'Sub-Admin Roles', icon: KeyRound, permission: 'manage_roles' as AdminPermissionKey, ownerOnly: true },
    { href: '/admin/delete-requests', label: 'Delete Approvals', icon: ShieldAlert, permission: 'approve_deletes' as AdminPermissionKey, ownerOnly: true },
    { href: '/admin/activity-log', label: 'Activity Audit Log', icon: History, permission: 'manage_roles' as AdminPermissionKey, ownerOnly: true },
    { href: '/admin/notifications', label: 'Announcements', icon: Bell, permission: 'send_notifications' as AdminPermissionKey },
    { href: '/admin/ads', label: 'Ad & Video Rewards', icon: PlaySquare, permission: 'manage_watch_earn' as AdminPermissionKey },
    { href: '/admin/settings', label: 'Site Settings', icon: Settings, permission: 'manage_settings' as AdminPermissionKey, ownerOnly: true },
  ];

  const isOwner = sessionUser?.role === 'OWNER' || sessionUser?.role === 'SUPER_ADMIN';

  // Dynamic permission-gated sidebar
  const visibleLinks = allNavLinks.filter((link) => {
    if (!sessionUser) return true; // Initial fallback before mount
    if (isOwner) return true; // Platform Owner sees all menus
    if (link.ownerOnly) return false; // Sub-admins can NEVER see Owner-only menus
    return sessionUser.permissions?.includes(link.permission);
  });

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 font-body">
      <div className="flex min-h-screen flex-col lg:flex-row">
        
        {/* Sidebar */}
        <aside className="w-full border-b border-slate-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r shadow-sm relative z-20 flex flex-col justify-between">
          <div>
            
            {/* Console Branding */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-red-500/30 bg-red-50 p-2 text-red-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-red-600 font-black">Black Rock</p>
                  <p className="text-sm font-black text-slate-900">Admin Console</p>
                </div>
              </div>
              <button className="rounded-xl border border-slate-300 p-2 lg:hidden text-slate-600" onClick={() => setOpen((prev) => !prev)}>
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Active User Credential Badge */}
            {sessionUser && (
              <div className="my-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                  {sessionUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 truncate">{sessionUser.displayName}</div>
                  <div className="text-[10px] font-mono text-indigo-600 font-bold flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    <span>{isOwner ? 'Platform Owner' : `@${sessionUser.username}`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className={`${open ? 'block' : 'hidden lg:block'} max-h-[calc(100vh-220px)] overflow-y-auto pr-1`}>
              <nav className="mt-2 space-y-1">
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{link.label}</span>
                      {Boolean((link as any).badge && (link as any).badge > 0) && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm">
                          {(link as any).badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

          </div>

          {/* Footer Controls */}
          <div className={`${open ? 'block' : 'hidden lg:block'} pt-4 border-t border-slate-100 mt-4 space-y-2`}>
            {timeLeft !== null && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 p-2.5 text-[11px] font-bold text-orange-600 border border-orange-200">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Auto Logout: <span className="font-mono font-black">{Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}</span>
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:text-red-600 hover:bg-red-50 hover:border-red-100 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout Console</span>
            </button>
          </div>

        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
