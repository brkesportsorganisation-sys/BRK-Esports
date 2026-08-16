'use client';

import React, { useState, useEffect } from 'react';
import { Save, PlaySquare, CheckCircle2, Plus, Trash2, AlertTriangle, RefreshCw, Loader2, Sparkles } from 'lucide-react';

type AdItem = {
  id: string;
  videoId: string;
  rewardAmount: number;
  isActive: boolean;
};

export default function AdminAdSettingsPage() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [adIsActive, setAdIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ads', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.adSettings) {
          setAdIsActive(data.adSettings.isActive);
          setAds(data.adSettings.ads || []);
        }
      }
    } catch (err) {
      console.warn('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const extractVideoId = (urlOrId: string) => {
    if (!urlOrId) return '';
    if (urlOrId.length === 11 && !urlOrId.includes('/')) return urlOrId;
    const match = urlOrId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : urlOrId;
  };

  const handleAddAd = () => {
    setAds([
      ...ads,
      {
        id: `ad_${Date.now()}`,
        videoId: '',
        rewardAmount: 5,
        isActive: true
      }
    ]);
  };

  const handleRemoveAd = (id: string) => {
    setAds(ads.filter(ad => ad.id !== id));
  };

  const handleUpdateAd = (id: string, field: keyof AdItem, value: any) => {
    setAds(ads.map(ad => {
      if (ad.id === id) {
        return { ...ad, [field]: value };
      }
      return ad;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanedAds = ads.map(ad => ({
        ...ad,
        videoId: extractVideoId(ad.videoId)
      }));

      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          adSettings: {
            isActive: adIsActive,
            ads: cleanedAds
          }
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save ads.');
      }
    } catch (err) {
      console.error('Ad save error:', err);
      alert('Network error while saving ads.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Video Ads & Watch & Earn Rewards
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Configure YouTube promotional videos and coin rewards for player engagement.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving to Database...' : 'Save Configuration'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>Video ads configuration saved successfully to Supabase database!</span>
        </div>
      )}

      {/* 2. Global Toggle Card */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
        <div>
          <div className="text-base font-bold text-[#0F172A]">Enable Watch & Earn Video Program</div>
          <div className="text-xs text-[#64748B] mt-0.5">Toggle whether the Watch & Earn system is active globally for all players.</div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={adIsActive}
            onChange={(e) => setAdIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
        </label>
      </div>

      {/* 3. Ads Manager List */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center space-x-2">
            <PlaySquare className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[17px] font-bold text-[#0F172A]">Active Promotional Video Ads ({ads.length})</h2>
          </div>

          <button
            onClick={handleAddAd}
            className="px-3.5 py-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Video</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#2563EB]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] space-y-2">
            <PlaySquare className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-[#0F172A]">No Video Ads Configured</div>
            <div className="text-xs">Click "Add New Video" to setup YouTube video tasks for players.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad, index) => {
              const previewId = extractVideoId(ad.videoId);
              return (
                <div 
                  key={ad.id} 
                  className="p-5 rounded-[18px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A] bg-white px-2.5 py-1 rounded-[8px] border border-[#E2E8F0]">
                      Video Slot #{index + 1}
                    </span>

                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-[#475569]">
                        <input
                          type="checkbox"
                          checked={ad.isActive}
                          onChange={(e) => handleUpdateAd(ad.id, 'isActive', e.target.checked)}
                          className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span>Active</span>
                      </label>

                      <button
                        onClick={() => handleRemoveAd(ad.id)}
                        className="p-1.5 rounded-[8px] text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete Ad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        YouTube Video URL or 11-Character Video ID
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                        value={ad.videoId}
                        onChange={(e) => handleUpdateAd(ad.id, 'videoId', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#E2E8F0] text-xs font-mono font-medium text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-[#475569] mb-1">
                        Reward Coin Amount (🪙)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={ad.rewardAmount}
                        onChange={(e) => handleUpdateAd(ad.id, 'rewardAmount', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>

                  {previewId && previewId.length === 11 && (
                    <div className="pt-2 flex items-center gap-3">
                      <img 
                        src={`https://img.youtube.com/vi/${previewId}/mqdefault.jpg`} 
                        alt="Thumbnail preview"
                        className="w-24 h-14 rounded-lg object-cover border border-[#E2E8F0]"
                      />
                      <div className="text-[11px] text-[#64748B]">
                        <div>YouTube ID: <code className="font-mono text-[#2563EB] font-bold">{previewId}</code></div>
                        <div>Thumbnail loaded successfully.</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
