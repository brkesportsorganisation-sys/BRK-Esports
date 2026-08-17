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
  RefreshCw,
  Search,
  UserCheck
} from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const loadMatches = async (tourId: string) => {
    if (!tourId) return;
    try {
      const res = await fetch(`/api/admin/matches?tournamentId=${tourId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.warn('Match results load error:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch('/api/tournaments', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const list = data.tournaments || [];
          setTournaments(list);
          if (list.length > 0) {
            setSelectedTourId(list[0].id);
            await loadMatches(list[0].id);
          }
        }
      } catch (err) {
        console.warn('Tournaments load error:', err);
      } finally {
        setLoading(false);
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
    if (!selectedTourId || !teamName.trim()) return;

    setSubmitting(true);
    const totalPts = calculatePoints(placement, kills);

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tournamentId: selectedTourId,
          playerName: teamName.trim(),
          ffUid: ffUid.trim() || undefined,
          kills,
          placement,
          points: totalPts,
        }),
      });

      if (res.ok) {
        await loadMatches(selectedTourId);
        setTeamName('');
        setFfUid('');
        setKills(0);
        setPlacement(1);
        setSuccessMsg('Match result saved to database & player stats updated!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to save match result.');
      }
    } catch (err) {
      console.error('Match result save error:', err);
      alert('Network error while saving match result.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTournament = tournaments.find((t) => t.id === selectedTourId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Match Results & Scorecard Entry
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Submit kill points and Booyah standings. Player kills, wins, and leaderboard points sync directly with Supabase.
          </p>
        </div>

        {/* Tournament Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedTourId}
            onChange={(e) => handleTourChange(e.target.value)}
            className="px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-xs"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.mode} • {t.status})
              </option>
            ))}
          </select>

          <button
            onClick={() => loadMatches(selectedTourId)}
            className="p-2 rounded-[12px] bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] shadow-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Grid (Left: Score Input Form, Right: Live Leaderboard/Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Scorecard Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-4">
            <PlusCircle className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">Enter Player / Team Score</h2>
              <p className="text-[12px] text-[#64748B]">Score will be logged to Supabase</p>
            </div>
          </div>

          <form onSubmit={handleAddResult} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-[#475569] mb-1.5 font-semibold">Player In-Game Name / Team Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. VORTEX_GAMER"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-[#475569] mb-1.5 font-semibold">Free Fire UID (Optional for sync)</label>
              <input
                type="text"
                placeholder="e.g. 1029384756"
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#475569] mb-1.5 font-semibold">Placement Rank</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((pos) => (
                    <option key={pos} value={pos}>
                      #{pos} {pos === 1 ? '🏆 (Booyah!)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] mb-1.5 font-semibold">Kill Count</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={kills}
                  onChange={(e) => setKills(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Calculated Points Preview */}
            <div className="p-3.5 rounded-[14px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-xs">
              <span className="text-[#1E40AF] font-semibold">Calculated Total Points:</span>
              <span className="font-bold text-[#2563EB] text-sm">{calculatePoints(placement, kills)} PTS</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              <span>{submitting ? 'Saving to Database...' : 'Submit & Sync Match Score'}</span>
            </button>
          </form>
        </div>

        {/* Results Standings Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">
                {selectedTournament?.title || 'Tournament'} Results
              </h2>
              <p className="text-[12px] text-[#64748B] font-normal">
                Live scoreboard & point distribution
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-blue-100">
              {results.length} Recorded
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-[#2563EB]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-16 text-center text-slate-600 space-y-2">
                <Crosshair className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-[#0F172A] text-base">No Scores Submitted Yet</div>
                <div className="text-xs font-medium">Use the scorecard form to enter kill points for this tournament.</div>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-3.5 px-5">Rank</th>
                    <th className="py-3.5 px-5">Player / Team</th>
                    <th className="py-3.5 px-5">Kills</th>
                    <th className="py-3.5 px-5 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {results
                    .slice()
                    .sort((a, b) => (b.points || 0) - (a.points || 0))
                    .map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            r.placement === 1 ? 'bg-amber-100 text-amber-800' :
                            r.placement === 2 ? 'bg-slate-200 text-slate-800' :
                            r.placement === 3 ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-700 font-bold'
                          }`}>
                            #{r.placement}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-[#0F172A] text-xs">{(r as any).playerName || (r as any).teamOrPlayerName}</div>
                          {r.ffUid && <div className="text-[10px] font-mono text-slate-600 font-bold">UID: {r.ffUid}</div>}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-[#0F172A] text-xs">
                          {r.kills} Kills
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-[#2563EB] text-sm">
                          {r.points} PTS
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
