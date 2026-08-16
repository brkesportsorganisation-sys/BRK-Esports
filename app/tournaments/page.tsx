'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trophy, Filter, Flame, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import TournamentCard from '@/components/tournaments/TournamentCard';
import { Tournament, Mode, Format, TournamentStatus } from '@/lib/types';

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
      <div className="bg-white border-b border-slate-200 py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-brand-red/10 to-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-2">
          <span className="text-xs font-bold text-brand-orange uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-brand-orange/20">
            <Trophy className="w-3.5 h-3.5 text-brand-orange" />
            <span>Competitive Esports Arena</span>
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            FREE FIRE TOURNAMENTS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            Browse active Solo, Duo, and Squad tournaments. Enter room credentials, eliminate enemies, and earn real cash payouts.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Search & Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tournament title or game mode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-all"
              />
            </div>

            {/* Mode Select */}
            <div className="md:col-span-3">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white"
              >
                <option value="ALL">All Modes (Solo/Duo/Squad)</option>
                <option value="SOLO">Solo (1v1)</option>
                <option value="DUO">Duo (2v2)</option>
                <option value="SQUAD">Squad (4v4)</option>
              </select>
            </div>

            {/* Format Select */}
            <div className="md:col-span-3">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-orange focus:bg-white"
              >
                <option value="ALL">All Formats (BR & CS)</option>
                <option value="BR_RANKED">BR Ranked (Battle Royale)</option>
                <option value="CS_RANKED">CS Ranked (Clash Squad)</option>
              </select>
            </div>

          </div>

          {/* Secondary Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-orange" /> Filter:
              </span>

              {/* Status Pills */}
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'ALL'
                    ? 'bg-brand-red text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setSelectedStatus('UPCOMING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'UPCOMING'
                    ? 'bg-brand-orange text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setSelectedStatus('LIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'LIVE'
                    ? 'bg-brand-red text-white animate-pulse shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Live Now
              </button>
              <button
                onClick={() => setSelectedStatus('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'COMPLETED'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Entry Fee Pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === 'ALL' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Entries
              </button>
              <button
                onClick={() => setSelectedType('FREE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === 'FREE' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                FREE Entry
              </button>
              <button
                onClick={() => setSelectedType('PAID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === 'PAID' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Paid Tournaments
              </button>
            </div>

          </div>

        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
          <span>Showing <strong className="text-slate-900 font-bold">{filteredTournaments.length}</strong> active tournaments</span>
          {(searchQuery || selectedMode !== 'ALL' || selectedFormat !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMode('ALL');
                setSelectedFormat('ALL');
                setSelectedStatus('ALL');
                setSelectedType('ALL');
              }}
              className="text-brand-orange hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-2">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-heading font-bold text-xl text-slate-900">No Tournaments Found</h3>
            <p className="text-slate-500 text-xs mt-1">Try clearing your search query or selecting a different filter.</p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
