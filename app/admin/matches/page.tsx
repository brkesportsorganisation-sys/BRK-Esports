'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, PlusCircle, CheckCircle2, Flame, Award } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { Tournament, MatchResult } from '@/lib/types';

export default function AdminMatchesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  
  // Score Input State
  const [teamName, setTeamName] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [kills, setKills] = useState(0);
  const [placement, setPlacement] = useState(1);
  const [results, setResults] = useState<MatchResult[]>([]);

  useEffect(() => {
    const list = db.getTournaments();
    setTournaments(list);
    if (list.length > 0) {
      setSelectedTourId(list[0].id);
      setResults(db.getMatchResults(list[0].id));
    }
  }, []);

  const handleTourChange = (id: string) => {
    setSelectedTourId(id);
    setResults(db.getMatchResults(id));
  };

  // Placement points matrix: 1st=12, 2nd=9, 3rd=8, 4th=7, 5th=6...
  const calculatePoints = (place: number, killCount: number) => {
    const placementTable: Record<number, number> = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 };
    const placePts = placementTable[place] || 0;
    return placePts + killCount;
  };

  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourId || !teamName) return;

    const totalPts = calculatePoints(placement, kills);

    const newRes = db.addMatchResult({
      tournamentId: selectedTourId,
      teamOrPlayerName: teamName,
      ffUid: ffUid || '1029384756',
      kills,
      placement,
      points: totalPts,
    });

    setResults(db.getMatchResults(selectedTourId));
    setTeamName('');
    setKills(0);
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      <div className="bg-surface/80 border-b border-surface-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading font-black text-3xl text-white">AUTOMATED MATCH POINT CALCULATION</h1>
          <div className="text-xs text-gray-400">Input kill counts and placement rank to compute official standings</div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        <div className="flex items-center space-x-2 border-b border-surface-border overflow-x-auto pb-1">
          <Link href="/admin" className="px-4 py-2 rounded-xl bg-surface-light text-gray-300 hover:text-white font-heading font-bold text-xs">
            Overview & Analytics
          </Link>
          <Link href="/admin/tournaments" className="px-4 py-2 rounded-xl bg-surface-light text-gray-300 hover:text-white font-heading font-bold text-xs">
            Tournament Manager
          </Link>
          <Link href="/admin/payments" className="px-4 py-2 rounded-xl bg-surface-light text-gray-300 hover:text-white font-heading font-bold text-xs">
            Payment Verification
          </Link>
          <Link href="/admin/matches" className="px-4 py-2 rounded-xl bg-brand-purple text-white font-heading font-bold text-xs">
            Match Standings Entry
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Form: Input Result */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-surface-border space-y-4">
            <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-brand-orange" /> Record Squad Result
            </h3>

            <form onSubmit={handleAddResult} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-300 block mb-1">Select Tournament *</label>
                <select
                  value={selectedTourId}
                  onChange={(e) => handleTourChange(e.target.value)}
                  className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-white font-bold"
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">Squad / Player Name *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="e.g. Apex Predators"
                  className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">Placement Rank (1-12) *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={placement}
                    onChange={(e) => setPlacement(Number(e.target.value))}
                    required
                    className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-300 block mb-1">Total Kills *</label>
                  <input
                    type="number"
                    min={0}
                    value={kills}
                    onChange={(e) => setKills(Number(e.target.value))}
                    required
                    className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-light border border-surface-border flex items-center justify-between">
                <span className="text-gray-400 font-bold">Auto Points Preview:</span>
                <span className="font-heading font-black text-brand-gold text-lg">
                  {calculatePoints(placement, kills)} Points
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-bold text-sm shadow-neon-red"
              >
                SUBMIT MATCH POINTS
              </button>
            </form>
          </div>

          {/* Right Table: Computed Standings */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-surface-border space-y-4">
            <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-gold" /> Calculated Standings
            </h3>

            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-light text-xs font-bold uppercase text-gray-400">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Squad Name</th>
                      <th className="p-3 text-center">Placement</th>
                      <th className="p-3 text-center">Kills</th>
                      <th className="p-3 text-right">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {results
                      .sort((a, b) => b.points - a.points)
                      .map((r, index) => (
                        <tr key={r.id} className="hover:bg-surface-light/50">
                          <td className="p-3 font-heading font-bold text-white">#{index + 1}</td>
                          <td className="p-3 font-bold text-white">{r.teamOrPlayerName}</td>
                          <td className="p-3 text-center text-xs text-gray-400">#{r.placement}</td>
                          <td className="p-3 text-center font-bold text-brand-orange">{r.kills}</td>
                          <td className="p-3 text-right font-heading font-black text-brand-gold text-base">
                            {r.points} Pts
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                No match results recorded yet for this tournament. Use the form to add scores.
              </div>
            )}
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
