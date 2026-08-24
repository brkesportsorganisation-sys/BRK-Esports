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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-20 lg:pb-12">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        
        {loading ? (
          <div className="py-32 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto" />
            <div className="text-xs text-slate-500 font-bold">Verifying squad invitation link...</div>
          </div>
        ) : error && !squad ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-brand-red mx-auto" />
            <h2 className="text-xl font-black font-heading text-slate-900">Invalid Squad Invite</h2>
            <p className="text-xs text-slate-500">{error}</p>
            <Link href="/teams" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold text-xs inline-block shadow-md">
              Browse All Squads
            </Link>
          </div>
        ) : squad && (
          <div className="space-y-6">
            
            {/* Squad Hero Card */}
            <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                {squad.bannerUrl && (
                  <img src={squad.bannerUrl} alt={squad.name} className="w-full h-full object-cover opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-orange-300 text-xs font-black uppercase">
                    🎮 {squad.game}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-5">
                <div className="flex items-end gap-4">
                  <img
                    src={squad.logoUrl}
                    alt={squad.name}
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl bg-slate-900 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-orange-100 border border-orange-200 text-orange-700 font-mono text-xs font-black">
                        [{squad.tag}]
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900">{squad.name}</h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Leader: <strong className="text-slate-900">{squad.leaderName}</strong></p>
                  </div>
                </div>

                {squad.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {squad.description}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs font-mono">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase block">Active Roster</span>
                    <strong className="text-slate-900 text-base">{squad.memberCount} / 6</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase block">Matches Played</span>
                    <strong className="text-orange-600 text-base">{squad.matchesPlayed || 0}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 text-[10px] uppercase block">Tournament Wins</span>
                    <strong className="text-emerald-600 text-base">{squad.matchesWon || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Form / Action Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-900 font-heading font-black text-lg">
                <span className="p-2 rounded-xl bg-orange-100 text-brand-orange">
                  <UserPlus className="w-5 h-5" />
                </span>
                <span>Join This Esports Squad</span>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {joinSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{joinSuccess} Redirecting to squad hub...</span>
                </div>
              )}

              {!currentUser ? (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                  <p className="text-xs text-slate-600 font-medium">You need to log in to your ESPORTS ZONE BD account to join this squad.</p>
                  <Link
                    href={`/login?redirect=/squad/join/${token}`}
                    className="px-6 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-xs uppercase rounded-xl inline-block shadow-md"
                  >
                    Log In to Join Squad
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleJoinSquad} className="space-y-4 text-xs font-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-700 font-bold uppercase block text-[11px]">Your Preferred In-Game Role *</label>
                      <select
                        value={preferredRole}
                        onChange={(e) => setPreferredRole(e.target.value as InGameRole)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-orange cursor-pointer"
                      >
                        {gameRoles.map((r: { role: InGameRole; label: string; icon: string }) => (
                          <option key={r.role} value={r.role}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 font-bold uppercase block text-[11px]">Your Game UID (Free Fire / Game ID)</label>
                      <input
                        type="text"
                        placeholder="Enter your game UID..."
                        value={freeFireUid}
                        onChange={(e) => setFreeFireUid(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-emerald-600 font-mono font-bold focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {squad.requireApprovalToJoin
                        ? 'ℹ️ Squad leader approval is required before joining active roster.'
                        : '⚡ Instant join enabled — you will be added directly!'}
                    </span>

                    <button
                      type="submit"
                      disabled={isJoining}
                      className="px-6 py-3 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-heading font-black text-xs uppercase rounded-xl shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all shrink-0"
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
