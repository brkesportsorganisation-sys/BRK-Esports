'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User } from '@/lib/types';
import { 
  Users, 
  ShieldCheck, 
  Trophy, 
  Plus, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  Gamepad2, 
  Flame, 
  Sparkles, 
  Crown, 
  UserPlus, 
  ArrowRight,
  Loader2,
  Swords
} from 'lucide-react';
import Link from 'next/link';

interface SquadTeam {
  id: string;
  name: string;
  tag: string;
  logo?: string;
  captainId: string;
  inviteCode?: string;
  matchesPlayed?: number;
  totalWins?: number;
  totalKills?: number;
  totalEarnings?: number;
  members?: { id: string; name: string; ign: string; role: string }[];
  roster?: {
    iglName: string;
    player1Name: string;
    player2Name: string;
    player3Name: string;
    player4Name: string;
  };
  createdAt: string;
}

export default function SquadTeamsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<SquadTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [iglName, setIglName] = useState('');
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [player3Name, setPlayer3Name] = useState('');
  const [player4Name, setPlayer4Name] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeams = async (uid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.warn('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.id) {
      loadTeams(user.id);
      setIglName(user.inGameName || user.name);
      setPlayer1Name(user.inGameName || user.name);
    } else {
      setLoading(false);
    }
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !teamName.trim() || !teamTag.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: teamName.trim(),
        tag: teamTag.trim().toUpperCase(),
        logo: teamLogo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
        captainId: currentUser.id,
        captainName: currentUser.name,
        roster: {
          iglName: iglName.trim(),
          player1Name: player1Name.trim(),
          player2Name: player2Name.trim(),
          player3Name: player3Name.trim(),
          player4Name: player4Name.trim(),
        }
      };

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setCreateModalOpen(false);
        setTeamName('');
        setTeamTag('');
        setTeamLogo('');
        loadTeams(currentUser.id);
      } else {
        alert(data.message || 'Failed to create team.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while creating squad team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-red-50/25 to-orange-50/35 border border-red-200/80 p-6 md:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                <Swords className="w-3.5 h-3.5" />
                ESPORTS CLAN & ROSTER HUB
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-heading">
                Permanent <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-amber-500">Squad Teams</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-600 max-w-xl leading-relaxed">
                Create and manage your competitive Free Fire squad. Save your 4-player lineup once and register for tournaments in 1-click!
              </p>
            </div>

            <button
              onClick={() => {
                if (!currentUser) {
                  window.location.href = '/login';
                  return;
                }
                setCreateModalOpen(true);
              }}
              className="px-6 py-3.5 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Squad Team
            </button>
          </div>
        </div>

        {/* Squad Teams Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-orange" />
            <p className="text-sm">Loading squad roster...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 font-heading">No Squads Created Yet</h3>
            <p className="text-xs text-slate-600">
              Create your squad profile to compete in official BRK Free Fire tournaments with your permanent roster.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
            >
              Create Your First Squad
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-6 bg-white border border-slate-200 hover:border-brand-orange/60 rounded-3xl space-y-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Team Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={team.logo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'}
                      alt={team.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-slate-900">{team.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-black bg-orange-50 text-brand-orange border border-orange-200">
                          [{team.tag}]
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                        <Crown className="w-3.5 h-3.5 text-amber-500" /> Captain Squad
                      </span>
                    </div>
                  </div>

                  {team.inviteCode && (
                    <button
                      onClick={() => handleCopyInvite(team.inviteCode!)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-200 cursor-pointer"
                      title="Copy Squad Code"
                    >
                      {copiedCode === team.inviteCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Matches</span>
                    <strong className="text-slate-900 font-black">{team.matchesPlayed || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Booyahs</span>
                    <strong className="text-amber-600 font-black">{team.totalWins || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Earnings</span>
                    <strong className="text-emerald-600 font-black">৳{team.totalEarnings || 0}</strong>
                  </div>
                </div>

                {/* Quick 1-Click Register CTA */}
                <div className="pt-1">
                  <Link
                    href="/tournaments"
                    className="w-full py-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200 text-brand-orange font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span>Register in Next Match</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Create Team Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-red-200/90 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-brand-orange" />
                <h3 className="text-base font-black text-slate-900 font-heading">Create Squad Clan Profile</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Squad / Clan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Black Rock Elites"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Clan Tag</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="BRK"
                    value={teamTag}
                    onChange={(e) => setTeamTag(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-brand-orange font-mono font-black focus:outline-none focus:border-brand-orange focus:bg-white uppercase"
                  />
                </div>
              </div>

              {/* Roster Setup */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default 4-Player Roster</h4>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Player 1 (IGL / Captain In-Game Name)"
                    value={player1Name}
                    onChange={(e) => {
                      setPlayer1Name(e.target.value);
                      setIglName(e.target.value);
                    }}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white font-mono"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Player 2 In-Game Name"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Player 3 In-Game Name (Optional)"
                    value={player3Name}
                    onChange={(e) => setPlayer3Name(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Player 4 In-Game Name (Optional)"
                    value={player4Name}
                    onChange={(e) => setPlayer4Name(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-orange focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !teamName.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Squad Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
