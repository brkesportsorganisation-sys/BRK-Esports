'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  Ban, 
  Edit3, 
  Wallet, 
  Coins, 
  Plus, 
  X, 
  Shield,
  Loader2,
  RefreshCw,
  Award,
  DollarSign,
  UserCheck,
  UserPlus,
  Copy,
  Check,
  Key
} from 'lucide-react';
import { User, Role } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fund Modal State
  const [fundModal, setFundModal] = useState<{ 
    isOpen: boolean; 
    userId: string; 
    userName: string; 
    playerUniqueId: string;
    type: 'WALLET' | 'COINS'; 
    amount: number 
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    playerUniqueId: '',
    type: 'WALLET',
    amount: 100,
  });
  const [fundProcessing, setFundProcessing] = useState(false);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        console.warn('Failed to fetch users from database');
      }
    } catch (err) {
      console.warn('Live users load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBanToggle = async (id: string, currentBanned: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, isBanned: !currentBanned }),
      });
      if (res.ok) {
        await refreshUsers();
      } else {
        const err = await res.json();
        alert(err.message || 'Ban toggle failed.');
      }
    } catch (err) {
      console.error('Ban toggle error:', err);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.id === fundModal.userId);
    if (!targetUser) return;

    setFundProcessing(true);
    try {
      const updates: Record<string, any> = { id: fundModal.userId };
      if (fundModal.type === 'WALLET') {
        updates.walletBalance = Number(targetUser.walletBalance || 0) + Number(fundModal.amount);
      } else {
        updates.coinBalance = Number(targetUser.coinBalance || 0) + Number(fundModal.amount);
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setFundModal({ ...fundModal, isOpen: false });
        await refreshUsers();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update user balance.');
      }
    } catch (err) {
      console.error('Fund add error:', err);
    } finally {
      setFundProcessing(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return roleFilter === 'ALL' || u.role === roleFilter;

    const matchesSearch = 
      u.name?.toLowerCase().includes(query) ||
      u.inGameName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.freeFireUid?.toLowerCase().includes(query) ||
      (u.accountNumber && u.accountNumber.toLowerCase().includes(query)) ||
      u.id?.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const bannedCount = users.filter((u) => u.isBanned).length;
  const activeCount = users.filter((u) => !u.isBanned).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Player Accounts & Verification
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Search by Player Unique ID, Free Fire UID, IGN or Email. Manage balances and account security.
          </p>
        </div>

        <button
          onClick={refreshUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
          <span>Refresh Players</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Registered Players</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{users.length}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Active Standing</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Banned / Suspended</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{bannedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-red-50 text-red-600 flex items-center justify-center">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search and Role Filter */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Player ID (BRK-...), Name, IGN, UID, or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'USER', 'ADMIN', 'MODERATOR', 'VENDOR'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === r
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#2563EB]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-[#64748B] space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-[#0F172A] text-base">No Players Found</div>
            <div className="text-xs">No player matches "{searchQuery}". Try searching by BRK Player ID or UID.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Player Unique ID</th>
                  <th className="py-3.5 px-5">Player Profile</th>
                  <th className="py-3.5 px-5">Free Fire UID & IGN</th>
                  <th className="py-3.5 px-5">Wallet & Coins</th>
                  <th className="py-3.5 px-5">Game Stats</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredUsers.map((u) => {
                  const playerUid = u.accountNumber || `BRK-${u.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
                  return (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Player Unique ID Column */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-1.5 bg-orange-50/80 border border-orange-200 text-orange-800 px-2.5 py-1 rounded-xl font-mono text-xs font-black shadow-2xs">
                          <span>{playerUid}</span>
                          <button
                            onClick={() => handleCopyId(playerUid)}
                            className="p-0.5 hover:bg-orange-100 rounded text-orange-600 transition-colors cursor-pointer"
                            title="Copy Player Unique ID"
                          >
                            {copiedId === playerUid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Player Profile Column */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] font-bold flex items-center justify-center text-xs border border-blue-100 flex-shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              u.name?.charAt(0).toUpperCase() || 'P'
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#0F172A] text-xs truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.role === 'ADMIN' && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-100">ADMIN</span>
                              )}
                              {u.role === 'MODERATOR' && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-600 text-[9px] font-bold border border-purple-100">MOD</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Free Fire UID & IGN */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs font-bold text-[#0F172A] flex items-center gap-1">
                            <span>UID:</span>
                            <span className="text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100 font-mono">
                              {u.freeFireUid || 'Not Linked'}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-600">
                            IGN: <strong className="text-slate-900">{u.inGameName || u.name}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Wallet & Coins */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5 text-xs">
                          <div className="font-bold text-[#059669]">
                            ৳ {Number(u.walletBalance || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-amber-600 font-semibold">
                            🪙 {Number(u.coinBalance || 0).toLocaleString()} Coins
                          </div>
                        </div>
                      </td>

                      {/* Game Stats */}
                      <td className="py-4 px-5 text-xs text-[#64748B]">
                        <div>Kills: <strong className="text-[#0F172A]">{u.totalKills || 0}</strong></div>
                        <div>Wins: <strong className="text-[#059669]">{u.totalWins || 0}</strong></div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          u.isBanned
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                        }`}>
                          {u.isBanned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setFundModal({ 
                              isOpen: true, 
                              userId: u.id, 
                              userName: u.name, 
                              playerUniqueId: playerUid,
                              type: 'WALLET', 
                              amount: 100 
                            })}
                            className="px-2.5 py-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Add Funds"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Funds</span>
                          </button>

                          <button
                            onClick={() => handleBanToggle(u.id, Boolean(u.isBanned))}
                            className={`p-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${
                              u.isBanned
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                            title={u.isBanned ? 'Unban Player' : 'Ban Player'}
                          >
                            {u.isBanned ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Fund Balance Modal */}
      {fundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-[#E2E8F0] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Adjust Player Balance</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Target: <strong>{fundModal.userName}</strong> ({fundModal.playerUniqueId})
                </p>
              </div>
              <button
                onClick={() => setFundModal({ ...fundModal, isOpen: false })}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase block mb-1.5">Balance Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'WALLET' })}
                    className={`py-2 px-3 rounded-[12px] text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      fundModal.type === 'WALLET'
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Wallet (৳ BDT)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'COINS' })}
                    className={`py-2 px-3 rounded-[12px] text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      fundModal.type === 'COINS'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Coins</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#475569] uppercase block mb-1.5">Amount to Credit</label>
                <input
                  type="number"
                  min="1"
                  value={fundModal.amount}
                  onChange={(e) => setFundModal({ ...fundModal, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setFundModal({ ...fundModal, isOpen: false })}
                  className="flex-1 py-2.5 rounded-[12px] bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fundProcessing}
                  className="flex-1 py-2.5 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {fundProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Credit Amount</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
