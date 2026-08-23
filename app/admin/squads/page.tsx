'use client';

import React, { useState, useEffect } from 'react';
import { Squad, SquadMember } from '@/lib/types';
import { 
  ShieldCheck, 
  Users, 
  Search, 
  Loader2, 
  Trash2, 
  Edit3, 
  Crown, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  Zap,
  Eye,
  Filter
} from 'lucide-react';
import Link from 'next/link';

export default function AdminSquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [stats, setStats] = useState<any>({ totalSquads: 0, totalMembers: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');

  // Roster Modal
  const [viewingSquad, setViewingSquad] = useState<Squad | null>(null);

  // Edit/Moderate Modal
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadAdminSquads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/squads');
      if (res.ok) {
        const data = await res.json();
        setSquads(data.squads || []);
        setStats(data.stats || { totalSquads: 0, totalMembers: 0 });
      }
    } catch (err) {
      console.warn('Failed to load squads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminSquads();
  }, []);

  const handleDisbandSquad = async (squad: Squad) => {
    if (!confirm(`ADMIN ACTION: Are you sure you want to permanently disband [${squad.tag}] ${squad.name}?`)) return;

    try {
      const res = await fetch('/api/admin/squads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId: squad.id,
          action: 'DISBAND',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadAdminSquads();
      } else {
        alert(data.message || 'Failed to disband squad.');
      }
    } catch {
      alert('Error disbanding squad.');
    }
  };

  const handleSaveModerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSquad) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/squads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId: editingSquad.id,
          name: editName.trim(),
          tag: editTag.trim().toUpperCase(),
          logoUrl: editLogo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Squad updated successfully!');
        setEditingSquad(null);
        loadAdminSquads();
      } else {
        alert(data.message || 'Failed to update squad.');
      }
    } catch {
      alert('Error updating squad.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSquads = squads.filter(s => {
    const matchesGame = gameFilter === 'ALL' || s.game === gameFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesGame;

    const matchesSquad = s.name.toLowerCase().includes(q) || s.tag.toLowerCase().includes(q) || s.leaderName.toLowerCase().includes(q);
    const matchesMember = (s.members || []).some(m => 
      m.userName.toLowerCase().includes(q) || 
      (m.accountNumber && m.accountNumber.toLowerCase().includes(q)) ||
      (m.freeFireUid && m.freeFireUid.includes(q))
    );

    return matchesGame && (matchesSquad || matchesMember);
  });

  return (
    <div className="space-y-6 pb-12">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-amber-500" />
              <span>Squad & Clan Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage user-created esports squads, view rosters for player dispute resolution, and moderate names/logos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-amber-800">Total Squads</div>
              <div className="text-lg font-black text-amber-600">{stats.totalSquads}</div>
            </div>
            <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-blue-800">Active Players</div>
              <div className="text-lg font-black text-blue-600">{stats.totalMembers}</div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Squad Name, Tag, Player Name, UID or Account No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Games</option>
              <option value="FREE_FIRE">Free Fire</option>
              <option value="PUBG_MOBILE">PUBG Mobile</option>
              <option value="VALORANT">Valorant</option>
              <option value="MLBB">MLBB</option>
              <option value="EFOOTBALL">eFootball</option>
            </select>
          </div>
        </div>

        {/* Squads Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold mt-2">Loading squad records...</p>
            </div>
          ) : filteredSquads.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 font-medium">
              No squads found matching query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Squad Info</th>
                    <th className="px-4 py-3.5">Game</th>
                    <th className="px-4 py-3.5">Leader</th>
                    <th className="px-4 py-3.5">Active Roster</th>
                    <th className="px-4 py-3.5">Stats</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSquads.map((squad) => {
                    const activeRoster = (squad.members || []).filter(m => m.status === 'ACTIVE');

                    return (
                      <tr key={squad.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={squad.logoUrl} alt={squad.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono text-[10px] font-black border border-amber-200">
                                  [{squad.tag}]
                                </span>
                                <div className="font-bold text-slate-900 text-sm">{squad.name}</div>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {squad.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                            {squad.game}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{squad.leaderName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {squad.leaderId}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setViewingSquad(squad)}
                            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Users className="w-3.5 h-3.5 text-amber-600" />
                            <span>{activeRoster.length} Players</span>
                          </button>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                          <div>Matches: <strong>{squad.matchesPlayed}</strong></div>
                          <div>Wins: <strong className="text-emerald-600">{squad.matchesWon}</strong></div>
                        </td>

                        <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingSquad(squad);
                              setEditName(squad.name);
                              setEditTag(squad.tag);
                              setEditLogo(squad.logoUrl);
                            }}
                            className="p-2 text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                            title="Edit / Moderate Squad"
                          >
                            <Edit3 className="w-4 h-4 inline" />
                          </button>

                          <button
                            onClick={() => handleDisbandSquad(squad)}
                            className="p-2 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Disband Squad"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ════════════ MODAL 1: VIEW ROSTER (DISPUTE RESOLUTION) ════════════ */}
        {viewingSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img src={viewingSquad.logoUrl} alt={viewingSquad.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">[{viewingSquad.tag}] {viewingSquad.name}</h3>
                  <p className="text-xs text-slate-500">Official Roster & Player Account Records</p>
                </div>
              </div>
              <button
                onClick={() => setViewingSquad(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {(viewingSquad.members || []).map((m) => (
                <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={m.userAvatar} alt={m.userName} className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{m.userName}</span>
                        {m.isLeader && <span title="Leader">👑</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">Account No: <strong>{m.accountNumber || 'N/A'}</strong></div>
                      {m.freeFireUid && (
                        <div className="text-[11px] text-emerald-700 font-mono">Game UID: <strong>{m.freeFireUid}</strong></div>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase block">
                      {m.inGameRole || 'PLAYER'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold block ${m.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      ● {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingSquad(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 2: MODERATE SQUAD ════════════ */}
      {editingSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-black text-lg text-slate-900">Moderate Squad Info</h3>
              <button onClick={() => setEditingSquad(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveModerate} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Tag *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-black uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Logo URL *</label>
                <input
                  type="url"
                  required
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSquad(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
