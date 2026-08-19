'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Trophy, Wallet, Radio, Users, Award, Swords, Gift } from 'lucide-react';
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
    { name: t('nav_home', 'হোম'), href: '/', icon: Flame },
    { name: t('nav_tournaments', 'টুর্নামেন্ট'), href: '/tournaments', icon: Trophy },
    { name: '1V1 ARENA', href: '/arena', icon: Swords },
    { name: 'REWARDS', href: '/ads', icon: Gift },
    { name: t('nav_wallet', 'ওয়ালেট'), href: '/wallet', icon: Wallet },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-slate-200/90 backdrop-blur-2xl px-2 py-1.5 shadow-xl shadow-slate-900/5">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center py-1 px-2 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'scale-105'
                  : 'hover:opacity-80'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-md shadow-orange-500/30' 
                  : 'bg-transparent text-slate-500'
              }`}>
                <Icon className={`w-4.5 h-4.5 ${tab.isLive ? 'text-brand-red animate-pulse' : ''}`} />
                {tab.isLive && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-heading uppercase font-bold mt-0.5 tracking-wider ${
                isActive 
                  ? 'text-brand-orange font-black drop-shadow-xs' 
                  : 'text-slate-500 font-semibold'
              }`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
