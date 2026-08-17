'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Trophy, Wallet, Radio, Users, Award } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isLiveActive, setIsLiveActive] = useState(false);

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

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const tabs: { name: string; href: string; icon: React.ElementType; isLive?: boolean }[] = [
    { name: 'Home', href: '/', icon: Flame },
    { name: 'Tournaments', href: '/tournaments', icon: Trophy },
    { name: 'Live', href: '/live', icon: Radio, isLive: isLiveActive },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel bg-slate-900/95 border-t border-slate-700/60 backdrop-blur-2xl px-2 py-2 shadow-cyber">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-brand-orange scale-105 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-brand-orange/20 text-brand-orange shadow-neon-orange' : 'bg-transparent'
              }`}>
                <Icon className={`w-5 h-5 ${tab.isLive ? 'text-red-500 animate-pulse' : ''}`} />
                {tab.isLive && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-heading uppercase font-bold mt-0.5 tracking-wider ${tab.isLive ? 'text-red-500 font-black' : ''}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
