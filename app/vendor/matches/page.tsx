'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Gamepad2, 
  Trophy, 
  Plus, 
  Check, 
  Loader2, 
  ArrowLeft, 
  Crosshair, 
  Award, 
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Tournament, MatchResult } from '@/lib/types';

function VendorMatchesContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get('tournamentId') || '';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [playerName, setPlayerName] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [kills, setKills] = useState<number>(0);
  const [placement, setPlacement] = useState<number>(1);
  const [points, setPoints] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    try {
      const resT = await fetch('/api/vendor/tournaments', { credentials: 'include' });
      if (resT.ok) {
        const dataT = await resT.json();
        const list: Tournament[] = dataT.tournaments || [];
        setTournaments(list);

        const chosenId = selectedTournamentId || (list.length > 0 ? list[0].id : '');
        if (chosenId) {
          setSelectedTournamentId(chosenId);
          await loadResults(chosenId);
        }
      }
    } catch (err) {
      console.warn('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (tId: string) => {
    try {
      const resM = await fetch(`/api/vendor/matches?tournamentId=${tId}`, { credentials: 'include' });
      if (resM.ok) {
        const dataM = await resM.json();
        setResults(dataM.results || []);
      }
    } catch (err) {
      console.warn('Failed to load match results:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTournamentSelect = async (tId: string) => {
    setSelectedTournamentId(tId);
    setSuccessMessage('');
    setErrorMessage('');
    await loadResults(tId);
  };

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId || !playerName) return;

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/vendor/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tournamentId: selectedTournamentId,
          playerName,
          ffUid,
          kills,
          placement,
          points,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Result recorded for ${playerName}!`);
        setPlayerName('');
        setFfUid('');
        setKills(0);
        setPlacement(1);
        setPoints(0);
        await loadResults(selectedTournamentId);
      } else {
        setErrorMessage(data.message || 'Failed to submit match score.');
      }
    } catch {
      setErrorMessage('Network error while saving match score.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-emerald-400 font-bold">
              MATCH SCORING
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
            Enter Match Results & Points
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Record final match kill scores, placement ranks, and points for your tournament participants.
          </p>
        </div>

        <Link
          href="/vendor"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Tournament Picker */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Trophy className="w-4 h-4 text-violet-400" />
          <span>Select Match Tournament:</span>
        </div>

        <select
          value={selectedTournamentId}
          onChange={(e) => handleTournamentSelect(e.target.value)}
          className="rounded-xl border border-slate-800 bg-[#07090E] px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
              {t.title} ({t.mode})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Score Submission Form */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-heading font-black text-base text-white">Submit Player Score</h2>
          </div>

          <form onSubmit={handleAddResult} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Player IGN or Team Name *</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
                placeholder="e.g. OP_ASHIK or Team Hydra"
                className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Free Fire UID (Optional)</label>
              <input
                type="text"
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value)}
                placeholder="e.g. 2938472910"
                className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Kills</label>
                <input
                  type="number"
                  min="0"
                  value={kills}
                  onChange={(e) => setKills(Number(e.target.value))}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Placement</label>
                <input
                  type="number"
                  min="1"
                  value={placement}
                  onChange={(e) => setPlacement(Number(e.target.value))}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Total Pts</label>
                <input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {successMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>ADD TO SCOREBOARD</span>
            </button>
          </form>
        </div>

        {/* Scoreboard List */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="font-heading font-black text-base text-white">
                Recorded Scores ({results.length})
              </h2>
              <p className="text-xs text-slate-400">Match kills, placement rank, and points entered so far.</p>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-400">No Match Results Recorded</p>
              <p>Use the form on the left to enter player kill scores and placements.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Player / Team</th>
                    <th className="p-3">UID</th>
                    <th className="p-3 text-center">Kills</th>
                    <th className="p-3 text-center">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {results.map((res, index) => (
                    <tr key={res.id || index} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          res.placement === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : res.placement === 2
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                            : res.placement === 3
                            ? 'bg-orange-700/20 text-orange-400 border border-orange-700/40'
                            : 'text-slate-400'
                        }`}>
                          #{res.placement}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">
                        {res.playerName || (res as any).teamOrPlayerName}
                      </td>
                      <td className="p-3 font-mono text-cyan-400 text-[11px]">
                        {res.ffUid || '-'}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400 font-mono">
                        {res.kills}
                      </td>
                      <td className="p-3 text-center font-bold text-violet-300 font-mono">
                        {res.points}
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

export default function VendorMatchesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-violet-400 font-mono text-xs">LOADING MATCH SCORES...</div>}>
      <VendorMatchesContent />
    </Suspense>
  );
}
