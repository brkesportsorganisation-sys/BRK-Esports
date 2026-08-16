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
  UserPlus
} from 'lucide-react';
import { User, Role } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Fund Modal State
  const [fundModal, setFundModal] = useState<{ isOpen: boolean; userId: string; userName: string; type: 'WALLET' | 'COINS'; amount: number }>({
    isOpen: false,
    userId: '',
    userName: '',
    type: 'WALLET',
    amount: 100,
  });
  const [fundProcessing, setFundProcessing] = useState(false);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
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
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      u.name?.toLowerCase().includes(query) ||
      u.inGameName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.freeFireUid?.toLowerCase().includes(query);
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
            Search players, manage balances, adjust roles, and enforce platform anti-cheat bans.
          </p>
        </div>

        <button
          onClick={refreshUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all"
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
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, IGN, UID, or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'USER', 'ADMIN', 'MODERATOR', 'VENDOR'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
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
            <div className="text-xs">Try adjusting your search query or filter.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Player Profile</th>
                  <th className="py-3.5 px-5">Free Fire UID</th>
                  <th className="py-3.5 px-5">Wallet & Coins</th>
                  <th className="py-3.5 px-5">Game Stats</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] font-bold flex items-center justify-center text-xs border border-blue-100 flex-shrink-0">
                          {u.name?.charAt(0).toUpperCase() || 'P'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[#0F172A] text-xs truncate flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.role === 'ADMIN' && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-100">ADMIN</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate">{u.email}</div>
                          <div className="text-[10px] font-semibold text-[#2563EB] truncate">IGN: {u.inGameName || 'N/A'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-mono text-xs font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded">
                        {u.freeFireUid || 'Not Linked'}
                      </span>
                    </td>

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

                    <td className="py-4 px-5 text-xs text-[#64748B]">
                      <div>Kills: <strong className="text-[#0F172A]">{u.totalKills || 0}</strong></div>
                      <div>Wins: <strong className="text-[#059669]">{u.totalWins || 0}</strong></div>
                    </td>

                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        u.isBanned
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                      }`}>
                        {u.isBanned ? 'BANNED' : 'ACTIVE'}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setFundModal({ isOpen: true, userId: u.id, userName: u.name, type: 'WALLET', amount: 100 })}
                          className="px-2.5 py-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold flex items-center space-x-1 transition-colors"
                          title="Add Funds"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Funds</span>
                        </button>

                        <button
                          onClick={() => handleBanToggle(u.id, Boolean(u.isBanned))}
                          className={`p-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Fund Balance Modal */}
      {fundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-[#E2E8F0] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0F172A]">Adjust Player Balance</h3>
              <button 
                onClick={() => setFundModal({ ...fundModal, isOpen: false })} 
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Credit or debit funds for player <strong className="text-[#0F172A]">{fundModal.userName}</strong>.
            </p>

            <form onSubmit={handleAddFunds} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[#475569] mb-1.5 font-semibold">Balance Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'WALLET' })}
                    className={`py-2 rounded-[10px] font-semibold text-xs transition-colors ${
                      fundModal.type === 'WALLET'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    BDT Wallet (৳)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'COINS' })}
                    className={`py-2 rounded-[10px] font-semibold text-xs transition-colors ${
                      fundModal.type === 'COINS'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    Reward Coins (🪙)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#475569] mb-1.5 font-semibold">Amount to Add (৳ / Coins)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={fundModal.amount}
                  onChange={(e) => setFundModal({ ...fundModal, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFundModal({ ...fundModal, isOpen: false })}
                  className="w-1/2 py-2.5 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-[#475569] font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fundProcessing}
                  className="w-1/2 py-2.5 rounded-[12px] bg-[#059669] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  {fundProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{fundProcessing ? 'Updating...' : 'Confirm Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
