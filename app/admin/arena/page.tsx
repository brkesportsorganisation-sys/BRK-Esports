'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { 
  Swords, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trophy, 
  Coins, 
  DollarSign, 
  ShieldCheck, 
  RefreshCw, 
  RotateCcw,
  Loader2
} from 'lucide-react';
import { DuelChallenge } from '@/lib/types';

export default function AdminArenaPage() {
  const [duels, setDuels] = useState<DuelChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadDuels = async () => {
    try {
      const res = await fetch('/api/admin/arena');
      if (res.ok) {
        const data = await res.json();
        setDuels(data.duels || []);
      }
    } catch (err) {
      console.warn('Failed to load duels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDuels();
  }, []);

  const handleResolveWinner = async (duelId: string, winnerId: string, winnerName: string) => {
    if (!confirm(`Award 1v1 match victory and release prize pot to "${winnerName}"?`)) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/arena', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          action: 'AWARD_WINNER',
          winnerId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        loadDuels();
      } else {
        alert(data.message || 'Failed to award winner.');
      }
    } catch (err: any) {
      alert(err.message || 'Error resolving duel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async (duelId: string) => {
    if (!confirm('Cancel this duel and refund entry stakes back to both players?')) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/arena', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          action: 'REFUND',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        loadDuels();
      } else {
        alert(data.message || 'Failed to refund duel.');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing refund.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalEscrow = duels
    .filter(d => d.status === 'IN_PROGRESS' || d.status === 'OPEN')
    .reduce((sum, d) => sum + (d.stakeType === 'BDT' ? d.entryFee * (d.status === 'IN_PROGRESS' ? 2 : 1) : 0), 0);

  const filteredDuels = duels.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.creatorName?.toLowerCase().includes(q) ||
      d.creatorIgn?.toLowerCase().includes(q) ||
      d.challengerName?.toLowerCase().includes(q) ||
      d.challengerIgn?.toLowerCase().includes(q) ||
      d.mode?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Swords className="w-7 h-7 text-red-500" />
              1v1 & 2v2 Duel Arena Monitor
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Monitor active 1v1 challenges, escrow funds, and resolve match disputes with 1-click payouts.
            </p>
          </div>

          <button
            onClick={loadDuels}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Arena
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Live Escrow Locked</span>
            <div className="text-2xl font-black text-emerald-600">৳ {totalEscrow.toLocaleString()}</div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Active Duels</span>
            <div className="text-2xl font-black text-red-600">
              {duels.filter(d => d.status === 'IN_PROGRESS').length}
            </div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Open Challenges</span>
            <div className="text-2xl font-black text-amber-500">
              {duels.filter(d => d.status === 'OPEN').length}
            </div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Completed</span>
            <div className="text-2xl font-black text-slate-900">
              {duels.filter(d => d.status === 'COMPLETED').length}
            </div>
          </div>
        </div>

        {/* Challenges Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by player IGN, mode, or rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:border-red-500"
              />
            </div>
            <span className="text-xs text-slate-500">Showing {filteredDuels.length} matches</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading duel arena matches...</div>
          ) : filteredDuels.length === 0 ? (
            <div className="p-16 text-center text-slate-400">No duel matches found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Match Mode</th>
                    <th className="px-4 py-3">Host Player</th>
                    <th className="px-4 py-3">Challenger</th>
                    <th className="px-4 py-3">Stake & Pot</th>
                    <th className="px-4 py-3">Room ID & Pass</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Resolve Winner / Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDuels.map((duel) => (
                    <tr key={duel.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{duel.mode.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400">{duel.customRules}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{duel.creatorIgn}</div>
                        <div className="text-[10px] text-slate-400 font-mono">UID: {duel.creatorUid}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{duel.challengerIgn || 'Waiting...'}</div>
                        {duel.challengerUid && (
                          <div className="text-[10px] text-slate-400 font-mono">UID: {duel.challengerUid}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">
                          Entry: {duel.stakeType === 'COINS' ? `${duel.entryFee} 🪙` : `৳${duel.entryFee}`}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-black">
                          Pot: {duel.stakeType === 'COINS' ? `${duel.prizePool} 🪙` : `৳${duel.prizePool}`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {duel.roomId ? (
                          <div className="font-mono text-[11px] text-slate-700">
                            <div>ID: <strong>{duel.roomId}</strong></div>
                            <div>Pass: <strong>{duel.roomPass}</strong></div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending Match</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          duel.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : duel.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-700 animate-pulse'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {duel.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {duel.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              onClick={() => handleResolveWinner(duel.id, duel.creatorId, duel.creatorIgn)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold"
                            >
                              Host Won 👑
                            </button>
                            {duel.challengerId && (
                              <button
                                onClick={() => handleResolveWinner(duel.id, duel.challengerId!, duel.challengerIgn!)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold"
                              >
                                Opponent Won 👑
                              </button>
                            )}
                            <button
                              onClick={() => handleRefund(duel.id)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-bold"
                            >
                              Refund Both
                            </button>
                          </>
                        )}
                        {duel.status === 'OPEN' && (
                          <button
                            onClick={() => handleRefund(duel.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold"
                          >
                            Cancel & Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  );
}
