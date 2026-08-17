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

  // Lottery Rewards Management Handlers
  const handleAddLotteryReward = () => {
    setSettings(prev => ({
      ...prev,
      lotteryRewards: [
        ...prev.lotteryRewards,
        {
          id: `rew_${Date.now()}`,
          label: 'New Prize Reward',
          type: 'COINS',
          value: 20,
          probabilityPercent: 10,
          maxWinnersLimit: 50,
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

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const cleanedAds = settings.ads.map(ad => ({
        ...ad,
        videoId: extractVideoId(ad.videoId)
      }));

      const payload = {
        ...settings,
        ads: cleanedAds
      };

      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: payload }),
      });

      const data = await res.json();

      if (res.ok) {
        setSavedSuccess(true);
        setFeedbackMsg(data.message || 'Settings saved successfully!');
        setTimeout(() => {
          setSavedSuccess(false);
          setFeedbackMsg('');
        }, 4000);
      } else {
        alert(data.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalProbability = settings.lotteryRewards.reduce((sum, r) => sum + (Number(r.probabilityPercent) || 0), 0);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl">
              <Gift className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Earn Rewards & Lottery Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold">
                  ADMIN CONTROL
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Configure video ads, coin rewards, lottery wheel prizes, win probabilities, and winner quotas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Selector */}
            <div className="flex items-center bg-slate-900/80 p-1 rounded-2xl border border-slate-800 gap-1">
              <button
                onClick={() => setActiveTab('ADS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'ADS'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/25 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlaySquare className="w-3.5 h-3.5" />
                Video Ads ({settings.ads.length})
              </button>
              <button
                onClick={() => setActiveTab('LOTTERY')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'LOTTERY'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Lottery Wheel ({settings.lotteryRewards.length})
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {feedbackMsg}
            </div>
            <button onClick={() => setFeedbackMsg('')} className="text-emerald-400/60 hover:text-emerald-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <p className="text-sm">Loading reward settings from database...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: WATCH & EARN VIDEO ADS */}
            {activeTab === 'ADS' && (
              <div className="space-y-6">
                {/* Global Controls Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                  
                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Watch & Earn Status</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Enable or disable player video ads</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.isWatchEarnActive}
                        onChange={(e) => setSettings({ ...settings, isWatchEarnActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Daily Ad Limit */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      Daily Watch Limit (Per User)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.dailyAdLimit}
                      onChange={(e) => setSettings({ ...settings, dailyAdLimit: parseInt(e.target.value, 10) || 10 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>

                  {/* Coin to BDT Ratio */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      Exchange Rate (Coins per ৳1)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.coinsToBdtRatio}
                      onChange={(e) => setSettings({ ...settings, coinsToBdtRatio: parseInt(e.target.value, 10) || 50 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>
                </div>

                {/* Ads Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <PlaySquare className="w-5 h-5 text-orange-400" />
                        Active Video Ads List
                      </h3>
                      <p className="text-xs text-slate-400">Players watch these videos to earn coins</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAd}
                      className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add Video Ad
                    </button>
                  </div>

                  {settings.ads.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      No video ads added yet. Click "Add Video Ad" to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {settings.ads.map((ad, index) => (
                        <div
                          key={ad.id}
                          className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-slate-700 transition-all"
                        >
                          {/* Index & Active Toggle */}
                          <div className="md:col-span-1 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center font-mono">
                              #{index + 1}
                            </span>
                            <input
                              type="checkbox"
                              checked={ad.isActive}
                              onChange={(e) => handleUpdateAd(ad.id, 'isActive', e.target.checked)}
                              className="rounded border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4"
                              title="Active State"
                            />
                          </div>

                          {/* Ad Title */}
                          <div className="md:col-span-4 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Ad Title / Description</label>
                            <input
                              type="text"
                              placeholder="e.g. Free Fire Tournament Highlights"
                              value={ad.title || ''}
                              onChange={(e) => handleUpdateAd(ad.id, 'title', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* YouTube Video ID or URL */}
                          <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">YouTube Video ID / URL</label>
                            <input
                              type="text"
                              placeholder="e.g. dQw4w9WgXcQ or link"
                              value={ad.videoId}
                              onChange={(e) => handleUpdateAd(ad.id, 'videoId', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                            />
                          </div>

                          {/* Reward Amount (Coins) */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Reward (Coins)</label>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={ad.rewardAmount}
                              onChange={(e) => handleUpdateAd(ad.id, 'rewardAmount', parseInt(e.target.value, 10) || 5)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* Duration (Seconds) */}
                          <div className="md:col-span-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Timer (Sec)</label>
                            <input
                              type="number"
                              min="5"
                              max="300"
                              value={ad.durationSeconds || 15}
                              onChange={(e) => handleUpdateAd(ad.id, 'durationSeconds', parseInt(e.target.value, 10) || 15)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* Actions */}
                          <div className="md:col-span-1 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveAd(ad.id)}
                              className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
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

            {/* TAB 2: LOTTERY & LUCKY WHEEL SUITE */}
            {activeTab === 'LOTTERY' && (
              <div className="space-y-6">
                {/* Global Lottery Settings Card */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                  
                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Lottery Status</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Spin wheel active</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.isLotteryActive}
                        onChange={(e) => setSettings({ ...settings, isLotteryActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Spin Coin Cost */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      Spin Cost (Coins)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={settings.spinCoinCost}
                      onChange={(e) => setSettings({ ...settings, spinCoinCost: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                    />
                  </div>

                  {/* Daily Spin Limit */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      Daily Spin Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.dailySpinLimit}
                      onChange={(e) => setSettings({ ...settings, dailySpinLimit: parseInt(e.target.value, 10) || 5 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                    />
                  </div>

                  {/* Total Probability Health */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-center ${
                    totalProbability === 100 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      Total Probability
                    </div>
                    <div className="text-xl font-black mt-1">
                      {totalProbability}%
                      <span className="text-xs font-normal ml-2">
                        {totalProbability === 100 ? '✅ 100% Balanced' : '(Should ideally equal 100%)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lottery Prizes Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Lottery Prizes & Probability Control
                      </h3>
                      <p className="text-xs text-slate-400">
                        Set win chance %, reward types (Real Cash, Diamonds, Coins), and maximum winner quotas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLotteryReward}
                      className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Add Prize Reward
                    </button>
                  </div>

                  {settings.lotteryRewards.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      No lottery prizes configured. Click "Add Prize Reward" to set up your wheel.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {settings.lotteryRewards.map((reward, index) => (
                        <div
                          key={reward.id}
                          className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:border-slate-700 transition-all"
                        >
                          {/* Segment Index & Active */}
                          <div className="md:col-span-1 flex items-center gap-2">
                            <span 
                              className="w-6 h-6 rounded-lg text-black text-xs font-black flex items-center justify-center shadow-md font-mono"
                              style={{ backgroundColor: reward.color || '#F59E0B' }}
                            >
                              {index + 1}
                            </span>
                            <input
                              type="checkbox"
                              checked={reward.isActive}
                              onChange={(e) => handleUpdateLotteryReward(reward.id, 'isActive', e.target.checked)}
                              className="rounded border-slate-700 text-purple-500 focus:ring-purple-500 w-4 h-4"
                              title="Active State"
                            />
                          </div>

                          {/* Reward Label */}
                          <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Prize Label</label>
                            <input
                              type="text"
                              value={reward.label}
                              onChange={(e) => handleUpdateLotteryReward(reward.id, 'label', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                            />
                          </div>

                          {/* Reward Type */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Prize Type</label>
                            <select
                              value={reward.type}
                              onChange={(e) => handleUpdateLotteryReward(reward.id, 'type', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="WALLET">💰 Real Money (৳ BDT)</option>
                              <option value="DIAMONDS">💎 Diamonds</option>
                              <option value="COINS">🪙 BRK Coins</option>
                              <option value="TRY_AGAIN">🍀 Better Luck Next Time</option>
                            </select>
                          </div>

                          {/* Value Amount */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Value Amount</label>
                            <input
                              type="number"
                              min="0"
                              max="10000"
                              value={reward.value}
                              onChange={(e) => handleUpdateLotteryReward(reward.id, 'value', parseInt(e.target.value, 10) || 0)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-black focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Probability % */}
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Win Chance (%)</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={reward.probabilityPercent}
                              onChange={(e) => handleUpdateLotteryReward(reward.id, 'probabilityPercent', parseInt(e.target.value, 10) || 1)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-purple-300 font-black focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Max Winners Quota (Limit) */}
                          <div className="md:col-span-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase" title="Max number of times this prize can be won">Max Limit</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="∞"
                              value={reward.maxWinnersLimit || ''}
                              onChange={(e) => handleUpdateLotteryReward(reward.id, 'maxWinnersLimit', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
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
                              className="p-1.5 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
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
    </div>
  );
}
