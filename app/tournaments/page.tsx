'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trophy, Filter, Flame, SlidersHorizontal } from 'lucide-react';
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
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-surface/60 border-b border-surface-border py-12 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-xs font-bold text-brand-orange uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-brand-orange" />
            <span>Competitive Esports Arena</span>
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl text-white">
            FREE FIRE TOURNAMENTS
          </h1>
          <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
            Browse active Solo, Duo, and Squad tournaments. Enter room credentials, eliminate enemies, and earn real cash payouts.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        {/* Search & Filter Controls Bar */}
        <div className="glass-card rounded-2xl p-5 border border-surface-border space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tournament title or game mode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-light border border-surface-border rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>

            {/* Mode Select */}
            <div className="md:col-span-3">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-orange"
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
                className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                <option value="ALL">All Formats (BR & CS)</option>
                <option value="BR_RANKED">BR Ranked (Battle Royale)</option>
                <option value="CS_RANKED">CS Ranked (Clash Squad)</option>
              </select>
            </div>

          </div>

          {/* Secondary Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-surface-border">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 mr-2 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-orange" /> Filter By:
              </span>

              {/* Status Pills */}
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'ALL'
                    ? 'bg-brand-red text-white'
                    : 'bg-surface-light text-gray-400 hover:text-white'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setSelectedStatus('UPCOMING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'UPCOMING'
                    ? 'bg-brand-orange text-white'
                    : 'bg-surface-light text-gray-400 hover:text-white'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setSelectedStatus('LIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'LIVE'
                    ? 'bg-brand-red text-white animate-pulse'
                    : 'bg-surface-light text-gray-400 hover:text-white'
                }`}
              >
                Live Now
              </button>
              <button
                onClick={() => setSelectedStatus('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedStatus === 'COMPLETED'
                    ? 'bg-gray-700 text-white'
                    : 'bg-surface-light text-gray-400 hover:text-white'
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
                  selectedType === 'ALL' ? 'bg-brand-purple text-white' : 'bg-surface-light text-gray-400'
                }`}
              >
                All Entries
              </button>
              <button
                onClick={() => setSelectedType('FREE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === 'FREE' ? 'bg-brand-cyan text-black font-extrabold' : 'bg-surface-light text-gray-400'
                }`}
              >
                FREE Entry
              </button>
              <button
                onClick={() => setSelectedType('PAID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === 'PAID' ? 'bg-brand-gold text-black font-extrabold' : 'bg-surface-light text-gray-400'
                }`}
              >
                Paid Tournaments
              </button>
            </div>

          </div>

        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
          <span>Showing <strong className="text-white">{filteredTournaments.length}</strong> active tournaments</span>
          {(searchQuery || selectedMode !== 'ALL' || selectedFormat !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMode('ALL');
                setSelectedFormat('ALL');
                setSelectedStatus('ALL');
                setSelectedType('ALL');
              }}
              className="text-brand-orange hover:underline"
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
          <div className="text-center py-20 glass-card rounded-3xl p-8 border border-surface-border">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-xl text-white">No Tournaments Found</h3>
            <p className="text-gray-400 text-xs mt-1">Try clearing your search query or selecting a different filter.</p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
