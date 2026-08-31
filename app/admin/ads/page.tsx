'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  PlaySquare, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  Sparkles,
  Gift,
  Coins,
  DollarSign,
  Trophy,
  Sliders,
  Check,
  X,
  Eye,
  Percent,
  Hash,
  Clock,
  Radio,
  Flame,
  Diamond
} from 'lucide-react';
import { RewardsHubSettings, LotteryRewardItem, AdSettingItem } from '@/lib/types';

export default function AdminRewardsHubPage() {
  const [activeTab, setActiveTab] = useState<'ADS' | 'LOTTERY'>('ADS');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const [settings, setSettings] = useState<RewardsHubSettings>({
    isWatchEarnActive: true,
    isLotteryActive: true,
    dailyAdLimit: 10,
    dailySpinLimit: 5,
    spinCoinCost: 20,
    coinsToBdtRatio: 50,
    minCoinsToConvert: 50,
    ads: [],
    lotteryRewards: []
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ads', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const extractVideoId = (urlOrId: string) => {
    if (!urlOrId) return '';
    if (urlOrId.length === 11 && !urlOrId.includes('/')) return urlOrId;
    const match = urlOrId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : urlOrId;
  };

  // Ads Management Handlers
  const handleAddAd = () => {
    setSettings(prev => ({
      ...prev,
      ads: [
        ...prev.ads,
        {
          id: `ad_${Date.now()}`,
          title: 'New Video Ad',
          adType: 'YOUTUBE',
          videoId: '',
          rewardAmount: 15,
          durationSeconds: 15,
          isActive: true
        }
      ]
    }));
  };

  const handleUpdateAd = (id: string, field: keyof AdSettingItem, value: any) => {
    setSettings(prev => ({
      ...prev,
      ads: prev.ads.map(ad => ad.id === id ? { ...ad, [field]: value } : ad)
    }));
  };

  const handleRemoveAd = (id: string) => {
    setSettings(prev => ({
      ...prev,
      ads: prev.ads.filter(ad => ad.id !== id)
    }));
  };

  // Lottery Management Handlers
  const handleAddLotteryReward = () => {
    setSettings(prev => ({
      ...prev,
      lotteryRewards: [
        ...prev.lotteryRewards,
        {
          id: `reward_${Date.now()}`,
          label: '50 🪙 Coins',
          type: 'COINS',
          value: 50,
          probabilityPercent: 15,
          maxWinnersLimit: undefined,
          currentWonCount: 0,
          color: '#F59E0B',
          isActive: true
        }
      ]
    }));
  };

  const handleUpdateLotteryReward = (id: string, field: keyof LotteryRewardItem, value: any) => {
    setSettings(prev => ({
      ...prev,
      lotteryRewards: prev.lotteryRewards.map(rew => rew.id === id ? { ...rew, [field]: value } : rew)
    }));
  };

  const handleRemoveLotteryReward = (id: string) => {
    setSettings(prev => ({
      ...prev,
      lotteryRewards: prev.lotteryRewards.filter(rew => rew.id !== id)
    }));
  };

  // Save Settings to Backend API
  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMsg('');

    // Clean video IDs
    const cleanedAds = settings.ads.map(ad => ({
      ...ad,
      videoId: extractVideoId(ad.videoId)
    }));

    const cleanedSettings = {
      ...settings,
      ads: cleanedAds
    };

    try {
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: cleanedSettings }),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setSavedSuccess(true);
        setFeedbackMsg('Rewards Hub & Lottery configuration saved successfully!');
        setTimeout(() => setSavedSuccess(false), 3500);
        await loadSettings();
      } else {
        alert(data.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalProbability = settings.lotteryRewards.reduce((sum, r) => sum + (Number(r.probabilityPercent) || 0), 0);

  return (
    <div className="space-y-6 font-sans text-slate-900">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Gift className="w-8 h-8 text-amber-500" />
            <span>Earn Rewards & Lottery Hub</span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold uppercase">
              ADMIN CONTROL
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure video ads, coin rewards, lottery wheel prizes, win probabilities, and winner quotas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
            <button
              onClick={() => setActiveTab('ADS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ADS'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlaySquare className="w-3.5 h-3.5 text-orange-600" />
              Video Ads ({settings.ads.length})
            </button>
            <button
              onClick={() => setActiveTab('LOTTERY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'LOTTERY'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Lottery Wheel ({settings.lotteryRewards.length})
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="text-xs">Loading reward settings from database...</p>
        </div>
      ) : (
        <>
          {/* ── TAB 1: WATCH & EARN VIDEO ADS ── */}
          {activeTab === 'ADS' && (
            <div className="space-y-6">
              
              {/* Global Controls Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
                
                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Watch & Earn Status</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Enable or disable player video ads</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isWatchEarnActive}
                      onChange={(e) => setSettings({ ...settings, isWatchEarnActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Daily Ad Limit */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    Daily Watch Limit (Per User)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.dailyAdLimit}
                    onChange={(e) => setSettings({ ...settings, dailyAdLimit: parseInt(e.target.value, 10) || 10 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-bold"
                  />
                </div>

                {/* Coin to BDT Ratio */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    Exchange Rate (Coins per ৳1)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.coinsToBdtRatio}
                    onChange={(e) => setSettings({ ...settings, coinsToBdtRatio: parseInt(e.target.value, 10) || 50 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-bold"
                  />
                </div>
              </div>

              {/* Ads Table Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <PlaySquare className="w-5 h-5 text-orange-500" />
                      Active Video Ads List
                    </h3>
                    <p className="text-xs text-slate-500">Players watch these videos to earn coins</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAd}
                    className="px-4 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Video Ad
                  </button>
                </div>

                {settings.ads.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No video ads added yet. Click &quot;Add Video Ad&quot; to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settings.ads.map((ad, index) => (
                      <div
                        key={ad.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-slate-300 transition-all shadow-2xs"
                      >
                        {/* Index & Active Toggle */}
                        <div className="md:col-span-1 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center font-mono">
                            #{index + 1}
                          </span>
                          <input
                            type="checkbox"
                            checked={ad.isActive}
                            onChange={(e) => handleUpdateAd(ad.id, 'isActive', e.target.checked)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                            title="Active State"
                          />
                        </div>

                        {/* Ad Title */}
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Ad Title / Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Free Fire Tournament Highlights"
                            value={ad.title || ''}
                            onChange={(e) => handleUpdateAd(ad.id, 'title', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-bold"
                          />
                        </div>

                        {/* YouTube Video ID or URL */}
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">YouTube Video ID / URL</label>
                          <input
                            type="text"
                            placeholder="e.g. dQw4w9WgXcQ or link"
                            value={ad.videoId}
                            onChange={(e) => handleUpdateAd(ad.id, 'videoId', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-mono"
                          />
                        </div>

                        {/* Reward Amount (Coins) */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Reward (Coins)</label>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={ad.rewardAmount}
                            onChange={(e) => handleUpdateAd(ad.id, 'rewardAmount', parseInt(e.target.value, 10) || 5)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-amber-600 font-black focus:outline-none focus:border-brand-orange"
                          />
                        </div>

                        {/* Duration (Seconds) */}
                        <div className="md:col-span-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Timer (Sec)</label>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            value={ad.durationSeconds || 15}
                            onChange={(e) => handleUpdateAd(ad.id, 'durationSeconds', parseInt(e.target.value, 10) || 15)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange font-bold"
                          />
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveAd(ad.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            title="Delete Ad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: LOTTERY & LUCKY WHEEL SUITE ── */}
          {activeTab === 'LOTTERY' && (
            <div className="space-y-6">
              
              {/* Global Lottery Settings Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
                
                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lottery Status</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Spin wheel active</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isLotteryActive}
                      onChange={(e) => setSettings({ ...settings, isLotteryActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Payment Mode Selector */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Payment Mode
                  </label>
                  <select
                    value={settings.spinPaymentMode || 'BOTH'}
                    onChange={(e) => setSettings({ ...settings, spinPaymentMode: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="BOTH">Both (Coins & Cash)</option>
                    <option value="COINS_ONLY">Coins Only (🪙)</option>
                    <option value="CASH_ONLY">Cash Only (৳)</option>
                  </select>
                </div>

                {/* Spin Coin Cost */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    Spin Cost (Coins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    disabled={settings.spinPaymentMode === 'CASH_ONLY'}
                    value={settings.spinCoinCost ?? 20}
                    onChange={(e) => setSettings({ ...settings, spinCoinCost: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold disabled:opacity-40"
                  />
                </div>

                {/* Spin Cash Cost */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Spin Cost (৳ Cash)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    disabled={settings.spinPaymentMode === 'COINS_ONLY'}
                    value={settings.spinCashCost ?? 10}
                    onChange={(e) => setSettings({ ...settings, spinCashCost: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold disabled:opacity-40"
                  />
                </div>

                {/* Daily Spin Limit */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    Daily Spin Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.dailySpinLimit ?? 5}
                    onChange={(e) => setSettings({ ...settings, dailySpinLimit: parseInt(e.target.value, 10) || 5 })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>

                {/* Total Probability Health */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-center ${
                  totalProbability === 100 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    Total Probability
                  </div>
                  <div className="text-xl font-black mt-1">
                    {totalProbability}%
                    <span className="text-[10px] font-normal block mt-0.5">
                      {totalProbability === 100 ? '✅ 100% Balanced' : '(Target: 100%)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lottery Prizes Table */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Lottery Prizes & Probability Control
                    </h3>
                    <p className="text-xs text-slate-500">
                      Set win chance %, reward types (Real Cash, Diamonds, Coins), and maximum winner quotas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLotteryReward}
                    className="px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Prize Reward
                  </button>
                </div>

                {settings.lotteryRewards.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No lottery prizes configured. Click &quot;Add Prize Reward&quot; to set up your wheel.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settings.lotteryRewards.map((reward, index) => (
                      <div
                        key={reward.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-slate-300 transition-all shadow-2xs"
                      >
                        {/* Segment Index & Active */}
                        <div className="md:col-span-1 flex items-center gap-2">
                          <span 
                            className="w-6 h-6 rounded-lg text-white text-xs font-black flex items-center justify-center shadow-xs font-mono"
                            style={{ backgroundColor: reward.color || '#F59E0B' }}
                          >
                            {index + 1}
                          </span>
                          <input
                            type="checkbox"
                            checked={reward.isActive}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'isActive', e.target.checked)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                            title="Active State"
                          />
                        </div>

                        {/* Reward Label */}
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Prize Label</label>
                          <input
                            type="text"
                            value={reward.label}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'label', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                          />
                        </div>

                        {/* Reward Type */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Prize Type</label>
                          <select
                            value={reward.type}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'type', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                          >
                            <option value="WALLET">💰 Real Money (৳ BDT)</option>
                            <option value="DIAMONDS">💎 Diamonds</option>
                            <option value="COINS">🪙 EZBD Coins</option>
                            <option value="TRY_AGAIN">🍀 Better Luck Next Time</option>
                          </select>
                        </div>

                        {/* Value Amount */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Value Amount</label>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            value={reward.value}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'value', parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-emerald-600 font-black focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* Probability % */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Win Chance (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={reward.probabilityPercent}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'probabilityPercent', parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-purple-700 font-black focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* Max Winners Quota (Limit) */}
                        <div className="md:col-span-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase" title="Max number of times this prize can be won">Max Limit</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="∞"
                            value={reward.maxWinnersLimit || ''}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'maxWinnersLimit', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-mono font-bold"
                            title={`Current Won: ${reward.currentWonCount || 0}`}
                          />
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex items-center justify-end gap-1">
                          <input
                            type="color"
                            value={reward.color || '#F59E0B'}
                            onChange={(e) => handleUpdateLotteryReward(reward.id, 'color', e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                            title="Wheel Segment Color"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLotteryReward(reward.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Prize"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
