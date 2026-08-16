'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { Tournament, User } from '@/lib/types';

function VendorSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTournamentId = searchParams.get('tournamentId') ?? db.getTournaments()[0]?.id ?? '';
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentIdState, setSelectedTournamentIdState] = useState(selectedTournamentId);
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [releaseTime, setReleaseTime] = useState('');

  useEffect(() => {
    const currentUser = db.getCurrentUser();
    if (!currentUser || currentUser.role !== 'VENDOR') {
      router.replace('/vendor/login');
      return;
    }

    const currentTournaments = db.getTournaments();
    setUser(currentUser);
    setTournaments(currentTournaments);

    if (currentTournaments.length > 0) {
      const chosenTournament = currentTournaments.find((t) => t.id === selectedTournamentId) ?? currentTournaments[0];
      setSelectedTournamentIdState(chosenTournament.id);
      setRoomId(chosenTournament.roomId ?? '');
      setRoomPassword(chosenTournament.roomPassword ?? '');
      setReleaseTime(chosenTournament.roomReleaseTime ? new Date(chosenTournament.roomReleaseTime).toISOString().slice(0, 16) : '');
    }
  }, [router, selectedTournamentId]);

  const handleSave = () => {
    const tournament = tournaments.find((item) => item.id === selectedTournamentIdState);
    if (!tournament) return;

    db.updateTournament(tournament.id, {
      roomId,
      roomPassword,
      roomReleaseTime: releaseTime ? new Date(releaseTime).toISOString() : undefined,
    });

    setTournaments([...db.getTournaments()]);
    alert('Tournament settings saved successfully.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Vendor settings</p>
            <h1 className="mt-2 text-3xl font-black text-white">Tournament room access</h1>
          </div>
          <Link href="/vendor" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-violet-200">
            <ShieldCheck className="h-5 w-5" />
            <span>Vendor can manage room ID, room password, and unlock time for assigned tournaments.</span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Tournament</label>
              <select
                value={selectedTournamentIdState}
                onChange={(e) => {
                  const chosen = tournaments.find((item) => item.id === e.target.value) ?? tournaments[0];
                  setSelectedTournamentIdState(chosen?.id ?? '');
                  setRoomId(chosen?.roomId ?? '');
                  setRoomPassword(chosen?.roomPassword ?? '');
                  setReleaseTime(chosen?.roomReleaseTime ? new Date(chosen.roomReleaseTime).toISOString().slice(0, 16) : '');
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>{tournament.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Unlock time</label>
              <input
                type="datetime-local"
                value={releaseTime}
                onChange={(e) => setReleaseTime(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Room ID</label>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                placeholder="Enter room ID"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Room password</label>
              <input
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                placeholder="Enter room password"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 font-semibold text-white">
              <Save className="h-4 w-4" />
              Save tournament settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VendorSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading settings...</div>}>
      <VendorSettingsContent />
    </Suspense>
  );
}
