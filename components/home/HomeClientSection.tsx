'use client';

import dynamic from 'next/dynamic';

// Lottery Wheel loaded lazily — below the fold, heavy animation
const HomeLotteryWheel = dynamic(() => import('@/components/home/HomeLotteryWheel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
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
