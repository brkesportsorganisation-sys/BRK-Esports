'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, LogOut, LayoutGrid, Trophy, Users, CreditCard, Settings, Menu, ClipboardList, Bell, PlaySquare, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { User } from '@/lib/types';

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
    
    // Don't verify session on login page to avoid infinite loops or unnecessary requests
    if (pathname === '/admin/login') return;

    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'include' });
        if (!res.ok) {
          router.replace('/admin/login');
        } else {
          const data = await res.json();
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



  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
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
  }, []);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const links = [
    { href: '/admin', label: 'Overview', icon: LayoutGrid },
    { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/admin/registrations', label: 'Registrations', icon: ClipboardList, badge: pendingCount },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/ads', label: 'Ad Management', icon: PlaySquare },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  let filteredLinks = links;
  if (currentUser?.role === 'MODERATOR' && currentUser.adminPermissions) {
    filteredLinks = links.filter(link => currentUser.adminPermissions?.includes(link.href));
  } else if (currentUser?.role === 'ADMIN') {
    filteredLinks = links;
  } else {
    // Only show limited or nothing if they aren't admin/moderator, but fallback to all if currentUser is null to avoid layout shift before mount
    filteredLinks = currentUser === null ? links : [];
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r shadow-sm relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-red-500/30 bg-red-50 p-2 text-red-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-red-600 font-bold">Black Rock</p>
                <p className="text-sm font-black text-slate-900">Admin Console</p>
              </div>
            </div>
            <button className="rounded-xl border border-slate-300 p-2 lg:hidden text-slate-600" onClick={() => setOpen((prev) => !prev)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className={`${open ? 'block' : 'hidden lg:block'}`}>
            <nav className="mt-6 space-y-2">
              {filteredLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    active ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{link.label}</span>
                    {(link as any).badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm">
                        {(link as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {timeLeft !== null && (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-orange-50 p-3 text-xs font-bold text-orange-600 border border-orange-200 shadow-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Auto Logout: <span className="font-black">{Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}</span>
                </span>
              </div>
            )}

            <button onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:text-red-600 hover:bg-red-50 hover:border-red-100 shadow-sm">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
