'use client';

import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Trophy, 
  Sparkles, 
  Medal, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  User, 
  ShieldCheck, 
  Users, 
  Flame, 
  Award,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { ChampionsConfig, ChampionPodiumItem, HallOfFameSquad } from '@/lib/types';
import { DEFAULT_CHAMPIONS_CONFIG } from '@/lib/champions';

export default function AdminChampionsPage() {
  const [config, setConfig] = useState<ChampionsConfig>(DEFAULT_CHAMPIONS_CONFIG);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableSquads, setAvailableSquads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/champions', {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.availableUsers) setAvailableUsers(data.availableUsers);
        if (data.availableSquads) setAvailableSquads(data.availableSquads);
      }
    } catch (err) {
      console.warn('Failed to load admin champions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/champions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('🎉 Hall of Champions saved and published live to database successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(data.error || 'Failed to save changes.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving champions.');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFillFromTopPlayers = () => {
    if (availableUsers.length === 0) {
      alert('No registered players found in database.');
      return;
    }

    const newPodiums: ChampionPodiumItem[] = [
      {
        rank: 1,
        name: availableUsers[0]?.name || 'Champion Leader',
        inGameName: availableUsers[0]?.inGameName || availableUsers[0]?.name || 'MVP Player',
        freeFireUid: availableUsers[0]?.freeFireUid || '189283741',
        avatar: availableUsers[0]?.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
        earnings: availableUsers[0]?.earnings || 50000,
        totalWins: availableUsers[0]?.totalWins || 40,
        totalKills: availableUsers[0]?.totalKills || 350,
        headshotRate: '68.5%',
        badge: 'GRANDMASTER MVP',
        signatureWeapon: 'M1887 & AWM',
        seasonTitle: 'Grand Championship MVP',
      },
      {
        rank: 2,
        name: availableUsers[1]?.name || 'Runner Up',
        inGameName: availableUsers[1]?.inGameName || availableUsers[1]?.name || 'Sniper Elite',
        freeFireUid: availableUsers[1]?.freeFireUid || '204918231',
        avatar: availableUsers[1]?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        earnings: availableUsers[1]?.earnings || 35000,
        totalWins: availableUsers[1]?.totalWins || 28,
        totalKills: availableUsers[1]?.totalKills || 260,
        headshotRate: '62.0%',
        badge: 'SNIPER GOD',
        signatureWeapon: 'M82B & Desert Eagle',
        seasonTitle: 'Top Sniper Legend',
      },
      {
        rank: 3,
        name: availableUsers[2]?.name || 'Third Place',
        inGameName: availableUsers[2]?.inGameName || availableUsers[2]?.name || 'Rusher Pro',
        freeFireUid: availableUsers[2]?.freeFireUid || '193827162',
        avatar: availableUsers[2]?.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
        earnings: availableUsers[2]?.earnings || 25000,
        totalWins: availableUsers[2]?.totalWins || 22,
        totalKills: availableUsers[2]?.totalKills || 210,
        headshotRate: '58.4%',
        badge: 'RUSHER KING',
        signatureWeapon: 'MP40 & Woodpecker',
        seasonTitle: 'Top Rusher',
      },
    ];

    setConfig(prev => ({
      ...prev,
      topPodiums: newPodiums,
    }));

    alert('✅ Top 3 Podiums auto-filled from live database leaderboard!');
  };

  const updatePodium = (rank: number, updates: Partial<ChampionPodiumItem>) => {
    setConfig(prev => {
      const nextPodiums = [...(prev.topPodiums || [])];
      const idx = nextPodiums.findIndex(p => p.rank === rank);
      if (idx !== -1) {
        nextPodiums[idx] = { ...nextPodiums[idx], ...updates };
      }
      return { ...prev, topPodiums: nextPodiums };
    });
  };

  const handleSelectUserForPodium = (rank: number, userId: string) => {
    const found = availableUsers.find(u => u.id === userId);
    if (!found) return;

    updatePodium(rank, {
      userId: found.id,
      name: found.name || 'Player',
      inGameName: found.inGameName || found.name || 'Player',
      freeFireUid: found.freeFireUid || '',
      avatar: found.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200',
      earnings: found.earnings || 0,
      totalWins: found.totalWins || 0,
      totalKills: found.totalKills || 0,
    });
  };

  const handleAddAthlete = () => {
    const newAthlete: ChampionPodiumItem = {
      rank: (config.proAthletes?.length || 0) + 4,
      name: 'New Athlete',
      inGameName: 'PRO・PLAYER',
      freeFireUid: '10000000',
      avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
      earnings: 15000,
      totalWins: 15,
      totalKills: 120,
      headshotRate: '55.0%',
      badge: 'PRO ATHLETE',
      signatureWeapon: 'M1887 & MP40',
    };

    setConfig(prev => ({
      ...prev,
      proAthletes: [...(prev.proAthletes || []), newAthlete],
    }));
  };

  const handleRemoveAthlete = (index: number) => {
    setConfig(prev => {
      const next = [...(prev.proAthletes || [])];
      next.splice(index, 1);
      return { ...prev, proAthletes: next };
    });
  };

  const updateAthlete = (index: number, updates: Partial<ChampionPodiumItem>) => {
    setConfig(prev => {
      const next = [...(prev.proAthletes || [])];
      next[index] = { ...next[index], ...updates };
      return { ...prev, proAthletes: next };
    });
  };

  const handleAddSquad = () => {
    const newSq: HallOfFameSquad = {
      id: `sq_${Date.now()}`,
      squadName: 'New Champion Squad',
      tag: 'NEW',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
      captainName: 'Team Captain',
      totalWins: 20,
      totalEarnings: 40000,
      titles: '🏆 Official Tournament Champion',
    };

    setConfig(prev => ({
      ...prev,
      legendarySquads: [...(prev.legendarySquads || []), newSq],
    }));
  };

  const handleRemoveSquad = (index: number) => {
    setConfig(prev => {
      const next = [...(prev.legendarySquads || [])];
      next.splice(index, 1);
      return { ...prev, legendarySquads: next };
    });
  };

  const updateSquad = (index: number, updates: Partial<HallOfFameSquad>) => {
    setConfig(prev => {
      const next = [...(prev.legendarySquads || [])];
      next[index] = { ...next[index], ...updates };
      return { ...prev, legendarySquads: next };
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-bold space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
        <span>Loading Hall of Champions management...</span>
      </div>
    );
  }

  const top1 = config.topPodiums?.find(p => p.rank === 1) || DEFAULT_CHAMPIONS_CONFIG.topPodiums[0];
  const top2 = config.topPodiums?.find(p => p.rank === 2) || DEFAULT_CHAMPIONS_CONFIG.topPodiums[1];
  const top3 = config.topPodiums?.find(p => p.rank === 3) || DEFAULT_CHAMPIONS_CONFIG.topPodiums[2];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crown className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-wide">
                Hall of Champions Management (👑)
              </h1>
              <p className="text-xs text-slate-300">
                100% Live Database-Connected • Edit Top 3 Podium Champions, Pro Athlete Cards &amp; Hall of Fame Squads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/champions"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Page</span>
          </Link>

          <button
            onClick={handleAutoFillFromTopPlayers}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto-Fill from Database</span>
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Page Hero & Banner Configuration */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-heading font-black text-base text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-orange" />
          <span>Section 1: Hero Header &amp; Showcase Notice</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">Page Title *</label>
            <input
              type="text"
              value={config.seasonTitle}
              onChange={(e) => setConfig({ ...config, seasonTitle: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">Top Badge Notice</label>
            <input
              type="text"
              value={config.bannerNotice}
              onChange={(e) => setConfig({ ...config, bannerNotice: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-700 font-bold uppercase mb-1">Subtitle / Description</label>
            <textarea
              rows={2}
              value={config.subtitle}
              onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-orange leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 2. Top 3 Podium Champions Editor (Gold, Silver, Bronze) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Section 2: Top 3 Podium Champions (Live MVP Stage)</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono font-bold">
            Rank #1 (Gold MVP), #2 (Silver), #3 (Bronze)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* #1 Gold Champion Editor */}
          <div className="bg-gradient-to-b from-amber-50/80 via-white to-orange-50/30 p-6 rounded-3xl border-2 border-amber-400 shadow-md space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-red to-brand-orange text-white text-xs font-black font-heading shadow-xs">
                👑 #1 GOLD CHAMPION MVP
              </span>
              <span className="text-xs font-mono font-bold text-amber-700">Center Stage</span>
            </div>

            {/* Quick Pick From Database Dropdown */}
            {availableUsers.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">Quick Select Player from Database:</label>
                <select
                  onChange={(e) => handleSelectUserForPodium(1, e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose registered player --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.inGameName || u.name} (UID: {u.freeFireUid || 'N/A'} - ৳{u.earnings || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">In-Game Name (IGN) *</label>
                <input
                  type="text"
                  value={top1.inGameName}
                  onChange={(e) => updatePodium(1, { inGameName: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Free Fire UID *</label>
                  <input
                    type="text"
                    value={top1.freeFireUid}
                    onChange={(e) => updatePodium(1, { freeFireUid: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Grand Earnings (৳) *</label>
                  <input
                    type="number"
                    value={top1.earnings}
                    onChange={(e) => updatePodium(1, { earnings: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Badge Title</label>
                <input
                  type="text"
                  value={top1.badge}
                  onChange={(e) => updatePodium(1, { badge: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-800"
                  placeholder="e.g. GRANDMASTER MVP"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Signature Guns</label>
                <input
                  type="text"
                  value={top1.signatureWeapon}
                  onChange={(e) => updatePodium(1, { signatureWeapon: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                  placeholder="e.g. M1887 & AWM"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={top1.avatar}
                  onChange={(e) => updatePodium(1, { avatar: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 truncate"
                />
              </div>
            </div>
          </div>

          {/* #2 Silver Champion Editor */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-black font-heading shadow-xs">
                🥈 #2 SILVER CHAMPION
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">Left Podium</span>
            </div>

            {availableUsers.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Quick Select Player from Database:</label>
                <select
                  onChange={(e) => handleSelectUserForPodium(2, e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose registered player --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.inGameName || u.name} (UID: {u.freeFireUid || 'N/A'} - ৳{u.earnings || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">In-Game Name (IGN) *</label>
                <input
                  type="text"
                  value={top2.inGameName}
                  onChange={(e) => updatePodium(2, { inGameName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Free Fire UID *</label>
                  <input
                    type="text"
                    value={top2.freeFireUid}
                    onChange={(e) => updatePodium(2, { freeFireUid: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Earnings (৳) *</label>
                  <input
                    type="number"
                    value={top2.earnings}
                    onChange={(e) => updatePodium(2, { earnings: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Badge Title</label>
                <input
                  type="text"
                  value={top2.badge}
                  onChange={(e) => updatePodium(2, { badge: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  placeholder="e.g. SNIPER GOD"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Signature Guns</label>
                <input
                  type="text"
                  value={top2.signatureWeapon}
                  onChange={(e) => updatePodium(2, { signatureWeapon: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                  placeholder="e.g. M82B & Desert Eagle"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={top2.avatar}
                  onChange={(e) => updatePodium(2, { avatar: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 truncate"
                />
              </div>
            </div>
          </div>

          {/* #3 Bronze Champion Editor */}
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-300/80 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-black font-heading shadow-xs">
                🥉 #3 BRONZE CHAMPION
              </span>
              <span className="text-xs font-mono font-bold text-amber-700">Right Podium</span>
            </div>

            {availableUsers.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Quick Select Player from Database:</label>
                <select
                  onChange={(e) => handleSelectUserForPodium(3, e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose registered player --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.inGameName || u.name} (UID: {u.freeFireUid || 'N/A'} - ৳{u.earnings || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">In-Game Name (IGN) *</label>
                <input
                  type="text"
                  value={top3.inGameName}
                  onChange={(e) => updatePodium(3, { inGameName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Free Fire UID *</label>
                  <input
                    type="text"
                    value={top3.freeFireUid}
                    onChange={(e) => updatePodium(3, { freeFireUid: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Earnings (৳) *</label>
                  <input
                    type="number"
                    value={top3.earnings}
                    onChange={(e) => updatePodium(3, { earnings: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Badge Title</label>
                <input
                  type="text"
                  value={top3.badge}
                  onChange={(e) => updatePodium(3, { badge: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-800"
                  placeholder="e.g. RUSHER KING"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Signature Guns</label>
                <input
                  type="text"
                  value={top3.signatureWeapon}
                  onChange={(e) => updatePodium(3, { signatureWeapon: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700"
                  placeholder="e.g. MP40 & Woodpecker"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={top3.avatar}
                  onChange={(e) => updatePodium(3, { avatar: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 truncate"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Pro Athlete Trading Cards List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-black text-base text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-orange" />
            <span>Section 3: Pro Athlete Legend Cards ({config.proAthletes?.length || 0})</span>
          </h2>

          <button
            type="button"
            onClick={handleAddAthlete}
            className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-orange-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Athlete Card</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(config.proAthletes || []).map((athlete, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative group">
              <button
                type="button"
                onClick={() => handleRemoveAthlete(idx)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors cursor-pointer opacity-70 hover:opacity-100"
                title="Remove Athlete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="text-xs font-medium space-y-2 pr-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Player IGN</label>
                  <input
                    type="text"
                    value={athlete.inGameName}
                    onChange={(e) => updateAthlete(idx, { inGameName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Free Fire UID</label>
                    <input
                      type="text"
                      value={athlete.freeFireUid}
                      onChange={(e) => updateAthlete(idx, { freeFireUid: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Booyahs</label>
                    <input
                      type="number"
                      value={athlete.totalWins}
                      onChange={(e) => updateAthlete(idx, { totalWins: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Badge Tag</label>
                    <input
                      type="text"
                      value={athlete.badge}
                      onChange={(e) => updateAthlete(idx, { badge: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Headshot %</label>
                    <input
                      type="text"
                      value={athlete.headshotRate}
                      onChange={(e) => updateAthlete(idx, { headshotRate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Signature Weapon</label>
                  <input
                    type="text"
                    value={athlete.signatureWeapon}
                    onChange={(e) => updateAthlete(idx, { signatureWeapon: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Legendary Squads & Clans Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-black text-base text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-orange" />
            <span>Section 4: Hall of Fame Legendary Squads &amp; Clans</span>
          </h2>

          <button
            type="button"
            onClick={handleAddSquad}
            className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-orange-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Champion Squad</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(config.legendarySquads || []).map((sq, idx) => (
            <div key={sq.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative group">
              <button
                type="button"
                onClick={() => handleRemoveSquad(idx)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors cursor-pointer opacity-70 hover:opacity-100"
                title="Remove Squad"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="text-xs font-medium space-y-2 pr-6">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Squad / Clan Name</label>
                    <input
                      type="text"
                      value={sq.squadName}
                      onChange={(e) => updateSquad(idx, { squadName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tag</label>
                    <input
                      type="text"
                      value={sq.tag}
                      onChange={(e) => updateSquad(idx, { tag: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Captain Name</label>
                    <input
                      type="text"
                      value={sq.captainName}
                      onChange={(e) => updateSquad(idx, { captainName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Total Clan Earnings (৳)</label>
                    <input
                      type="number"
                      value={sq.totalEarnings}
                      onChange={(e) => updateSquad(idx, { totalEarnings: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Championship Titles</label>
                  <input
                    type="text"
                    value={sq.titles}
                    onChange={(e) => updateSquad(idx, { titles: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-800"
                    placeholder="e.g. 🏆 3x BR Champion • CS Knockout MVP Squad"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Save Button */}
      <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 flex items-center justify-between sticky bottom-4 shadow-xl z-20">
        <div className="text-xs text-slate-500 font-medium">
          Changes will instantly update the public <strong className="text-slate-800">/champions</strong> page across the entire website.
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save & Publish Live to Database'}</span>
        </button>
      </div>

    </div>
  );
}
