'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trophy, Filter, X, RotateCcw, Sparkles, Gamepad2, ChevronDown } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import TournamentCard from '@/components/tournaments/TournamentCard';
import { Tournament } from '@/lib/types';

interface GameFilterConfig {
  modes: { value: string; label: string }[];
  formats: { value: string; label: string }[];
}

const GAME_FILTER_CONFIGS: Record<string, GameFilterConfig> = {
  ALL: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All Modes' },
      { value: 'SOLO', label: 'Solo (1v1 / Single)' },
      { value: 'DUO', label: 'Duo (2v2 / 2-Player)' },
      { value: 'SQUAD', label: 'Squad / Team (4v4 / 5v5)' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All Formats' },
      { value: 'BR_RANKED', label: 'Battle Royale / Classic' },
      { value: 'CS_RANKED', label: 'Clash Squad / Knockout' },
    ],
  },
  FREE_FIRE: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All FF Modes' },
      { value: 'SOLO', label: 'Solo (1v1 Survival)' },
      { value: 'DUO', label: 'Duo (2v2 Battle)' },
      { value: 'SQUAD', label: 'Squad (4v4 Battle Royale)' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All FF Formats' },
      { value: 'BR_RANKED', label: 'BR Ranked (Full Map 48P)' },
      { value: 'CS_RANKED', label: 'CS Ranked (Clash Squad 4v4)' },
    ],
  },
  LUDO_KING: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All Ludo Modes' },
      { value: 'SOLO', label: '2 Players (1v1 Match)' },
      { value: 'DUO', label: '4 Players (2v2 Team)' },
      { value: 'SQUAD', label: '4 Players (1v4 Quick/Classic)' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All Ludo Formats' },
      { value: 'CLASSIC', label: 'Classic Ludo (Full Board)' },
      { value: 'QUICK', label: 'Quick Ludo (1 Token Entry)' },
      { value: 'POPULAR', label: 'Popular Rush Ludo' },
    ],
  },
  EFOOTBALL: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All eFootball Modes' },
      { value: 'SOLO', label: '1v1 Match (Standard)' },
      { value: 'DUO', label: '2v2 Co-op Friendly' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All Match Formats' },
      { value: 'REGULAR', label: 'Regular 90 Mins' },
      { value: 'EXTRA_PK', label: 'Extra Time + Penalties (PK)' },
      { value: 'KNOCKOUT', label: 'Direct Knockout Cup' },
    ],
  },
  PUBG_MOBILE: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All PUBG Modes' },
      { value: 'SOLO', label: 'Solo (Erangel / Livik)' },
      { value: 'DUO', label: 'Duo (2 Players)' },
      { value: 'SQUAD', label: 'Squad (4 Players)' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All PUBG Formats' },
      { value: 'BR_RANKED', label: 'Classic Battle Royale (100P)' },
      { value: 'CS_RANKED', label: 'TDM 4v4 (Warehouse/Hangar)' },
    ],
  },
  VALORANT: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All Valorant Modes' },
      { value: 'SQUAD', label: '5v5 Team Tournament' },
      { value: 'SOLO', label: '1v1 Aim Duel' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All Formats' },
      { value: 'STANDARD', label: 'Standard Competitive (MR12)' },
      { value: 'SPIKE_RUSH', label: 'Spike Rush / Swiftplay' },
    ],
  },
  MLBB: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All MLBB Modes' },
      { value: 'SQUAD', label: '5v5 Custom Draft Pick' },
      { value: 'SOLO', label: '1v1 Mid Lane Duel' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All Formats' },
      { value: 'DRAFT_PICK', label: 'Custom Draft Pick (BO3/BO1)' },
      { value: 'BRAWL', label: 'Brawl Mode' },
    ],
  },
  COD_MOBILE: {
    modes: [
      { value: 'ALL', label: '🕹️ Mode: All COD Modes' },
      { value: 'SQUAD', label: '5v5 Multiplayer (S&D / Hardpoint)' },
      { value: 'SOLO', label: 'Solo Battle Royale (Isolated)' },
      { value: 'DUO', label: 'Duo Battle Royale' },
    ],
    formats: [
      { value: 'ALL', label: '🎯 Format: All Formats' },
      { value: 'MP_RANKED', label: 'Multiplayer Ranked (S&D)' },
      { value: 'BR_RANKED', label: 'Battle Royale Classic' },
    ],
  },
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL'); // ALL, FREE, PAID
  const [showFilters, setShowFilters] = useState(false);

  // Auto reset mode and format when game changes
  const handleGameChange = (game: string) => {
    setSelectedGame(game);
    setSelectedMode('ALL');
    setSelectedFormat('ALL');
  };

  const activeConfig = GAME_FILTER_CONFIGS[selectedGame] || GAME_FILTER_CONFIGS.ALL;

  useEffect(() => {
    let isMounted = true;
    const loadTournaments = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tournaments');
        if (!response.ok) return;
        const payload = await response.json();
        if (isMounted) {
          setTournaments(payload.tournaments || []);
        }
      } catch {
        if (isMounted) setTournaments([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadTournaments();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasActiveFilters = 
    Boolean(searchQuery.trim()) || 
    selectedGame !== 'ALL' ||
    selectedMode !== 'ALL' || 
    selectedFormat !== 'ALL' || 
    selectedStatus !== 'ALL' || 
    selectedType !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGame('ALL');
    setSelectedMode('ALL');
    setSelectedFormat('ALL');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
  };

  const filteredTournaments = tournaments.filter((t) => {
    // Hide draft or unpublished tournaments from public list
    if (t.status === 'DRAFT' || t.isPublished === false) {
      return false;
    }

    // Search
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(t.gameName || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Game Filter
    if (selectedGame !== 'ALL') {
      const g = (t.game || '').toUpperCase();
      const title = t.title.toLowerCase();
      if (selectedGame === 'FREE_FIRE') {
        if (g !== 'FREE_FIRE' && !title.includes('free fire') && g !== '') return false;
      } else if (selectedGame === 'EFOOTBALL') {
        if (g !== 'EFOOTBALL' && !title.includes('efootball') && !title.includes('pes')) return false;
      } else if (selectedGame === 'PUBG_MOBILE') {
        if (g !== 'PUBG_MOBILE' && !title.includes('pubg') && !title.includes('bgmi')) return false;
      } else if (selectedGame === 'VALORANT') {
        if (g !== 'VALORANT' && !title.includes('valorant')) return false;
      } else if (selectedGame === 'MLBB') {
        if (g !== 'MLBB' && !title.includes('mobile legends') && !title.includes('mlbb')) return false;
      } else if (selectedGame === 'COD_MOBILE') {
        if (g !== 'COD_MOBILE' && !title.includes('cod') && !title.includes('call of duty')) return false;
      } else if (selectedGame === 'LUDO_KING') {
        if (g !== 'LUDO_KING' && !title.includes('ludo')) return false;
      }
    }
    // Mode Filter
    if (selectedMode !== 'ALL') {
      const tMode = (t.mode || '').toUpperCase();
      const tTitle = (t.title || '').toLowerCase();
      if (selectedMode === 'SOLO' && tMode !== 'SOLO' && !tTitle.includes('1v1') && !tTitle.includes('solo') && !tTitle.includes('2 player')) return false;
      if (selectedMode === 'DUO' && tMode !== 'DUO' && !tTitle.includes('duo') && !tTitle.includes('2v2')) return false;
      if (selectedMode === 'SQUAD' && tMode !== 'SQUAD' && !tTitle.includes('squad') && !tTitle.includes('4v4') && !tTitle.includes('5v5') && !tTitle.includes('4 player')) return false;
    }
    // Format Filter
    if (selectedFormat !== 'ALL') {
      const tFormat = (t.format || '').toUpperCase();
      const tTitle = (t.title || '').toLowerCase();
      if (selectedFormat === 'BR_RANKED' && tFormat !== 'BR_RANKED' && !tTitle.includes('br') && !tTitle.includes('classic')) return false;
      if (selectedFormat === 'CS_RANKED' && tFormat !== 'CS_RANKED' && !tTitle.includes('cs') && !tTitle.includes('clash') && !tTitle.includes('tdm')) return false;
      if (selectedFormat === 'CLASSIC' && !tTitle.includes('classic') && tFormat !== 'CLASSIC') return false;
      if (selectedFormat === 'QUICK' && !tTitle.includes('quick') && tFormat !== 'QUICK') return false;
      if (selectedFormat === 'REGULAR' && !tTitle.includes('regular') && !tTitle.includes('90')) return false;
      if (selectedFormat === 'EXTRA_PK' && !tTitle.includes('pk') && !tTitle.includes('extra')) return false;
      if (selectedFormat === 'KNOCKOUT' && !tTitle.includes('knockout') && !tTitle.includes('cup')) return false;
      if (selectedFormat === 'STANDARD' && !tTitle.includes('standard') && !tTitle.includes('competitive')) return false;
      if (selectedFormat === 'SPIKE_RUSH' && !tTitle.includes('spike') && !tTitle.includes('swift')) return false;
      if (selectedFormat === 'DRAFT_PICK' && !tTitle.includes('draft')) return false;
      if (selectedFormat === 'BRAWL' && !tTitle.includes('brawl')) return false;
      if (selectedFormat === 'MP_RANKED' && !tTitle.includes('mp') && !tTitle.includes('multiplayer')) return false;
    }
    // Status Filter
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'FINISHED' || selectedStatus === 'COMPLETED') {
        if (t.status !== 'FINISHED' && (t as any).status !== 'COMPLETED') return false;
      } else if (t.status !== selectedStatus) {
        return false;
      }
    }
    // Type
    if (selectedType === 'FREE' && t.entryFee !== 0) return false;
    if (selectedType === 'PAID' && t.entryFee === 0) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-8 sm:py-12 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-brand-red/10 to-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-2">
          <span className="text-[11px] font-bold text-brand-orange uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-brand-orange/20">
            <Trophy className="w-3.5 h-3.5 text-brand-orange" />
            <span>Multi-Game Esports Championship Hub</span>
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 tracking-tight">
            ESPORTS TOURNAMENTS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl mx-auto leading-relaxed">
            Free Fire, eFootball, PUBG Mobile, Valorant & more! Enter room credentials, eliminate enemies, and earn real cash payouts.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        
        {/* Compact All-in-One Filter Bar */}
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-xs space-y-2 relative z-30">
          <div className="flex items-center gap-2 w-full">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-8 pr-7 py-2.5 text-[11px] sm:text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border ${
                showFilters || hasActiveFilters 
                  ? 'bg-brand-orange text-white border-brand-orange shadow-md' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(showFilters || hasActiveFilters) && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />}
            </button>
          </div>

          {/* Collapsible Dropdown Panel */}
          {showFilters && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/90 shadow-xl rounded-2xl p-3 sm:p-4 z-50 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Game Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Game</label>
                  <select
                    value={selectedGame}
                    onChange={(e) => handleGameChange(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
                  >
                    <option value="ALL">🎮 All Games</option>
                    <option value="FREE_FIRE">🔥 Free Fire</option>
                    <option value="EFOOTBALL">⚽ eFootball</option>
                    <option value="PUBG_MOBILE">🪖 PUBG Mobile</option>
                    <option value="VALORANT">🎯 Valorant</option>
                    <option value="MLBB">⚔️ Mobile Legends</option>
                    <option value="COD_MOBILE">💥 COD Mobile</option>
                    <option value="LUDO_KING">🎲 Ludo King</option>
                  </select>
                </div>

                {/* Mode Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Mode</label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
                  >
                    {activeConfig.modes.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Format</label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
                  >
                    {activeConfig.formats.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-2.5 text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
                  >
                    <option value="ALL">⚡ All Status</option>
                    <option value="RUNNING">🟢 Running (Registration Open)</option>
                    <option value="UPCOMING">🔵 Upcoming</option>
                    <option value="PENDING">🟡 Pending</option>
                    <option value="LIVE">🔴 Live</option>
                    <option value="FINISHED">✅ Finished / Ended</option>
                  </select>
                </div>

                {/* Entry Fee Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Entry</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-2.5 text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
                  >
                    <option value="ALL">💰 All Entry</option>
                    <option value="FREE">🎁 Free</option>
                    <option value="PAID">৳ Paid</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Chips & Reset Bar (only when filters applied) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
                {selectedGame !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Game: {selectedGame.replace('_', ' ')}
                    <button onClick={() => handleGameChange('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedMode !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-900 border border-orange-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Mode: {activeConfig.modes.find(m => m.value === selectedMode)?.label.replace('🕹️ Mode: ', '') || selectedMode}
                    <button onClick={() => setSelectedMode('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedFormat !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Format: {activeConfig.formats.find(f => f.value === selectedFormat)?.label.replace('🎯 Format: ', '') || selectedFormat}
                    <button onClick={() => setSelectedFormat('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedStatus !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Status: {selectedStatus}
                    <button onClick={() => setSelectedStatus('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedType !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Entry: {selectedType}
                    <button onClick={() => setSelectedType('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-slate-600 hover:text-brand-red flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>
          )}
        </div>
        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
          {loading ? (
            <span className="text-slate-400 font-medium animate-pulse">Loading tournaments...</span>
          ) : (
            <span>Showing <strong className="text-slate-900 font-bold">{filteredTournaments.length}</strong> active tournaments</span>
          )}
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 max-w-md mx-auto w-full animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                <div className="w-full aspect-square bg-slate-200" />
                <div className="p-3.5 sm:p-4 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                  <div className="h-8 bg-slate-100 rounded-lg" />
                  <div className="h-10 bg-slate-200 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTournaments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 max-w-md mx-auto w-full">
            {filteredTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-2">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-heading font-bold text-lg text-slate-900">No Tournaments Found</h3>
            <p className="text-slate-500 text-xs">Try clearing your search query or selecting a different filter.</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 px-4 py-1.5 rounded-xl bg-brand-orange text-white text-xs font-bold shadow-xs hover:bg-orange-600 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

