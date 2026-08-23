'use client';

import React, { useState, useEffect, use } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User, InGameRole, GAME_ROLES_MAP } from '@/lib/types';
import { 
  ShieldCheck, 
  Crown, 
  UserPlus, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Users, 
  Swords, 
  Trophy 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SquadJoinLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [squad, setSquad] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferredRole, setPreferredRole] = useState<InGameRole>('RUSHER');
  const [freeFireUid, setFreeFireUid] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          setFreeFireUid(data.user.freeFireUid || '');
        } else {
          const localUser = db.getCurrentUser();
          setCurrentUser(localUser);
          if (localUser?.freeFireUid) setFreeFireUid(localUser.freeFireUid);
        }
      })
      .catch(() => {
        const localUser = db.getCurrentUser();
        setCurrentUser(localUser);
      });

    // Load squad preview by token
    fetch(`/api/squads/join/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const d = await res.json();
          setSquad(d.squad);
        } else {
          const d = await res.json();
          setError(d.message || 'Invalid or expired invite link.');
        }
      })
      .catch(() => setError('Failed to load squad preview.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoinSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push(`/login?redirect=/squad/join/${token}`);
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/squads/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          accountNumber: currentUser.accountNumber || `EZBD-${currentUser.id.substring(0, 6).toUpperCase()}`,
          freeFireUid: freeFireUid.trim() || currentUser.freeFireUid || '',
          preferredRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setJoinSuccess(data.message);
        setTimeout(() => {
          router.push(`/squads/${data.squadId}`);
        }, 1500);
      } else {
        setError(data.message || 'Failed to join squad.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsJoining(false);
    }
  };

  const gameRoles = (squad && GAME_ROLES_MAP[squad.game]) || GAME_ROLES_MAP['FREE_FIRE'];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        
        {loading ? (
          <div className="py-32 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
            <div className="text-xs text-slate-400 font-bold">Verifying squad invitation link...</div>
          </div>
        ) : error && !squad ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-black font-heading text-white">Invalid Squad Invite</h2>
            <p className="text-xs text-slate-400">{error}</p>
            <Link href="/teams" className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-block">
              Browse All Squads
            </Link>
          </div>
        ) : squad && (
          <div className="space-y-6">
            
            {/* Squad Hero Card */}
            <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                {squad.bannerUrl && (
                  <img src={squad.bannerUrl} alt={squad.name} className="w-full h-full object-cover opacity-40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-slate-700 text-amber-400 text-xs font-black uppercase">
                    🎮 {squad.game}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-5">
                <div className="flex items-end gap-4">
                  <img
                    src={squad.logoUrl}
                    alt={squad.name}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-amber-500 shadow-xl bg-slate-950 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-black">
                        [{squad.tag}]
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-black font-heading text-white">{squad.name}</h1>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Leader: <strong className="text-white">{squad.leaderName}</strong></p>
                  </div>
                </div>

                {squad.description && (
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    {squad.description}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block">Active Roster</span>
                    <strong className="text-white text-base">{squad.memberCount} / 6</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block">Matches Played</span>
                    <strong className="text-amber-400 text-base">{squad.matchesPlayed || 0}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 text-[10px] uppercase block">Tournament Wins</span>
                    <strong className="text-emerald-400 text-base">{squad.matchesWon || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Form / Action Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2 text-white font-heading font-black text-lg">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Join This Esports Squad</span>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {joinSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{joinSuccess} Redirecting to squad hub...</span>
                </div>
              )}

              {!currentUser ? (
                <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-300">You need to log in to your ESPORTS ZONE BD account to join this squad.</p>
                  <Link
                    href={`/login?redirect=/squad/join/${token}`}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase rounded-xl inline-block shadow-md"
                  >
                    Log In to Join Squad
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleJoinSquad} className="space-y-4 text-xs font-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold uppercase block text-[11px]">Your Preferred In-Game Role *</label>
                      <select
                        value={preferredRole}
                        onChange={(e) => setPreferredRole(e.target.value as InGameRole)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      >
                        {gameRoles.map((r: { role: InGameRole; label: string; icon: string }) => (
                          <option key={r.role} value={r.role}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold uppercase block text-[11px]">Your Game UID (Free Fire / Game ID)</label>
                      <input
                        type="text"
                        placeholder="Enter your game UID..."
                        value={freeFireUid}
                        onChange={(e) => setFreeFireUid(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {squad.requireApprovalToJoin
                        ? 'ℹ️ Squad leader approval is required before joining active roster.'
                        : '⚡ Instant join enabled — you will be added directly!'}
                    </span>

                    <button
                      type="submit"
                      disabled={isJoining}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase rounded-xl shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isJoining && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{squad.requireApprovalToJoin ? 'Send Join Request' : 'Join Squad Now'}</span>
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        )}

      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
