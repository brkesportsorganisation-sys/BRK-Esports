'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  PlusCircle, 
  CheckCircle2, 
  Flame, 
  Award, 
  Gamepad2, 
  Target, 
  Crosshair, 
  Loader2,
  RefreshCw
} from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);

  const loadMatches = async (tourId: string) => {
    try {
      const res = await fetch(`/api/admin/matches?tournamentId=${tourId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
          return;
        }
      }
    } catch (err) {
      console.warn('Match results load error:', err);
    }
    setResults(db.getMatchResults(tourId));
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/tournaments');
        if (res.ok) {
          const data = await res.json();
          if (data.tournaments && data.tournaments.length > 0) {
            setTournaments(data.tournaments);
            setSelectedTourId(data.tournaments[0].id);
            loadMatches(data.tournaments[0].id);
            return;
          }
        }
      } catch (err) {
        console.warn('Tournaments load error:', err);
      }
      const list = db.getTournaments();
      setTournaments(list);
      if (list.length > 0) {
        setSelectedTourId(list[0].id);
        setResults(db.getMatchResults(list[0].id));
      }
    }
    init();
  }, []);

  const handleTourChange = (id: string) => {
    setSelectedTourId(id);
    loadMatches(id);
  };

  // Placement points matrix: 1st=12, 2nd=9, 3rd=8, 4th=7, 5th=6...
  const calculatePoints = (place: number, killCount: number) => {
    const placementTable: Record<number, number> = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 };
    const placePts = placementTable[place] || 0;
    return placePts + killCount;
  };

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourId || !teamName) return;

    setSubmitting(true);
    const totalPts = calculatePoints(placement, kills);

    try {
      await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTourId,
          playerName: teamName,
          ffUid: ffUid || '1029384756',
          kills,
          placement,
          points: totalPts,
        }),
      });
    } catch (err) {
      console.warn('Match result save error:', err);
    }

    db.addMatchResult({
      tournamentId: selectedTourId,
      teamOrPlayerName: teamName,
      ffUid: ffUid || '1029384756',
      kills,
      placement,
      points: totalPts,
    });

    await loadMatches(selectedTourId);
    setTeamName('');
    setKills(0);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center border border-brand-orange/20 shadow-sm">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-white">
              MATCH RESULTS & SCORECARD ENTRY
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit kill points and Booyah standings. Stats update player profiles and leaderboards automatically.
            </p>
          </div>
        </div>

        {/* Tournament Switcher */}
        <div className="w-full sm:w-72">
          <select
            value={selectedTourId}
            onChange={(e) => handleTourChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-brand-orange shadow-sm"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.mode})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Scorecard Input Form */}
        <div className="lg:col-span-5 bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Target className="w-5 h-5 text-brand-red" />
            <h3 className="font-heading font-black text-lg text-white">RECORD SQUAD / PLAYER SCORE</h3>
          </div>

          <form onSubmit={handleAddResult} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Squad or Player IGN *</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                placeholder="e.g. BRK_PHANTOM"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Free Fire UID (Optional)</label>
              <input
                type="text"
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value)}
                placeholder="1092837465"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Match Placement</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none"
                >
                  <option value={1}>#1 Booyah (12 pts)</option>
                  <option value={2}>#2 Runner-Up (9 pts)</option>
                  <option value={3}>#3 Third Place (8 pts)</option>
                  <option value={4}>#4 4th Place (7 pts)</option>
                  <option value={5}>#5 5th Place (6 pts)</option>
                  <option value={6}>#6 6th Place (5 pts)</option>
                  <option value={7}>#7 7th Place (4 pts)</option>
                  <option value={8}>#8 8th Place (3 pts)</option>
                  <option value={9}>#9 9th Place (2 pts)</option>
                  <option value={10}>#10 10th Place (1 pt)</option>
                  <option value={11}>#11-12 (0 pts)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Kills Count</label>
                <input
                  type="number"
                  min={0}
                  value={kills}
                  onChange={(e) => setKills(Number(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold"
                />
              </div>
            </div>

            {/* Calculated Points Preview */}
            <div className="p-3.5 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-between">
              <span className="text-slate-300 font-bold">Total Points Earned:</span>
              <span className="font-heading font-black text-xl text-brand-gold">
                {calculatePoints(placement, kills)} PTS
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SUBMIT SCORECARD</span>}
            </button>
          </form>
        </div>

        {/* Match Standings Table */}
        <div className="lg:col-span-7 bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-gold" />
              <span>LIVE MATCH STANDINGS ({results.length})</span>
            </h3>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Crosshair className="w-10 h-10 mx-auto text-slate-600" />
              <div className="font-bold text-slate-300">No Match Scores Recorded Yet</div>
              <div className="text-xs">Submit scores using the form to populate the tournament results.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Squad / Player</th>
                    <th className="p-3 text-center">Placement</th>
                    <th className="p-3 text-center">Kills</th>
                    <th className="p-3 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {results.sort((a, b) => b.points - a.points).map((res, idx) => (
                    <tr key={res.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-heading font-black text-sm">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          idx === 0 ? 'bg-brand-gold text-black shadow-neon-gold' :
                          idx === 1 ? 'bg-slate-300 text-black' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white text-xs">{res.teamOrPlayerName}</div>
                        <div className="text-[10px] font-mono text-slate-500">UID: {res.ffUid}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-xs text-slate-300">
                        #{res.placement}
                      </td>
                      <td className="p-3 text-center font-bold text-xs text-brand-red font-mono">
                        {res.kills}
                      </td>
                      <td className="p-3 text-right font-heading font-black text-brand-gold text-base">
                        {res.points} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
