'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, 
  Trophy, 
  KeyRound, 
  Gamepad2, 
  Users, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Menu, 
  LayoutGrid, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Clock,
  Settings,
  DollarSign
} from 'lucide-react';
import { VendorAccessLevel, VendorPermissionKey } from '@/lib/types';

interface VendorSessionInfo {
  id: string;
  vendorId: string;
  name: string;
  email: string;
  accessLevel: VendorAccessLevel;
  permissions: VendorPermissionKey[];
  assignedTournaments: string[];
}

export default function VendorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [vendor, setVendor] = useState<VendorSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/vendor/login') {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch('/api/vendor/session', { credentials: 'include' });
        if (!res.ok) {
          router.replace('/vendor/login');
          return;
        }
        const data = await res.json();
        if (data.vendor) {
          setVendor(data.vendor);
        } else {
          router.replace('/vendor/login');
        }
      } catch {
        router.replace('/vendor/login');
      } finally {
        setLoading(false);
      }
    };

    void checkSession();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/vendor/logout', { method: 'POST' });
    } catch {}
    router.replace('/vendor/login');
  };

  if (pathname === '/vendor/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-xs font-mono text-violet-400">AUTHENTICATING VENDOR PORTAL...</p>
        </div>
      </div>
    );
  }

  const isFull = vendor?.accessLevel === 'FULL_ACCESS';
  const hasPerm = (p: VendorPermissionKey) => isFull || vendor?.permissions?.includes(p);

  const navLinks = [
    {
      href: '/vendor',
      label: 'My Tournaments',
      icon: Trophy,
      show: true,
      color: 'text-violet-400',
    },
    {
      href: '/vendor/settings',
      label: 'My Slots & Room Pass',
      icon: KeyRound,
      show: hasPerm('manage_own_slots') || hasPerm('manage_room_details'),
      color: 'text-amber-400',
    },
    {
      href: '/vendor/matches',
      label: 'My Match Results',
      icon: Gamepad2,
      show: hasPerm('submit_results') || hasPerm('enter_match_results'),
      color: 'text-emerald-400',
    },
    {
      href: '/vendor/registrations',
      label: 'Player Rosters & WhatsApp',
      icon: Users,
      show: hasPerm('view_registrations'),
      color: 'text-cyan-400',
    },
    {
      href: '/vendor/earnings',
      label: 'My Earnings & Cashout',
      icon: DollarSign,
      show: hasPerm('view_own_earnings') || hasPerm('request_payout'),
      color: 'text-emerald-400',
    },
    {
      href: '/vendor/profile',
      label: 'My Storefront Profile',
      icon: Store,
      show: hasPerm('edit_store_profile') || isFull,
      color: 'text-fuchsia-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans flex flex-col lg:flex-row antialiased selection:bg-violet-600 selection:text-white">
      
      {/* Sidebar */}
      <aside className="w-full lg:w-72 lg:h-screen lg:flex-shrink-0 bg-[#0C101A] border-b lg:border-b-0 lg:border-r border-violet-950/40 p-4 lg:p-6 flex flex-col z-30 shadow-2xl">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
          <Link href="/vendor" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-violet-950/50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-violet-500/40 bg-slate-950 p-0.5">
              <img src="/logo.png?v=3" alt="ESPORTS ZONE BD" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div>
              <div className="font-heading font-black text-lg text-white leading-none flex items-center gap-1.5">
                <span>ESPORTS ZONE BD</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono font-bold border border-violet-500/30">VENDOR</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">HOST PORTAL</div>
            </div>
          </Link>

          <button 
            className="lg:hidden p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor Profile Card */}
        {vendor && (
          <div className="my-4 p-3.5 rounded-2xl bg-gradient-to-br from-violet-950/30 to-slate-900/60 border border-violet-500/20 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{vendor.name}</div>
                <div className="text-[10px] font-mono text-violet-300 truncate font-semibold">@{vendor.vendorId}</div>
              </div>
              {isFull ? (
                <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] font-black uppercase shadow-xs whitespace-nowrap">
                  FULL ACCESS
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase shadow-xs whitespace-nowrap">
                  LIMITED ACCESS
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden lg:block'} flex-1 overflow-y-auto py-2 space-y-1.5 custom-scrollbar min-h-0`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
            Vendor Operations
          </div>

          {navLinks
            .filter((l) => l.show)
            .map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30 font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : link.color}`} />
                  <span className="flex-1 truncate">{link.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-violet-200" />}
                </Link>
              );
            })}
        </div>

        {/* Bottom Actions */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden lg:block'} pt-4 border-t border-slate-800/80 space-y-2 mt-auto`}>
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
            <span>Public Tournament Site</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Portal</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-screen lg:overflow-y-auto custom-scrollbar">
        
        {/* Top Header */}
        <header className="h-14 bg-[#0C101A]/80 backdrop-blur-md border-b border-violet-950/30 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Store className="w-4 h-4 text-violet-400" />
            <span>Vendor Operator Workspace</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE SYSTEM</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

      </div>

    </div>
  );
}
