'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Save, 
  RefreshCw, 
  Check, 
  Eye, 
  Sliders, 
  ArrowRight, 
  Loader2, 
  ShoppingBag, 
  Tag, 
  ExternalLink 
} from 'lucide-react';
import { Banner } from '@/lib/types';
import { initialBanners } from '@/lib/mock-data';

export default function AdminShopBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeBanner, setActiveBanner] = useState<Banner>({
    id: 'shop_banner_hero',
    title: 'OFFICIAL GAMING TOP-UP & DIAMOND SHOP',
    subtitle: 'Instant Delivery • 100% Player UID Safe • Dual Wallet & Coin Balance Payments',
    badgeText: '🔥 HOT DEALS & OFFERS',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
    placement: 'SHOP_BANNER',
    link: '/shop',
    buttonText: 'SHOP PACKAGES NOW',
    isActive: true,
    order: 1,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
  });
  const [slideInterval, setSlideInterval] = useState<number>(4000);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadBanners = async () => {
    try {
      const res = await fetch('/api/banners', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.shopBanners && Array.isArray(data.shopBanners) && data.shopBanners.length > 0) {
          setBanners(data.shopBanners);
          setActiveBanner(data.shopBanners[0]);
        } else if (data.shopBanner) {
          setActiveBanner(data.shopBanner);
        }
        if (data.settings?.autoSlideInterval) {
          setSlideInterval(data.settings.autoSlideInterval);
        }
      }
    } catch (err) {
      console.warn('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopBanner: activeBanner,
          settings: { autoSlideInterval: slideInterval },
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        await loadBanners();
      } else {
        alert('Failed to save banner settings.');
      }
    } catch (err) {
      console.error('Error saving banners:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-amber-500" />
            <span>Storefront Hero Banners & Slider Manager</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customize promotional hero banners, auto-slide interval, headline badges, and call-to-action buttons for the user shop.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadBanners}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/shop"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
          >
            <span>View Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-brand-orange" />
          <span>Live Storefront Hero Preview</span>
        </span>

        <div className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-950 p-6 sm:p-10 min-h-[220px] flex flex-col justify-between">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-xs scale-105"
            style={{ backgroundImage: `url(${activeBanner.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200'})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

          <div className="relative z-10 space-y-3 max-w-xl">
            {activeBanner.badgeText && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-mono text-[10px] font-black tracking-wider uppercase shadow-md">
                {activeBanner.badgeText}
              </span>
            )}

            <h2 className="font-heading font-black text-xl sm:text-3xl text-white tracking-tight leading-tight">
              {activeBanner.title}
            </h2>

            <p className="text-xs text-slate-300 line-clamp-2">
              {activeBanner.subtitle}
            </p>
          </div>

          <div className="relative z-10 pt-4 flex items-center gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
            >
              <span>{activeBanner.buttonText || 'Shop Packages Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono">
              Auto-slide: Every {slideInterval / 1000}s
            </span>
          </div>
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <h3 className="font-heading font-black text-base text-slate-900 border-b border-slate-100 pb-3">
          Configure Hero Banner Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase">Banner Headline Title *</label>
            <input
              type="text"
              required
              value={activeBanner.title}
              onChange={(e) => setActiveBanner({ ...activeBanner, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase">Badge Tag Label</label>
            <input
              type="text"
              value={activeBanner.badgeText || ''}
              onChange={(e) => setActiveBanner({ ...activeBanner, badgeText: e.target.value })}
              placeholder="e.g. 🔥 HOT DEALS & OFFERS"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="font-bold text-slate-700 uppercase">Subtitle Description</label>
            <input
              type="text"
              value={activeBanner.subtitle || ''}
              onChange={(e) => setActiveBanner({ ...activeBanner, subtitle: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase">Background Image URL</label>
            <input
              type="url"
              required
              value={activeBanner.imageUrl}
              onChange={(e) => setActiveBanner({ ...activeBanner, imageUrl: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-[11px]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase">Call To Action Button Text</label>
            <input
              type="text"
              value={activeBanner.buttonText || ''}
              onChange={(e) => setActiveBanner({ ...activeBanner, buttonText: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase">Auto-Slide Interval Speed</label>
            <select
              value={slideInterval}
              onChange={(e) => setSlideInterval(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold"
            >
              <option value={3000}>3 Seconds (Fast)</option>
              <option value={4000}>4 Seconds (Standard)</option>
              <option value={5000}>5 Seconds (Relaxed)</option>
              <option value={8000}>8 Seconds (Slow)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl self-end">
            <div>
              <span className="font-bold text-slate-900 block">Banner Active Status</span>
              <span className="text-[10px] text-slate-500">Show on user-facing storefront</span>
            </div>
            <input
              type="checkbox"
              checked={activeBanner.isActive}
              onChange={(e) => setActiveBanner({ ...activeBanner, isActive: e.target.checked })}
              className="w-4 h-4 text-brand-orange rounded cursor-pointer"
            />
          </div>

        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
              <Check className="w-4 h-4" /> Changes saved and live on store!
            </span>
          ) : <span />}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Banner Settings</span>
          </button>
        </div>

      </form>

    </div>
  );
}
