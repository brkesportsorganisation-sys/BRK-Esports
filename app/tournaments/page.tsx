'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trophy, Filter, X, RotateCcw, Sparkles } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import TournamentCard from '@/components/tournaments/TournamentCard';
import { Tournament } from '@/lib/types';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL'); // ALL, FREE, PAID

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await fetch('/api/tournaments');
        if (!response.ok) return;
        const payload = await response.json();
        setTournaments(payload.tournaments || []);
      } catch {
        setTournaments([]);
      }
    };

    void loadTournaments();
  }, []);

  const hasActiveFilters = 
    Boolean(searchQuery.trim()) || 
    selectedMode !== 'ALL' || 
    selectedFormat !== 'ALL' || 
    selectedStatus !== 'ALL' || 
    selectedType !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMode('ALL');
    setSelectedFormat('ALL');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
  };

  const filteredTournaments = tournaments.filter((t) => {
    // Search
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Mode
    if (selectedMode !== 'ALL' && t.mode !== selectedMode) return false;
    // Format
    if (selectedFormat !== 'ALL' && t.format !== selectedFormat) return false;
    // Status
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
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
            <span>Competitive Esports Arena</span>
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-4xl text-slate-900 tracking-tight">
            FREE FIRE TOURNAMENTS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl mx-auto leading-relaxed">
            Browse active Solo, Duo, and Squad tournaments. Enter room credentials, eliminate enemies, and earn real cash payouts.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        
        {/* Compact All-in-One Filter Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tournament or mode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mode Select */}
            <div className="lg:col-span-2">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
              >
                <option value="ALL">🎮 Mode: All</option>
                <option value="SOLO">Solo (1v1)</option>
                <option value="DUO">Duo (2v2)</option>
                <option value="SQUAD">Squad (4v4)</option>
              </select>
            </div>

            {/* Format Select */}
            <div className="lg:col-span-2">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
              >
                <option value="ALL">🎯 Format: All</option>
                <option value="BR_RANKED">BR Ranked</option>
                <option value="CS_RANKED">CS Ranked</option>
              </select>
            </div>

            {/* Status Select */}
            <div className="lg:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
              >
                <option value="ALL">⚡ Status: All</option>
                <option value="UPCOMING">🕒 Upcoming</option>
                <option value="LIVE">🔴 Live Now</option>
                <option value="COMPLETED">✅ Completed</option>
              </select>
            </div>

            {/* Entry Fee Select */}
            <div className="lg:col-span-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white cursor-pointer"
              >
                <option value="ALL">💰 Entry: All</option>
                <option value="FREE">🎁 FREE Entry</option>
                <option value="PAID">৳ Paid Only</option>
              </select>
            </div>

          </div>

          {/* Active Filter Chips & Reset Bar (only when filters applied) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
                {selectedMode !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-brand-orange border border-orange-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Mode: {selectedMode}
                    <button onClick={() => setSelectedMode('ALL')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedFormat !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    Format: {selectedFormat}
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
          <span>Showing <strong className="text-slate-900 font-bold">{filteredTournaments.length}</strong> active tournaments</span>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

