'use client';

import dynamic from 'next/dynamic';

// Lottery Wheel loaded lazily — below the fold, heavy animation
const HomeLotteryWheel = dynamic(() => import('@/components/home/HomeLotteryWheel'), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[460px] md:min-h-[400px] rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800/80 p-6 flex flex-col items-center justify-center animate-pulse">
      <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin mb-4" />
      <div className="h-4 w-40 bg-slate-800/60 rounded-full" />
    </div>
  ),
});

export default function HomeClientSection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <HomeLotteryWheel />
    </div>
  );
}
