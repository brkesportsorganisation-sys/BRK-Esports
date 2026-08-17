'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Trophy, 
  Crown, 
  Check, 
  RefreshCw, 
  Trash2,
  Swords
} from 'lucide-react';

interface AdminTeam {
  id: string;
  name: string;
  tag: string;
  logo: string;
  captainId: string;
  captainName?: string;
  inviteCode?: string;
  matchesPlayed?: number;
  totalWins?: number;
  totalEarnings?: number;
  isVerified?: boolean;
  createdAt: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTeams = async () => {
    try {
      const res = await fetch('/api/teams');
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
    loadTeams();
  }, []);

  const filteredTeams = teams.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.tag?.toLowerCase().includes(q) ||
      t.captainName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Swords className="w-7 h-7 text-orange-500" />
              Squad Clans & Esports Rosters Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage permanent competitive Free Fire teams, verified clans, and registered rosters.
            </p>
          </div>

          <button
            onClick={loadTeams}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Clans
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Registered Squads</span>
            <div className="text-2xl font-black text-slate-900">{teams.length}</div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Active Competitive Clans</span>
            <div className="text-2xl font-black text-orange-600">{teams.length}</div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Clan Booyahs</span>
            <div className="text-2xl font-black text-amber-500">
              {teams.reduce((s, t) => s + (t.totalWins || 0), 0)}
            </div>
          </div>
        </div>

        {/* Clans Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Clan name or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:border-orange-500"
              />
            </div>
            <span className="text-xs text-slate-500">Showing {filteredTeams.length} clans</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading squad clans...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-16 text-center text-slate-400">No squad teams found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Clan / Squad Name</th>
                    <th className="px-4 py-3">Tag & Code</th>
                    <th className="px-4 py-3">Matches & Wins</th>
                    <th className="px-4 py-3">Earnings</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={team.logo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'}
                            alt={team.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{team.name}</div>
                            <div className="text-[10px] text-slate-400">Captain ID: {team.captainId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-mono font-bold text-[11px]">
                          [{team.tag}]
                        </span>
                        {team.inviteCode && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {team.inviteCode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-800 font-bold block">{team.matchesPlayed || 0} Matches</span>
                        <span className="text-[10px] text-amber-600 font-bold">{team.totalWins || 0} Booyahs</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-black text-emerald-600">৳{team.totalEarnings || 0}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {new Date(team.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
  );
}
