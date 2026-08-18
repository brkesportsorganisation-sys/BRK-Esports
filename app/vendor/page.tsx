'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  Users, 
  KeyRound, 
  Gamepad2, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Tournament, VendorAccessLevel, VendorPermissionKey } from '@/lib/types';

interface VendorData {
  vendorId: string;
  accessLevel: VendorAccessLevel;
  permissions: VendorPermissionKey[];
}

export default function VendorDashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/vendor/tournaments', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTournaments(data.tournaments || []);
        if (data.vendor) {
          setVendor(data.vendor);
        }
      }
    } catch (err) {
      console.warn('Failed to load vendor tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRegistered = tournaments.reduce((sum, t) => sum + (t.registeredCount || 0), 0);
  const roomsReady = tournaments.filter((t) => Boolean(t.roomId && t.roomPassword)).length;
  const isFull = vendor?.accessLevel === 'FULL_ACCESS';
  const hasPerm = (p: VendorPermissionKey) => isFull || vendor?.permissions?.includes(p);

  return (
    <div className="space-y-6">
      
      {/* 1. Welcome Banner */}
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-[#0E1322] to-slate-900/60 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-violet-400 font-bold">
                OPERATIONAL DASHBOARD
              </span>
              {isFull ? (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-mono font-black">
                  ⭐ FULL PLATFORM ACCESS
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-black">
                  🛡️ LIMITED ACCESS OPERATOR
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
              Welcome, {vendor?.vendorId || 'Vendor Operator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              {isFull
                ? 'You have unrestricted access to manage room passwords, publish match results, and coordinate tournaments across the Blackrock platform.'
                : 'You have been assigned access to manage room credentials and record match scores for specific tournaments below.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {hasPerm('manage_room_details') && (
              <Link
                href="/vendor/settings"
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-900/30 transition-all flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Room Manager</span>
              </Link>
            )}

            {hasPerm('enter_match_results') && (
              <Link
                href="/vendor/matches"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span>Enter Scores</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Assigned Tournaments</p>
              <p className="mt-1 text-2xl font-black text-white font-mono">{tournaments.length}</p>
            </div>
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 text-violet-400">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Registered Players & Teams</p>
              <p className="mt-1 text-2xl font-black text-cyan-400 font-mono">{totalRegistered}</p>
            </div>
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-cyan-400">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Rooms Credentials Ready</p>
              <p className="mt-1 text-2xl font-black text-emerald-400 font-mono">
                {roomsReady} / {tournaments.length}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-400">
              <KeyRound className="h-6 w-6" />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Tournaments List */}
      <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-black text-white font-heading">
              Your Accessible Tournaments
            </h2>
            <p className="text-xs text-slate-400">
              Manage Room IDs, passwords, countdown release timers, and match results.
            </p>
          </div>

          {hasPerm('manage_room_details') && (
            <Link
              href="/vendor/settings"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage all room passwords</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-violet-400 text-xs font-mono">
            LOADING TOURNAMENT ROSTER...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">No Tournaments Assigned</p>
            <p>Please contact platform administration to assign tournaments to your vendor ID.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tournaments.map((tournament) => {
              const hasRoom = Boolean(tournament.roomId && tournament.roomPassword);

              return (
                <div
                  key={tournament.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 p-4 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{tournament.title}</span>
                      <span className="px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] font-bold">
                        {tournament.mode}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        {tournament.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                      <span>Format: <strong className="text-slate-200">{tournament.format.replace('_', ' ')}</strong></span>
                      <span>•</span>
                      <span>Slots: <strong className="text-slate-200">{tournament.registeredCount} / {tournament.maxTeams}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Match: {new Date(tournament.matchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    {/* Room details status tag */}
                    <div className="pt-1">
                      {hasRoom ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Room ID: <strong>{tournament.roomId}</strong> (Configured)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Room ID & Password Pending Setup</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                    {hasPerm('manage_room_details') && (
                      <Link
                        href={`/vendor/settings?tournamentId=${tournament.id}`}
                        className="px-3.5 py-2 rounded-xl border border-violet-500/40 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Set Room Pass</span>
                      </Link>
                    )}

                    {hasPerm('enter_match_results') && (
                      <Link
                        href={`/vendor/matches?tournamentId=${tournament.id}`}
                        className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enter Results</span>
                      </Link>
                    )}

                    {hasPerm('view_registrations') && (
                      <Link
                        href={`/vendor/registrations?tournamentId=${tournament.id}`}
                        className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Rosters</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
