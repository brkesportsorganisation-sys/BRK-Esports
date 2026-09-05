'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Trophy, Wallet, Radio, Users, Award, Swords, Gift, User as UserIcon } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isLiveActive, setIsLiveActive] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    async function checkLiveStatus() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          const isLive = s.YOUTUBE_LIVE_IS_ACTIVE === 'true' || s.YOUTUBE_LIVE_IS_ACTIVE === true || Boolean(s.YOUTUBE_LIVE_URL);
          setIsLiveActive(Boolean(isLive));
        }
      } catch {}
    }
    checkLiveStatus();
  }, []);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/vendor')) {
    return null;
  }

  const tabs: { name: string; href: string; icon: React.ElementType; isLive?: boolean }[] = [
    { name: t('nav_tournaments', 'টুর্নামেন্ট'), href: '/tournaments', icon: Trophy, isLive: isLiveActive },
    { name: t('nav_rewards', 'রিওয়ার্ডস'), href: '/ads', icon: Gift },
    { name: t('nav_home', 'হোম'), href: '/', icon: Flame },
    { name: t('nav_wallet', 'ওয়ালেট'), href: '/wallet', icon: Wallet },
    { name: t('nav_profile', 'প্রোফাইল'), href: '/profile', icon: UserIcon },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-1 py-1 shadow-[0_-4px_20px_rgba(15,23,42,0.08),0_-1px_3px_rgba(15,23,42,0.04)] font-sans h-15 flex items-center"
    >
      {/* Top subtle highlight divider line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-slate-200 pointer-events-none" />
      <div className="flex items-center justify-around max-w-md mx-auto w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.name}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'scale-105'
                  : 'hover:opacity-90 active:scale-95'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-md shadow-orange-500/25' 
                  : 'bg-transparent text-slate-600'
              }`}>
                <Icon className={`w-5 h-5 ${tab.isLive ? 'text-red-600 animate-pulse' : ''}`} aria-hidden="true" />
                {tab.isLive && (
                  <span className="absolute top-0.5 right-0.5 flex h-2 w-2" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-sans font-bold mt-0.5 leading-none tracking-tight text-center truncate max-w-[72px] ${
                isActive 
                  ? 'text-red-700 font-black' 
                  : 'text-slate-700 font-bold'
              }`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
