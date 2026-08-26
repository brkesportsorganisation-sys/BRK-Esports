'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Coins, ArrowRight } from 'lucide-react';
import { Banner, User } from '@/lib/types';

interface ShopBannerSliderProps {
  banners: Banner[];
  currentUser: User | null;
  slideInterval?: number;
  hideBalances?: boolean;
}

export default function ShopBannerSlider({
  banners,
  currentUser,
  slideInterval = 4000,
  hideBalances = false,
}: ShopBannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeSlides = banners.filter((b) => b.isActive && b.imageUrl);
  const slidesToDisplay = activeSlides.length > 0 ? activeSlides : banners;

  const handleNext = useCallback(() => {
    if (slidesToDisplay.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slidesToDisplay.length);
  }, [slidesToDisplay.length]);

  const handlePrev = useCallback(() => {
    if (slidesToDisplay.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slidesToDisplay.length) % slidesToDisplay.length);
  }, [slidesToDisplay.length]);

  // Auto-slide effect
  useEffect(() => {
    if (slidesToDisplay.length <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, slideInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleNext, isHovered, slideInterval, slidesToDisplay.length]);

  const currentSlide = slidesToDisplay[currentIndex] || slidesToDisplay[0];

  return (
    <div className="space-y-4">
      {/* ── Multi-Banner Auto Slider ── */}
      <div
        className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {currentSlide?.imageUrl ? (
          <div className="relative w-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide?.id || currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="w-full h-auto block"
              >
                {currentSlide.linkUrl && currentSlide.linkUrl !== '#' && currentSlide.linkUrl !== '/shop' ? (
                  <Link href={currentSlide.linkUrl} className="block w-full cursor-pointer">
                    <img
                      src={currentSlide.imageUrl}
                      alt={currentSlide.title || 'Shop Banner'}
                      className="w-full h-auto block rounded-3xl transition-transform duration-500 group-hover:scale-[1.006]"
                    />
                  </Link>
                ) : (
                  <img
                    src={currentSlide.imageUrl}
                    alt={currentSlide.title || 'Shop Banner'}
                    className="w-full h-auto block rounded-3xl"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-8 sm:p-10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse text-amber-400" />
              <span>{currentSlide?.badge || 'ESPORTS ZONE BD OFFICIAL REWARDS & COIN SHOP'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-tight">
              {currentSlide?.title || 'Gaming Shop & Diamond Center'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {currentSlide?.subtitle || 'Use your tournament winnings or EZBD Coins to buy official Free Fire Diamonds, Weekly Passes, and Exclusive items!'}
            </p>
          </div>
        )}

        {/* Left & Right Slider Controls */}
        {slidesToDisplay.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Banner"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer shadow-xl hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Banner"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 cursor-pointer shadow-xl hover:scale-110"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Slider Pagination Pill Indicators */}
            <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 z-20 flex items-center bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
              {slidesToDisplay.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to banner slide ${idx + 1}`}
                  className="p-1 cursor-pointer flex items-center justify-center focus:outline-none"
                >
                  <span
                    className={`block transition-all duration-300 rounded-full ${
                      idx === currentIndex
                        ? 'w-6 h-2 bg-white shadow-md'
                        : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Quick Balances Bar ── */}
      {!hideBalances && (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black font-heading text-slate-900 leading-tight">
              {currentSlide?.title || 'Gaming Shop & Diamond Center'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">
              {currentSlide?.subtitle || 'Instant Free Fire Diamond Delivery, Passes & EZBD Coin Rewards'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Coin Balance Box */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-2 flex-1 sm:flex-initial min-w-[130px]">
            <div className="flex items-center justify-between text-[10px] text-amber-700 font-bold uppercase tracking-wider">
              <span>Coins</span>
              <Link href="/ads" className="text-amber-600 hover:underline flex items-center gap-0.5">
                Earn <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="text-lg font-heading font-black text-amber-600 flex items-center gap-1">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{(currentUser?.coinBalance || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Wallet Balance Box */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl px-4 py-2 flex-1 sm:flex-initial min-w-[130px]">
            <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
              <span>Wallet</span>
              <Link href="/wallet" className="text-emerald-600 hover:underline flex items-center gap-0.5">
                Deposit <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
            <div className="text-lg font-heading font-black text-emerald-600 flex items-center gap-0.5">
              <span>৳</span>
              <span>{(currentUser?.walletBalance || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
