'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Flame } from 'lucide-react';
import { Banner } from '@/lib/types';
import { initialBanners } from '@/lib/mock-data';

interface HomeBannerSliderProps {
  initialData?: {
    banners?: Banner[];
    settings?: { autoSlideInterval: number; isEnabled: boolean };
  };
}

export default function HomeBannerSlider({ initialData }: HomeBannerSliderProps) {
  const [banners, setBanners] = useState<Banner[]>(() => {
    if (initialData?.banners && initialData.banners.length > 0) return initialData.banners;
    return initialBanners;
  });

  useEffect(() => {
    try {
      const cached = localStorage.getItem('helian_banners');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBanners(parsed);
        }
      }
    } catch {}
  }, []);

  const [slideInterval, setSlideInterval] = useState<number>(() => {
    return initialData?.settings?.autoSlideInterval || 4000;
  });
  
  const [overlayOpacity, setOverlayOpacity] = useState<number>(() => {
    // @ts-ignore
    return initialData?.settings?.overlayOpacity ?? 60;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load latest banners from API
  useEffect(() => {
    async function loadBanners() {
      try {
        const res = await fetch('/api/banners', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.banners && data.banners.length > 0) {
            setBanners(data.banners);
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('helian_banners', JSON.stringify(data.banners));
              }
            } catch {}
          }
          if (data.settings?.autoSlideInterval) {
            setSlideInterval(data.settings.autoSlideInterval);
          }
          if (data.settings?.overlayOpacity !== undefined) {
            setOverlayOpacity(data.settings.overlayOpacity);
          }
        }
      } catch (err) {
        console.warn('Failed to load fresh banners:', err);
      }
    }
    loadBanners();
  }, []);

  const mainSliders = banners.filter((b) => b.placement === 'MAIN_SLIDER' && b.isActive);
  const sideTop = banners.find((b) => b.placement === 'SIDE_TOP' && b.isActive) || banners.find((b) => b.placement === 'SIDE_TOP');
  const sideBottom = banners.find((b) => b.placement === 'SIDE_BOTTOM' && b.isActive) || banners.find((b) => b.placement === 'SIDE_BOTTOM');

  const slidesToDisplay = mainSliders.length > 0 ? mainSliders : initialBanners.filter((b) => b.placement === 'MAIN_SLIDER');

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slidesToDisplay.length);
  }, [slidesToDisplay.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slidesToDisplay.length) % slidesToDisplay.length);
  }, [slidesToDisplay.length]);

  // Auto slide interval
  useEffect(() => {
    if (slidesToDisplay.length <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, slideInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleNext, slideInterval, slidesToDisplay.length, isHovered]);

  const currentSlide = slidesToDisplay[currentIndex] || slidesToDisplay[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Grid Container: 3 Pictures on PC (1 large slider + 2 stacked promo banners), 1 Picture on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        
        {/* ============================================================== */}
        {/* LEFT / MAIN HERO SLIDER (Desktop 8 Cols / Mobile Full Width - 16:9 Widescreen 1920x1080) */}
        {/* ============================================================== */}
        <div 
          className="lg:col-span-8 relative rounded-3xl overflow-hidden aspect-[16/9] min-h-[220px] bg-slate-950 border border-slate-800/80 shadow-2xl shadow-slate-950/40 group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Animated Slide Imagery & Content */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentSlide?.id || currentIndex}
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full"
            >
              <Link href={currentSlide?.linkUrl || '/tournaments'} className="block w-full h-full relative cursor-pointer group/mainlink">
                <Image
                  src={currentSlide?.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=1080&fit=crop&q=85'}
                  alt={currentSlide?.title || 'Esports Banner'}
                  fill
                  priority={true}
                  loading="eager"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 850px"
                  className="object-cover object-center transition-transform duration-700 group-hover/mainlink:scale-105"
                />

                {/* Rich Esports Cinematic Gradient Overlay (Only visible when banner has overlay text) */}
                {Boolean(
                  (currentSlide?.badge && currentSlide.badge.trim() !== '') ||
                  (currentSlide?.title && currentSlide.title.trim() !== '') ||
                  (currentSlide?.subtitle && currentSlide.subtitle.trim() !== '') ||
                  (currentSlide?.buttonText && currentSlide.buttonText.trim() !== '')
                ) && (
                  <div className="absolute inset-0 transition-opacity duration-300 pointer-events-none" style={{ opacity: overlayOpacity / 100 }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/50 to-transparent"></div>
                  </div>
                )}

                {/* Banner Text & Action Content (Only renders fields that have text) */}
                {Boolean(
                  (currentSlide?.badge && currentSlide.badge.trim() !== '') ||
                  (currentSlide?.title && currentSlide.title.trim() !== '') ||
                  (currentSlide?.subtitle && currentSlide.subtitle.trim() !== '') ||
                  (currentSlide?.buttonText && currentSlide.buttonText.trim() !== '')
                ) && (
                  <div className="absolute inset-0 p-5 sm:p-8 md:p-10 flex flex-col justify-end items-start z-10 space-y-2.5 sm:space-y-3.5 max-w-xl">
                    {currentSlide?.badge && currentSlide.badge.trim() !== '' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-red-500/30 animate-pulse">
                        <Flame className="w-3.5 h-3.5" />
                        <span>{currentSlide.badge}</span>
                      </span>
                    )}

                    {currentSlide?.title && currentSlide.title.trim() !== '' && (
                      <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-white leading-tight drop-shadow-md">
                        {currentSlide.title}
                      </h2>
                    )}

                    {currentSlide?.subtitle && currentSlide.subtitle.trim() !== '' && (
                      <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-2 drop-shadow-sm max-w-md">
                        {currentSlide.subtitle}
                      </p>
                    )}

                    {currentSlide?.buttonText && currentSlide.buttonText.trim() !== '' && (
                      <div className="pt-1">
                        <span
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/95 text-slate-900 font-heading font-black text-[11px] sm:text-xs shadow-md transition-all duration-300 backdrop-blur-xs group-hover/mainlink:bg-brand-orange group-hover/mainlink:text-white"
                        >
                          <span>{currentSlide.buttonText}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-brand-orange group-hover/mainlink:text-white group-hover/mainlink:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* Left & Right Slider Arrow Controls */}
          {/* Left & Right Slider Arrow Controls */}
          {slidesToDisplay.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous Banner"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-xs text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-20 cursor-pointer shadow-md hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Banner"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-xs text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-20 cursor-pointer shadow-md hover:scale-105"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Slider Pagination Pill Indicators */}
          {slidesToDisplay.length > 1 && (
            <div className="absolute bottom-2.5 sm:bottom-3.5 right-3 sm:right-4 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-md">
              {slidesToDisplay.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full transition-transform active:scale-90"
                >
                  <span
                    className={`block transition-all duration-300 rounded-full pointer-events-none ${
                      idx === currentIndex
                        ? 'w-5 h-2 bg-white shadow-xs'
                        : 'w-2 h-2 bg-white/60 hover:bg-white/95'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RIGHT STACKED PROMO BANNERS (Desktop Only: Top & Bottom Cards) */}
        {/* ============================================================== */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 sm:gap-5 justify-between">
          
          {/* Top Promo Banner */}
          <Link
            href={sideTop?.linkUrl || '/arena'}
            className="relative rounded-3xl overflow-hidden flex-1 min-h-[160px] bg-slate-950 border border-slate-800/80 shadow-xl group cursor-pointer block transition-transform duration-300 hover:scale-[1.02]"
          >
            <Image
              src={sideTop?.imageUrl || 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80'}
              alt={sideTop?.title || 'Side Top Banner'}
              fill
              sizes="(max-width: 1024px) 100vw, 400px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Gradient Overlay (Only if banner has overlay text) */}
            {Boolean(
              (sideTop?.badge && sideTop.badge.trim() !== '') ||
              (sideTop?.title && sideTop.title.trim() !== '') ||
              (sideTop?.subtitle && sideTop.subtitle.trim() !== '')
            ) && (
              <div className="absolute inset-0 transition-opacity duration-300 pointer-events-none" style={{ opacity: overlayOpacity / 100 }}>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent"></div>
              </div>
            )}

            {/* Content */}
            {Boolean(
              (sideTop?.badge && sideTop.badge.trim() !== '') ||
              (sideTop?.title && sideTop.title.trim() !== '') ||
              (sideTop?.subtitle && sideTop.subtitle.trim() !== '')
            ) && (
              <div className="absolute inset-0 p-5 flex flex-col justify-end items-start z-10 space-y-1.5">
                {sideTop?.badge && sideTop.badge.trim() !== '' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-700 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                    {sideTop.badge}
                  </span>
                )}
                {sideTop?.title && sideTop.title.trim() !== '' && (
                  <h3 className="font-heading font-black text-lg text-white leading-tight group-hover:text-amber-400 transition-colors line-clamp-1">
                    {sideTop.title}
                  </h3>
                )}
                {sideTop?.subtitle && sideTop.subtitle.trim() !== '' && (
                  <p className="text-[11px] text-slate-200 line-clamp-1 font-medium">
                    {sideTop.subtitle}
                  </p>
                )}
              </div>
            )}
          </Link>

          {/* Bottom Promo Banner */}
          <Link
            href={sideBottom?.linkUrl || '/ads'}
            className="relative rounded-3xl overflow-hidden flex-1 min-h-[160px] bg-slate-950 border border-slate-800/80 shadow-xl group cursor-pointer block transition-transform duration-300 hover:scale-[1.02]"
          >
            <Image
              src={sideBottom?.imageUrl || 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80'}
              alt={sideBottom?.title || 'Side Bottom Banner'}
              fill
              sizes="(max-width: 1024px) 100vw, 400px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Gradient Overlay (Only if banner has overlay text) */}
            {Boolean(
              (sideBottom?.badge && sideBottom.badge.trim() !== '') ||
              (sideBottom?.title && sideBottom.title.trim() !== '') ||
              (sideBottom?.subtitle && sideBottom.subtitle.trim() !== '')
            ) && (
              <div className="absolute inset-0 transition-opacity duration-300 pointer-events-none" style={{ opacity: overlayOpacity / 100 }}>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent"></div>
              </div>
            )}

            {/* Content */}
            {Boolean(
              (sideBottom?.badge && sideBottom.badge.trim() !== '') ||
              (sideBottom?.title && sideBottom.title.trim() !== '') ||
              (sideBottom?.subtitle && sideBottom.subtitle.trim() !== '')
            ) && (
              <div className="absolute inset-0 p-5 flex flex-col justify-end items-start z-10 space-y-1.5">
                {sideBottom?.badge && sideBottom.badge.trim() !== '' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm">
                    {sideBottom.badge}
                  </span>
                )}
                {sideBottom?.title && sideBottom.title.trim() !== '' && (
                  <h3 className="font-heading font-black text-lg text-white leading-tight group-hover:text-amber-400 transition-colors line-clamp-1">
                    {sideBottom.title}
                  </h3>
                )}
                {sideBottom?.subtitle && sideBottom.subtitle.trim() !== '' && (
                  <p className="text-[11px] text-slate-200 line-clamp-1 font-medium">
                    {sideBottom.subtitle}
                  </p>
                )}
              </div>
            )}
          </Link>

        </div>

      </div>
    </div>
  );
}

