'use client';

import React, { useState, useEffect } from 'react';
import { Save, PlaySquare, CheckCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/db';

type AdItem = {
  id: string;
  videoId: string;
  rewardAmount: number;
  isActive: boolean;
};

export default function AdminAdSettingsPage() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [adIsActive, setAdIsActive] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const settings = db.getAdSettings();
    if (settings) {
      setAdIsActive(settings.isActive);
      setAds(settings.ads || []);
    }
  }, []);

  const extractVideoId = (urlOrId: string) => {
    if (!urlOrId) return '';
    // If it's already an 11-char ID without slashes, it's likely just the ID
    if (urlOrId.length === 11 && !urlOrId.includes('/')) return urlOrId;
    
    // Try to extract from common YouTube URL formats
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Process all video IDs to ensure they are extracted correctly
    const processedAds = ads.map(ad => ({
      ...ad,
      videoId: extractVideoId(ad.videoId)
    }));
    
    setAds(processedAds);

    db.setAdSettings({
      isActive: adIsActive,
      ads: processedAds
    });
    
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-4 text-slate-900 lg:p-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-orange-500 font-semibold mb-1">Advertisement Center</p>
            <h1 className="text-3xl font-semibold text-slate-900 flex items-center gap-2">
               Ad Management
            </h1>
            <p className="text-slate-500 text-sm mt-2">Configure YouTube video links for users to watch and earn coins.</p>
          </div>
          
          <div className="flex items-center bg-slate-50 border border-slate-200 p-2 rounded-2xl gap-3">
             <div className="text-sm font-semibold text-slate-700 px-2">Global Ad Status</div>
             <button
                type="button"
                onClick={() => setAdIsActive(!adIsActive)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  adIsActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {adIsActive ? 'ENABLED' : 'DISABLED'}
              </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Ad configuration saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-xl text-slate-900 flex items-center gap-2">
              <PlaySquare className="w-6 h-6 text-brand-orange" /> Video Playlist
            </h3>
            <button
              type="button"
              onClick={handleAddAd}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Video
            </button>
          </div>
          
          {ads.length === 0 && (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-500 flex flex-col items-center">
              <AlertTriangle className="w-10 h-10 mb-2 text-slate-300" />
              <p className="font-semibold text-lg text-slate-700">No Ads Configured</p>
              <p className="text-sm">Click "Add Video" to add your first ad.</p>
            </div>
          )}

          <div className="space-y-4">
            {ads.map((ad, index) => (
              <div key={ad.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm relative group transition-all hover:border-orange-200">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleRemoveAd(ad.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Remove Ad"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-sm">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                    {index + 1}
                  </div>
                  Video Ad Settings
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6">
                    <label className="font-semibold text-slate-700 block mb-2 text-sm">YouTube Video ID / URL</label>
                    <input
                      type="text"
                      value={ad.videoId}
                      onChange={(e) => handleUpdateAd(ad.id, 'videoId', e.target.value)}
                      placeholder="e.g. dQw4w9WgXcQ or https://youtube.com/..."
                      required
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-300 transition-all shadow-sm"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="font-semibold text-slate-700 block mb-2 text-sm">Coin Reward</label>
                    <input
                      type="number"
                      min="0"
                      value={ad.rewardAmount}
                      onChange={(e) => handleUpdateAd(ad.id, 'rewardAmount', Number(e.target.value))}
                      required
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-orange-300 focus:border-orange-300 transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="md:col-span-3 flex flex-col justify-end">
                     <label className="font-semibold text-slate-700 block mb-2 text-sm">Status</label>
                     <button
                        type="button"
                        onClick={() => handleUpdateAd(ad.id, 'isActive', !ad.isActive)}
                        className={`w-full py-3 rounded-2xl text-sm font-bold transition-all shadow-sm border ${
                          ad.isActive 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {ad.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={ads.length === 0}
            className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 mr-2" /> Save All Ad Settings
          </button>
        </form>
      </div>
    </div>
  );
}
