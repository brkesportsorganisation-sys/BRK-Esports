'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Trophy, Settings, LogOut, Users, Lock } from 'lucide-react';
import { db } from '@/lib/db';
import { User, Tournament } from '@/lib/types';

export default function VendorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const currentUser = db.getCurrentUser();
    if (!currentUser || currentUser.role !== 'VENDOR') {
      router.replace('/vendor/login');
      return;
    }

    setUser(currentUser);
    setTournaments(db.getTournaments());
  }, [router]);

  const handleLogout = () => {
    db.setCurrentUser({ ...db.getUsers()[0], role: 'ADMIN' });
    router.push('/vendor/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Vendor dashboard</p>
            <h1 className="mt-2 text-3xl font-black text-white">Welcome, {user?.name ?? 'Vendor'}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
              <ArrowLeft className="h-4 w-4" />
              Admin Panel
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300"><Trophy className="h-5 w-5" /></div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active tournaments</p>
                <p className="mt-2 text-2xl font-black text-white">{tournaments.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300"><Users className="h-5 w-5" /></div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Registered teams</p>
                <p className="mt-2 text-2xl font-black text-white">{tournaments.reduce((sum, t) => sum + t.registeredCount, 0)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300"><Settings className="h-5 w-5" /></div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Access</p>
                <p className="mt-2 text-lg font-bold text-white">Tournament Settings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Tournament access</p>
              <h2 className="mt-2 text-2xl font-black text-white">Your tournaments</h2>
            </div>
            <Link href="/vendor/settings" className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white">
              Open tournament settings
            </Link>
          </div>

          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <p className="text-lg font-bold text-white">{tournament.title}</p>
                  <p className="text-sm text-slate-400">{tournament.format.replace('_', ' ')} • {tournament.mode}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {tournament.status}
                  </span>
                  <Link href={`/vendor/settings?tournamentId=${tournament.id}`} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                    <Lock className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
