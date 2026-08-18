'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  KeyRound, 
  Save, 
  ShieldCheck, 
  ArrowLeft, 
  Clock, 
  Lock, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  Trophy,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Tournament } from '@/lib/types';

function VendorSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get('tournamentId') || '';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId);
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [releaseTime, setReleaseTime] = useState('');
  const [roomEnabled, setRoomEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadTournaments = async () => {
    try {
      const res = await fetch('/api/vendor/tournaments', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list: Tournament[] = data.tournaments || [];
        setTournaments(list);

        if (list.length > 0) {
          const chosen = list.find((t) => t.id === selectedTournamentId) || list[0];
          setSelectedTournamentId(chosen.id);
          setRoomId(chosen.roomId || '');
          setRoomPassword(chosen.roomPassword || '');
          setRoomEnabled(chosen.roomEnabled !== false);
          setReleaseTime(
            chosen.roomReleaseTime
              ? new Date(chosen.roomReleaseTime).toISOString().slice(0, 16)
              : ''
          );
        }
      }
    } catch (err) {
      console.warn('Failed to load tournaments for vendor room settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleTournamentChange = (tId: string) => {
    setSelectedTournamentId(tId);
    setSuccessMessage('');
    setErrorMessage('');
    const chosen = tournaments.find((t) => t.id === tId);
    if (chosen) {
      setRoomId(chosen.roomId || '');
      setRoomPassword(chosen.roomPassword || '');
      setRoomEnabled(chosen.roomEnabled !== false);
      setReleaseTime(
        chosen.roomReleaseTime
          ? new Date(chosen.roomReleaseTime).toISOString().slice(0, 16)
          : ''
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId) return;

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/vendor/tournaments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tournamentId: selectedTournamentId,
          roomId,
          roomPassword,
          roomReleaseTime: releaseTime || undefined,
          roomEnabled,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Tournament Room ID and Password saved successfully!');
        await loadTournaments();
      } else {
        setErrorMessage(data.message || 'Failed to save room credentials.');
      }
    } catch {
      setErrorMessage('Network error while saving credentials.');
    } finally {
      setSaving(false);
    }
  };

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-violet-400 font-bold">
              CREDENTIAL MANAGER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
            Tournament Room ID & Password Setup
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Set custom Room ID, password, and unlock countdown timers for players who joined your tournament.
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

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/30 to-indigo-950/20 border border-violet-500/20 text-xs text-violet-200 flex items-start gap-3 shadow-inner">
        <ShieldCheck className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-white">Player Room Security:</strong> Players who have joined this tournament will only be able to view the Room ID and Password once the scheduled <strong>Unlock Time</strong> arrives or when manually released.
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 sm:p-8 shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-violet-400 text-xs font-mono">
            LOADING TOURNAMENT DETAILS...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">No Tournaments Available</p>
            <p>You currently do not have assigned tournaments.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Tournament Selector */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Select Tournament *
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => handleTournamentChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3.5 text-sm font-bold text-white focus:border-violet-500 focus:outline-none transition-colors"
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id} className="bg-slate-900 text-white">
                    {tournament.title} ({tournament.mode} • ৳{tournament.entryFee})
                  </option>
                ))}
              </select>
            </div>

            {selectedTournament && (
              <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-xs flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-slate-400">Match Scheduled:</span>{' '}
                  <strong className="text-white font-mono">
                    {new Date(selectedTournament.matchTime).toLocaleString()}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] font-bold">
                    {selectedTournament.format.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    {selectedTournament.status}
                  </span>
                </div>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid gap-5 md:grid-cols-2 text-xs">
              
              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Custom Free Fire Room ID *
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-violet-500 transition-colors">
                  <KeyRound className="mr-2.5 h-4 w-4 text-violet-400" />
                  <input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-transparent text-sm font-mono font-bold text-white outline-none placeholder-slate-600"
                    placeholder="e.g. 7482910"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Room Password *
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-violet-500 transition-colors">
                  <Lock className="mr-2.5 h-4 w-4 text-violet-400" />
                  <input
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="w-full bg-transparent text-sm font-mono font-bold text-white outline-none placeholder-slate-600"
                    placeholder="e.g. 1234"
                    type={showPassword ? 'text' : 'password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Room Pass Unlock Time (Optional)
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-violet-500 transition-colors">
                  <Clock className="mr-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="datetime-local"
                    value={releaseTime}
                    onChange={(e) => setReleaseTime(e.target.value)}
                    className="w-full bg-transparent text-sm font-mono text-white outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">If set, players will see a live countdown until this time.</p>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Room Visibility Status
                </label>
                <div
                  onClick={() => setRoomEnabled(!roomEnabled)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                    roomEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-bold">{roomEnabled ? 'Active (Players Can Unlock)' : 'Disabled / Hidden'}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase underline">Toggle</span>
                </div>
              </div>

            </div>

            {/* Status Messages */}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-6 py-3.5 font-bold text-white text-xs shadow-lg shadow-violet-900/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>SAVING CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>SAVE ROOM CREDENTIALS</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>

    </div>
  );
}

export default function VendorSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-violet-400 font-mono text-xs">
          LOADING VENDOR ROOM SETTINGS...
        </div>
      }
    >
      <VendorSettingsContent />
    </Suspense>
  );
}
