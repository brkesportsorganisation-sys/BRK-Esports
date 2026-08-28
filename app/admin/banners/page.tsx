'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Clock, 
  Check, 
  Sliders, 
  Move, 
  Layers, 
  Save, 
  RefreshCw, 
  Image as ImageIcon,
  ArrowRight,
  Flame,
  Trophy,
  Swords,
  Gift,
  UploadCloud,
  Upload,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Banner, BannerPlacement } from '@/lib/types';
import { initialBanners } from '@/lib/mock-data';

// High-speed client-side image compressor (converts device files to optimized 16:9 / 1920x1080 WebP/JPEG DataURL)
const compressImage = (file: File, maxWidth = 1920, quality = 0.88): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve(dataUrl);
        } catch {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PRESET_IMAGES = [
  { name: '🔥 Free Fire BR Tournament (16:9)', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=1080&fit=crop&q=85' },
  { name: '⚡ Esports Gaming Arena (16:9)', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1920&h=1080&fit=crop&q=85' },
  { name: '💎 Neon Cyber Gaming (16:9)', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&h=1080&fit=crop&q=85' },
  { name: '⚔️ Solo Duel Esports (16:9)', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1920&h=1080&fit=crop&q=85' },
  { name: '🎁 Lucky Wheel & Rewards (16:9)', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1920&h=1080&fit=crop&q=85' },
];

const PROFILE_COVER_PRESETS = [
  { name: '🔥 Free Fire BR Championship', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80' },
  { name: '⚡ Neon Cyber Arena', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&auto=format&fit=crop&q=80' },
  { name: '🏆 Golden Esports Stadium', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80' },
  { name: '⚔️ Crimson Battleground', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1600&auto=format&fit=crop&q=80' },
  { name: '👑 Royal Champions League', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=1600&auto=format&fit=crop&q=80' },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlacement, setFilterPlacement] = useState<'ALL' | BannerPlacement>('ALL');
  const [autoSlideInterval, setAutoSlideInterval] = useState(4000);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Global Player Profile Cover Photo State
  const [profileCoverUrl, setProfileCoverUrl] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80');
  const [savingCover, setSavingCover] = useState(false);
  const [coverSaveSuccess, setCoverSaveSuccess] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [modalImageTab, setModalImageTab] = useState<'UPLOAD' | 'URL' | 'PRESETS'>('UPLOAD');
  const [isUploadingModalImage, setIsUploadingModalImage] = useState(false);
  const [modalImageFileInfo, setModalImageFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [isDraggingModal, setIsDraggingModal] = useState(false);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverFileInfo, setCoverFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);

  const [modalForm, setModalForm] = useState({
    title: '',
    subtitle: '',
    badge: '',
    imageUrl: '',
    linkUrl: '/tournaments',
    buttonText: 'JOIN TOURNAMENT',
    placement: 'MAIN_SLIDER' as BannerPlacement,
    order: 1,
    isActive: true,
  });

  const handleModalFileSelect = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP, GIF)');
      return;
    }
    setIsUploadingModalImage(true);
    try {
      const compressed = await compressImage(file, 1600, 0.85);
      setModalForm((prev) => ({ ...prev, imageUrl: compressed }));
      setModalImageFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
      });
    } catch (err) {
      alert('Failed to process image from device.');
    } finally {
      setIsUploadingModalImage(false);
    }
  };

  const handleCoverFileSelect = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP, GIF)');
      return;
    }
    setIsUploadingCover(true);
    try {
      const compressed = await compressImage(file, 1800, 0.85);
      setProfileCoverUrl(compressed);
      setCoverFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
      });
    } catch (err) {
      alert('Failed to process image from device.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners?all=true');
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
        if (data.settings?.autoSlideInterval) {
          setAutoSlideInterval(data.settings.autoSlideInterval);
        }
        if (data.settings?.overlayOpacity !== undefined) {
          setOverlayOpacity(data.settings.overlayOpacity);
        }
      }

      // Load Profile Cover Photo
      const sRes = await fetch('/api/settings', { cache: 'no-store' });
      if (sRes.ok) {
        const sData = await sRes.json();
        const s = sData.settings || {};
        const cover = s.PROFILE_COVER_URL || s.profile_cover_url;
        if (cover) setProfileCoverUrl(cover);
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

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          autoSlideInterval,
          isEnabled: true,
          overlayOpacity,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfileCover = async () => {
    if (!profileCoverUrl.trim()) {
      alert('Please enter or select a valid cover image URL.');
      return;
    }
    setSavingCover(true);
    setCoverSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'PROFILE_COVER_URL',
          value: profileCoverUrl.trim(),
        }),
      });

      if (res.ok) {
        setCoverSaveSuccess(true);
        setTimeout(() => setCoverSaveSuccess(false), 3000);
      } else {
        alert('Failed to update global profile cover.');
      }
    } catch {
      alert('Network error updating global cover.');
    } finally {
      setSavingCover(false);
    }
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setModalImageTab('UPLOAD');
    setModalImageFileInfo(null);
    setModalForm({
      title: '',
      subtitle: '',
      badge: '🔥 LIVE CHAMPIONSHIP',
      imageUrl: PRESET_IMAGES[0].url,
      linkUrl: '/tournaments',
      buttonText: 'JOIN TOURNAMENT',
      placement: 'MAIN_SLIDER',
      order: banners.filter(b => b.placement === 'MAIN_SLIDER').length + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setModalImageTab(banner.imageUrl?.startsWith('data:') ? 'UPLOAD' : 'URL');
    setModalImageFileInfo(null);
    setModalForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      badge: banner.badge || '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '/tournaments',
      buttonText: banner.buttonText || 'JOIN TOURNAMENT',
      placement: banner.placement || 'MAIN_SLIDER',
      order: banner.order || 1,
      isActive: banner.isActive,
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.title.trim() || !modalForm.imageUrl.trim()) {
      alert('Title and Image URL are required.');
      return;
    }

    setIsSavingBanner(true);
    try {
      if (editingBanner) {
        // Update
        const res = await fetch('/api/banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingBanner.id,
            ...modalForm,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setIsModalOpen(false);
          await loadBanners();
        } else {
          alert(data.message || 'Failed to update banner.');
        }
      } else {
        // Create
        const res = await fetch('/api/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modalForm),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setIsModalOpen(false);
          await loadBanners();
        } else {
          alert(data.message || 'Failed to create banner.');
        }
      }
    } catch (err) {
      alert('Error processing banner request. Please check network connection.');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/banners?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadBanners();
      } else {
        alert('Failed to delete banner.');
      }
    } catch (err) {
      alert('Error deleting banner.');
    }
  };

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (banner: Banner) => {
    const nextState = !banner.isActive;
    setTogglingId(banner.id);
    
    // Optimistic update for instant visual feedback
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, isActive: nextState } : b))
    );

    try {
      const res = await fetch('/api/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...banner,
          isActive: nextState,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        // Revert on failure
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, isActive: banner.isActive } : b))
        );
      } else if (data.banner) {
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, ...data.banner } : b))
        );
      }
    } catch (err) {
      console.error('Failed to toggle banner status:', err);
      // Revert on network failure
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: banner.isActive } : b))
      );
    } finally {
      setTogglingId(null);
    }
  };

  const filteredBanners = banners.filter((b) => {
    if (filterPlacement === 'ALL') return true;
    return b.placement === filterPlacement;
  });

  const getPlacementLabel = (p: BannerPlacement) => {
    switch (p) {
      case 'MAIN_SLIDER':
        return { label: 'Main Carousel Slider', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'SIDE_TOP':
        return { label: 'Side Top Card (Right)', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'SIDE_BOTTOM':
        return { label: 'Side Bottom Card (Right)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'SHOP_BANNER':
        return { label: '🛍️ Shop & Home Banner', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'ARENA_BANNER':
        return { label: '⚔️ 1v1 Arena Duel Banner', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      default:
        return { label: p, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black font-heading tracking-wide">
              Hero Banners & Sliders Manager
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Control the 3-picture layout on desktop and single auto-sliding carousel on mobile.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-orange hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD NEW BANNER</span>
        </button>
      </div>

      {/* ── Global Profile Cover Photo Manager ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-orange-200/80 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <span>Global Player Profile Cover Banner</span>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full uppercase border border-red-200">
                  Admin Only Control
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                এখানে যে কভার ছবি সেট করবেন, সেটি প্ল্যাটফর্মের সকল ইউজারের প্রোফাইল ব্যানারে সাথে সাথে সেট হয়ে যাবে। সাধারণ প্লেয়াররা এটি নিজে থেকে পরিবর্তন করতে পারবে না।
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveProfileCover}
            disabled={savingCover}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-heading font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {savingCover ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : coverSaveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{coverSaveSuccess ? 'সবার জন্য সেভ হয়েছে!' : 'Save & Apply For All Players'}</span>
          </button>
        </div>

        {/* Live Interactive Preview Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-orange-500" />
              Live Profile Header Preview:
            </span>
            <span className="text-[11px] text-slate-400 font-medium">1600 x 400 (Widescreen HD Recommended)</span>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 overflow-hidden shadow-inner bg-slate-900 relative">
            <div className="w-full h-40 sm:h-48 overflow-hidden relative">
              <img
                src={profileCoverUrl || PRESET_IMAGES[0].url}
                alt="Profile Cover Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRESET_IMAGES[0].url;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                BRK ESPORTS PASSPORT
              </div>
            </div>

            {/* Overlapping Mock Avatar & Info */}
            <div className="px-5 pb-4 -mt-10 relative z-10 flex items-end justify-between">
              <div className="flex items-end gap-3.5">
                <img
                  src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"
                  alt="Player Avatar Mock"
                  className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-xl bg-slate-800"
                />
                <div className="mb-0.5">
                  <div className="text-white font-heading font-black text-lg drop-shadow-sm leading-tight">OCR-FALCON</div>
                  <div className="text-slate-300 text-[11px] font-mono">App ID: EZBD-582910 • Win Rate: 72%</div>
                </div>
              </div>
              <div className="hidden sm:block text-right mb-0.5">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/90 text-slate-800 shadow-xs">
                  Winning: ৳ 1,250
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Input and Preset Selection */}
        <div className="space-y-4 pt-1">
          {/* Custom URL Input & File Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase block">1. Cover Image Web URL</label>
              <input
                type="text"
                value={profileCoverUrl}
                onChange={(e) => {
                  setProfileCoverUrl(e.target.value);
                  setCoverFileInfo(null);
                }}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="sm:col-span-6 space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase block">2. Or Upload Directly From Device</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCover(true);
                }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingCover(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleCoverFileSelect(file);
                }}
                className={`relative flex items-center justify-between px-3.5 py-2 rounded-xl border-2 border-dashed transition-all ${
                  isDraggingCover
                    ? 'border-brand-orange bg-orange-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs truncate">
                  {isUploadingCover ? (
                    <>
                      <Loader2 className="w-4 h-4 text-brand-orange animate-spin flex-shrink-0" />
                      <span className="text-slate-600 font-medium">Processing device image...</span>
                    </>
                  ) : coverFileInfo ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-800 font-bold truncate">{coverFileInfo.name} ({coverFileInfo.size})</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-600 text-[11px] truncate">Drag & drop or pick from device</span>
                    </>
                  )}
                </div>

                <label className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer shadow-xs transition-all">
                  <span>{coverFileInfo ? 'Change' : 'Browse'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverFileSelect(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 1-Click Preset Gallery */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase block">
              1-Click Esports Cover Presets (পছন্দের কভার বেছে নিন):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PROFILE_COVER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setProfileCoverUrl(preset.url);
                    setCoverFileInfo(null);
                  }}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all p-1 text-left flex flex-col justify-between h-24 ${
                    profileCoverUrl === preset.url
                      ? 'border-brand-orange shadow-md shadow-orange-500/25 ring-2 ring-orange-400/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative z-10 self-end">
                    {profileCoverUrl === preset.url && (
                      <span className="w-5 h-5 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="relative z-10 text-[10px] font-bold text-white leading-tight drop-shadow truncate w-full">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Slide Speed & Settings Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-brand-orange" />
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-sm">
                Carousel Auto-Rotation Speed
              </h3>
              <p className="text-xs text-slate-500">
                Configure how many seconds each banner stays before sliding automatically.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            {savingSettings ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveSuccess ? 'Saved!' : 'Save Speed'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {[2000, 3000, 4000, 5000, 7000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => setAutoSlideInterval(ms)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                autoSlideInterval === ms
                  ? 'bg-orange-50 border-brand-orange text-brand-orange font-black shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="text-sm font-heading font-black">{ms / 1000} Seconds</div>
              <div className="text-[10px] text-slate-500 font-mono">{ms}ms interval</div>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-slate-900 text-sm">Banner Overlay Darkness</h3>
            <span className="text-xs font-bold text-brand-orange">{overlayOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
            className="w-full accent-brand-orange"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            0% = No dark overlay (original image brightness), 100% = Completely black. Default is 50%.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: `All Banners (${banners.length})` },
          { key: 'MAIN_SLIDER', label: `Main Slider (${banners.filter(b => b.placement === 'MAIN_SLIDER').length})` },
          { key: 'SIDE_TOP', label: `Side Top Card (${banners.filter(b => b.placement === 'SIDE_TOP').length})` },
          { key: 'SIDE_BOTTOM', label: `Side Bottom Card (${banners.filter(b => b.placement === 'SIDE_BOTTOM').length})` },
          { key: 'SHOP_BANNER', label: `🛍️ Shop Banner (${banners.filter(b => b.placement === 'SHOP_BANNER').length})` },
          { key: 'ARENA_BANNER', label: `⚔️ 1v1 Arena Banner (${banners.filter(b => b.placement === 'ARENA_BANNER').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterPlacement(tab.key as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterPlacement === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Banners Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-orange animate-spin mx-auto" />
          <div className="text-xs text-slate-500 font-bold">Loading banners from database...</div>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="text-slate-700 font-bold text-sm">No banners found in this placement.</div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-brand-orange text-white text-xs font-bold shadow-md cursor-pointer"
          >
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanners.map((banner) => {
            const badgeMeta = getPlacementLabel(banner.placement);
            return (
              <div
                key={banner.id}
                className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                  banner.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                {/* Banner Thumbnail Preview (16:9 Widescreen 1920x1080) */}
                <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden group">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', PRESET_IMAGES[0].url);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${badgeMeta.color}`}>
                      {badgeMeta.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-mono font-bold">
                      #{banner.order}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={togglingId === banner.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(banner);
                    }}
                    className={`absolute top-3 right-3 p-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                      banner.isActive
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                    }`}
                    title={banner.isActive ? 'Active (Click to hide)' : 'Inactive (Click to show)'}
                  >
                    {togglingId === banner.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : banner.isActive ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {banner.badge && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-red text-white text-[9px] font-black uppercase">
                        {banner.badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-heading font-black text-slate-900 text-base leading-snug line-clamp-2">
                      {banner.title}
                    </h4>
                    {banner.subtitle && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px] truncate max-w-[160px]">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{banner.linkUrl}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(banner)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Edit Banner"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900 flex items-center gap-2">
                  <span>{editingBanner ? 'Edit Banner' : 'Add New Banner'}</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold uppercase">
                    Device Upload Ready
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ডিভাইস থেকে ছবি আপলোড করুন অথবা ইন্টারনেট লিঙ্ক ও প্রিসেট ব্যবহার করুন।
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {/* Placement Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Where should this banner be placed? *
                </label>
                <select
                  value={modalForm.placement}
                  onChange={(e) => setModalForm({ ...modalForm, placement: e.target.value as BannerPlacement })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-orange"
                >
                  <option value="MAIN_SLIDER">Main Carousel Slider (Big Box Left - PC & Mobile)</option>
                  <option value="SIDE_TOP">Side Top Card (Right Top - PC Only)</option>
                  <option value="SIDE_BOTTOM">Side Bottom Card (Right Bottom - PC Only)</option>
                  <option value="SHOP_BANNER">🛍️ Shop & Home Banner (Gaming Shop Top Banner & Homepage Widget)</option>
                  <option value="ARENA_BANNER">⚔️ 1v1 & 2v2 Arena Duel Top Banner (/arena)</option>
                </select>
              </div>

              {/* Banner Image Upload & Picker Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-brand-orange" />
                    Banner Image (ব্যানার ছবি) *
                  </label>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setModalImageTab('UPLOAD')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        modalImageTab === 'UPLOAD'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>Device Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalImageTab('URL')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        modalImageTab === 'URL'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalImageTab('PRESETS')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        modalImageTab === 'PRESETS'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Presets</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: DEVICE UPLOAD */}
                {modalImageTab === 'UPLOAD' && (
                  <div className="space-y-2">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingModal(true);
                      }}
                      onDragLeave={() => setIsDraggingModal(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingModal(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleModalFileSelect(file);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all bg-white relative ${
                        isDraggingModal
                          ? 'border-brand-orange bg-orange-50/50'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {isUploadingModalImage ? (
                        <div className="py-4 space-y-2">
                          <Loader2 className="w-8 h-8 text-brand-orange animate-spin mx-auto" />
                          <p className="text-xs text-slate-600 font-bold">Optimizing image from device...</p>
                        </div>
                      ) : modalImageFileInfo ? (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center gap-2.5 text-left">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-emerald-900 truncate max-w-[240px]">
                                {modalImageFileInfo.name}
                              </div>
                              <div className="text-[10px] text-emerald-700 font-mono">
                                {modalImageFileInfo.size} • Ready & Loaded
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer">
                              Change
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleModalFileSelect(file);
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setModalImageFileInfo(null);
                                setModalForm((prev) => ({ ...prev, imageUrl: '' }));
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 space-y-2">
                          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-brand-orange flex items-center justify-center mx-auto shadow-2xs">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800">
                              কম্পিউটার বা মোবাইল থেকে ছবি সিলেক্ট করুন
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Drag & drop here, or click to browse files (PNG, JPG, WEBP, GIF)
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-sm">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Browse Device Image</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleModalFileSelect(file);
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: IMAGE URL */}
                {modalImageTab === 'URL' && (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={modalForm.imageUrl}
                      onChange={(e) => {
                        setModalForm({ ...modalForm, imageUrl: e.target.value });
                        setModalImageFileInfo(null);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-mono"
                    />
                    <p className="text-[10px] text-slate-500">
                      Enter any publicly accessible direct image URL (Unsplash, Imgur, Cloudinary, etc.)
                    </p>
                  </div>
                )}

                {/* TAB 3: 1-CLICK PRESETS */}
                {modalImageTab === 'PRESETS' && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setModalForm({ ...modalForm, imageUrl: preset.url });
                            setModalImageFileInfo(null);
                          }}
                          className={`group relative rounded-xl overflow-hidden border-2 text-left p-1.5 h-16 transition-all flex flex-col justify-end ${
                            modalForm.imageUrl === preset.url
                              ? 'border-brand-orange ring-2 ring-orange-400/40 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <span className="relative z-10 text-[9px] font-bold text-white truncate drop-shadow">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-time Banner Card Preview */}
                {modalForm.imageUrl && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-orange-500" />
                        Live Banner Card Preview:
                      </span>
                      <span className="text-[10px] text-brand-orange font-mono font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        16:9 Widescreen (1920×1080)
                      </span>
                    </div>
                    <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-950 shadow-inner group">
                      <img
                        src={modalForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      
                      {modalForm.badge && (
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-brand-red text-white text-[9px] font-black uppercase">
                          {modalForm.badge}
                        </div>
                      )}

                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
                        <div className="truncate">
                          <div className="text-white font-heading font-black text-xs drop-shadow truncate">
                            {modalForm.title || 'Banner Title Preview'}
                          </div>
                          {modalForm.subtitle && (
                            <div className="text-slate-300 text-[10px] truncate">
                              {modalForm.subtitle}
                            </div>
                          )}
                        </div>
                        {modalForm.buttonText && (
                          <div className="px-2 py-1 rounded-lg bg-brand-orange text-white text-[9px] font-black uppercase whitespace-nowrap shadow-xs">
                            {modalForm.buttonText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Banner Main Title (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (খালি রাখলে ব্যানারে কোনো টাইটেল আসবে না)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. GRAND FREE FIRE BR SQUAD LEAGUE (বা খালি রাখুন)"
                  value={modalForm.title}
                  onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Subtitle & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Category Tag / Badge (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🔥 LIVE CHAMPIONSHIP"
                    value={modalForm.badge}
                    onChange={(e) => setModalForm({ ...modalForm, badge: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Subtitle / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ৳ 4,000 Prize Pool"
                    value={modalForm.subtitle}
                    onChange={(e) => setModalForm({ ...modalForm, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Target Link URL & Button Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Target Link URL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="/tournaments or https://..."
                    value={modalForm.linkUrl}
                    onChange={(e) => setModalForm({ ...modalForm, linkUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Button Label (Optional)
                    </label>
                    <span className="text-[11px] text-slate-400 font-normal">
                      (খালি রাখলে বাটন আসবে না)
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. JOIN TOURNAMENT (বা খালি রাখুন)"
                    value={modalForm.buttonText}
                    onChange={(e) => setModalForm({ ...modalForm, buttonText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Order and Active status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Order Sequence #
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={modalForm.order}
                    onChange={(e) => setModalForm({ ...modalForm, order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-mono"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Visibility
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={modalForm.isActive}
                      onChange={(e) => setModalForm({ ...modalForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      {modalForm.isActive ? 'Active (Visible)' : 'Inactive (Hidden)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingBanner && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingBanner ? 'Saving & Uploading...' : editingBanner ? 'Update Banner' : 'Create Banner'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
