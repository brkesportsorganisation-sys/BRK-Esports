'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Save, 
  RefreshCw, 
  Check, 
  Eye, 
  EyeOff,
  Sliders, 
  ArrowRight, 
  Loader2, 
  ShoppingBag, 
  Tag, 
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';
import { Banner } from '@/lib/types';
import ImageUploadInput from '@/components/ui/ImageUploadInput';

const DEFAULT_SHOP_BANNER: Banner = {
  id: 'shop_banner_hero',
  title: 'OFFICIAL GAMING TOP-UP & DIAMOND SHOP',
  subtitle: 'Instant Delivery • 100% Player UID Safe • Dual Wallet & Coin Balance Payments',
  badgeText: '🔥 HOT DEALS & OFFERS',
  badge: '🔥 HOT DEALS & OFFERS',
  imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
  placement: 'SHOP_BANNER',
  link: '/shop',
  linkUrl: '/shop',
  buttonText: 'SHOP PACKAGES NOW',
  isActive: true,
  order: 1,
  displayOrder: 1,
  createdAt: new Date().toISOString(),
};

export default function AdminShopBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [slideInterval, setSlideInterval] = useState<number>(4000);
  const [loading, setLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Live Preview Slider State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  const [modalForm, setModalForm] = useState({
    title: '',
    subtitle: '',
    badgeText: '',
    imageUrl: '',
    linkUrl: '/shop',
    buttonText: 'SHOP PACKAGES NOW',
    order: 1,
    isActive: true,
  });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners?all=true', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const shopList = data.banners
          ? data.banners.filter((b: Banner) => b.placement === 'SHOP_BANNER')
          : data.shopBanners || [];

        if (shopList.length > 0) {
          const sorted = shopList.sort((a: Banner, b: Banner) => (a.order || 0) - (b.order || 0));
          setBanners(sorted);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('ezbd_shop_banners', JSON.stringify(sorted.filter((b: Banner) => b.isActive)));
            }
          } catch {}
        } else if (data.shopBanner) {
          setBanners([data.shopBanner]);
        } else {
          setBanners([DEFAULT_SHOP_BANNER]);
        }

        if (data.settings?.autoSlideInterval) {
          setSlideInterval(data.settings.autoSlideInterval);
        }
      }
    } catch (err) {
      console.warn('Failed to load banners:', err);
      showToast('Failed to load banners.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  // Auto-slide live preview
  const activeSlides = banners.filter((b) => b.isActive && b.imageUrl);
  const previewSlides = activeSlides.length > 0 ? activeSlides : banners;

  const handleNextPreview = useCallback(() => {
    if (previewSlides.length <= 1) return;
    setPreviewIndex((prev) => (prev + 1) % previewSlides.length);
  }, [previewSlides.length]);

  const handlePrevPreview = useCallback(() => {
    if (previewSlides.length <= 1) return;
    setPreviewIndex((prev) => (prev - 1 + previewSlides.length) % previewSlides.length);
  }, [previewSlides.length]);

  useEffect(() => {
    if (previewSlides.length <= 1 || isPreviewHovered) return;

    previewTimerRef.current = setInterval(() => {
      handleNextPreview();
    }, slideInterval);

    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, [handleNextPreview, isPreviewHovered, slideInterval, previewSlides.length]);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingBanner(null);
    setModalForm({
      title: '',
      subtitle: '',
      badgeText: '🔥 HOT DEALS & OFFERS',
      imageUrl: '',
      linkUrl: '/shop',
      buttonText: 'SHOP PACKAGES NOW',
      order: banners.length + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setModalForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      badgeText: banner.badgeText || banner.badge || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || banner.link || '/shop',
      buttonText: banner.buttonText || 'SHOP PACKAGES NOW',
      order: banner.order || 1,
      isActive: banner.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Save Modal (Create / Update)
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title.trim() || !modalForm.imageUrl.trim()) {
      showToast('Headline Title and Banner Image are required.', 'error');
      return;
    }

    setIsSavingBanner(true);
    try {
      if (editingBanner) {
        // Update existing banner via PUT
        const res = await fetch('/api/banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingBanner.id,
            title: modalForm.title.trim(),
            subtitle: modalForm.subtitle.trim(),
            badge: modalForm.badgeText.trim(),
            badgeText: modalForm.badgeText.trim(),
            imageUrl: modalForm.imageUrl.trim(),
            linkUrl: modalForm.linkUrl.trim() || '/shop',
            link: modalForm.linkUrl.trim() || '/shop',
            buttonText: modalForm.buttonText.trim(),
            placement: 'SHOP_BANNER',
            order: Number(modalForm.order || 1),
            isActive: modalForm.isActive,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          showToast('Shop banner updated successfully!', 'success');
          setIsModalOpen(false);
          await loadBanners();
        } else {
          showToast(data.message || 'Failed to update banner.', 'error');
        }
      } else {
        // Create new banner via POST
        const res = await fetch('/api/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: modalForm.title.trim(),
            subtitle: modalForm.subtitle.trim(),
            badge: modalForm.badgeText.trim(),
            badgeText: modalForm.badgeText.trim(),
            imageUrl: modalForm.imageUrl.trim(),
            linkUrl: modalForm.linkUrl.trim() || '/shop',
            link: modalForm.linkUrl.trim() || '/shop',
            buttonText: modalForm.buttonText.trim(),
            placement: 'SHOP_BANNER',
            order: Number(modalForm.order || 1),
            isActive: modalForm.isActive,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          showToast('New shop banner added to slider!', 'success');
          setIsModalOpen(false);
          await loadBanners();
        } else {
          showToast(data.message || 'Failed to add banner.', 'error');
        }
      }
    } catch (err: any) {
      console.error('Error saving banner:', err);
      showToast(err?.message || 'Network error saving banner.', 'error');
    } finally {
      setIsSavingBanner(false);
    }
  };

  // Toggle Banner Status
  const handleToggleStatus = async (banner: Banner) => {
    try {
      const newStatus = !banner.isActive;
      const res = await fetch('/api/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: banner.id,
          isActive: newStatus,
        }),
      });

      if (res.ok) {
        showToast(`Banner is now ${newStatus ? 'active and visible 🟢' : 'hidden from shop ⚪'}`, 'success');
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, isActive: newStatus } : b))
        );
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch {
      showToast('Network error updating banner status.', 'error');
    }
  };

  // Delete Banner
  const handleDeleteBanner = async (id: string) => {
    if (banners.length <= 1) {
      if (!confirm('This is the only banner in the shop. Are you sure you want to delete it?')) return;
    } else {
      if (!confirm('Are you sure you want to delete this shop banner?')) return;
    }

    try {
      const res = await fetch(`/api/banners?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        showToast('Shop banner deleted.', 'success');
        setBanners((prev) => prev.filter((b) => b.id !== id));
      } else {
        showToast('Failed to delete banner.', 'error');
      }
    } catch {
      showToast('Network error deleting banner.', 'error');
    }
  };

  // Save Slide Speed Interval
  const handleSaveSlideSpeed = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          autoSlideInterval: slideInterval,
        }),
      });

      if (res.ok) {
        showToast(`Auto-slide speed set to ${slideInterval / 1000} seconds!`, 'success');
      } else {
        showToast('Failed to save slide speed.', 'error');
      }
    } catch {
      showToast('Network error saving slide speed.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const currentPreviewSlide = previewSlides[previewIndex] || previewSlides[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">

      {/* Toast Notification */}
      {toast && (
        <div 
          style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 99999, display: 'flex', alignItems: 'center', gap: '8px' }}
          className={`px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-6 rounded-[24px] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Storefront Multi-Banner Slider Manager</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {banners.length} {banners.length === 1 ? 'Banner' : 'Banners'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage multiple promotional hero banners, auto-slide speed, and call-to-action buttons for the official gaming shop.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={loadBanners}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer transition-all active:scale-95"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/shop"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>View Live Shop</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Shop Banner</span>
          </button>
        </div>
      </div>

      {/* 2. Live Interactive Multi-Banner Preview Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-orange-500" />
            <span>Live Multi-Banner Carousel Preview ({previewSlides.length} Slides • Auto-sliding every {slideInterval / 1000}s)</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500 font-bold">
            Slide {previewIndex + 1} of {previewSlides.length}
          </span>
        </div>

        <div
          className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950 p-6 sm:p-10 min-h-[240px] flex flex-col justify-between group"
          onMouseEnter={() => setIsPreviewHovered(true)}
          onMouseLeave={() => setIsPreviewHovered(false)}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-45 blur-xs scale-105 transition-all duration-700"
            style={{ backgroundImage: `url(${currentPreviewSlide?.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200'})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

          <div className="relative z-10 space-y-3 max-w-xl">
            {(currentPreviewSlide?.badgeText || currentPreviewSlide?.badge) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-mono text-[10px] font-black tracking-wider uppercase shadow-md">
                {currentPreviewSlide.badgeText || currentPreviewSlide.badge}
              </span>
            )}

            <h2 className="font-heading font-black text-xl sm:text-3xl text-white tracking-tight leading-tight">
              {currentPreviewSlide?.title || 'OFFICIAL GAMING TOP-UP & DIAMOND SHOP'}
            </h2>

            <p className="text-xs text-slate-300 line-clamp-2">
              {currentPreviewSlide?.subtitle || 'Instant Delivery • 100% Player UID Safe • Dual Wallet & Coin Balance Payments'}
            </p>
          </div>

          <div className="relative z-10 pt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
              >
                <span>{currentPreviewSlide?.buttonText || 'Shop Packages Now'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Link: <code>{currentPreviewSlide?.linkUrl || currentPreviewSlide?.link || '/shop'}</code>
              </span>
            </div>

            {/* Pagination Indicators */}
            {previewSlides.length > 1 && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {previewSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === previewIndex ? 'w-6 bg-orange-500' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Left & Right Preview Arrows */}
          {previewSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevPreview}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer shadow-lg hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextPreview}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer shadow-lg hover:scale-110"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Slider Global Speed Controller */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Slider Transition & Auto-Slide Speed</h4>
            <p className="text-[11px] text-slate-500">Set how many seconds each banner stays before sliding to the next one.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={slideInterval}
            onChange={(e) => setSlideInterval(Number(e.target.value))}
            className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
          >
            <option value={2000}>⚡ 2 Seconds (Super Fast)</option>
            <option value={3000}>3 Seconds (Fast)</option>
            <option value={4000}>4 Seconds (Standard)</option>
            <option value={5000}>5 Seconds (Relaxed)</option>
            <option value={7000}>7 Seconds (Smooth)</option>
            <option value={10000}>10 Seconds (Slow)</option>
          </select>

          <button
            type="button"
            onClick={handleSaveSlideSpeed}
            disabled={isSavingSettings}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Save Speed</span>
          </button>
        </div>
      </div>

      {/* 4. Multi-Banner Grid Collection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            <span>All Shop Carousel Banners ({banners.length})</span>
          </h3>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Banner</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banners.map((banner, index) => (
            <div
              key={banner.id || index}
              className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Banner Thumbnail Image */}
                <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      No Image Set
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-[10px] font-bold border border-white/20">
                      Order #{banner.order || index + 1}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1 ${
                      banner.isActive
                        ? 'bg-emerald-500/90 text-white shadow-xs'
                        : 'bg-slate-800/90 text-slate-300 border border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${banner.isActive ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                      {banner.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  {/* Badge Label Overlay */}
                  {(banner.badgeText || banner.badge) && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-orange-500 text-white font-mono text-[9px] font-black uppercase tracking-wider shadow-md">
                        {banner.badgeText || banner.badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* Banner Details */}
                <div className="p-5 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1 leading-snug">
                    {banner.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {banner.subtitle || 'No subtitle provided'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate max-w-[150px]">Button: <strong>{banner.buttonText || 'Shop Now'}</strong></span>
                    <span className="truncate max-w-[120px] text-emerald-700">Link: {banner.linkUrl || banner.link || '/shop'}</span>
                  </div>
                </div>
              </div>

              {/* Card Action Controls */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(banner)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    banner.isActive
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {banner.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{banner.isActive ? 'Hide' : 'Show'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(banner)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer"
                    title="Edit Banner"
                  >
                    <Edit3 className="w-4 h-4 text-blue-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="p-2 rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-slate-700 transition-all cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Create / Edit Banner Modal Dialog */}
      {isModalOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
          className="bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingBanner ? 'Edit Shop Banner' : 'Add New Shop Banner'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingBanner ? 'Update the details for this storefront carousel slide.' : 'Create a new promotional banner slide for the user shop.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 uppercase">Banner Headline Title *</label>
                  <input
                    type="text"
                    required
                    value={modalForm.title}
                    onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                    placeholder="e.g. 100% DIAMOND BONUS EVENT!"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Badge Tag Label</label>
                  <input
                    type="text"
                    value={modalForm.badgeText}
                    onChange={(e) => setModalForm({ ...modalForm, badgeText: e.target.value })}
                    placeholder="e.g. 🔥 LIMITED TIME OFFER"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Display Order #</label>
                  <input
                    type="number"
                    min={1}
                    value={modalForm.order}
                    onChange={(e) => setModalForm({ ...modalForm, order: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 uppercase">Subtitle Description</label>
                  <textarea
                    rows={2}
                    value={modalForm.subtitle}
                    onChange={(e) => setModalForm({ ...modalForm, subtitle: e.target.value })}
                    placeholder="e.g. Top up now using bKash/Nagad and get instant in-game diamonds..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                {/* Banner Image Upload */}
                <div className="space-y-1 sm:col-span-2">
                  <ImageUploadInput
                    label="Banner 16:9 Image *"
                    theme="light"
                    required
                    value={modalForm.imageUrl}
                    onChange={(val) => setModalForm({ ...modalForm, imageUrl: val })}
                    placeholder="https://... or upload from device"
                    helperText="Recommended size: 1920x1080 (16:9) • Auto-compressed for high-speed loading"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Button Call-to-Action Text</label>
                  <input
                    type="text"
                    value={modalForm.buttonText}
                    onChange={(e) => setModalForm({ ...modalForm, buttonText: e.target.value })}
                    placeholder="e.g. SHOP PACKAGES NOW"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Target Redirect Link</label>
                  <input
                    type="text"
                    value={modalForm.linkUrl}
                    onChange={(e) => setModalForm({ ...modalForm, linkUrl: e.target.value })}
                    placeholder="e.g. /shop or /wallet"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-900 block">Banner Active Status</span>
                    <span className="text-[10px] text-slate-500">Visible in the live storefront slider</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalForm.isActive}
                    onChange={(e) => setModalForm({ ...modalForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingBanner}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-xs shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSavingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSavingBanner ? 'Saving Banner...' : editingBanner ? 'Save Changes' : 'Add Shop Banner'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
