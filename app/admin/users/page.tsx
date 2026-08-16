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
  UserCheck
} from 'lucide-react';
import { db } from '@/lib/db';
import { User, Role } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fund Modal State
  const [fundModal, setFundModal] = useState<{ isOpen: boolean; userId: string; userName: string; type: 'WALLET' | 'COINS'; amount: number }>({
    isOpen: false,
    userId: '',
    userName: '',
    type: 'WALLET',
    amount: 100,
  });

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Live users load error:', err);
    }
    setUsers([...db.getUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleBanToggle = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isBanned: !target.isBanned }),
      });
    } catch (err) {
      console.warn('Ban toggle error:', err);
    }
    db.toggleBanUser(id);
    await refreshUsers();
  };

  const handleRoleChange = async (id: string, role: Role) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
    } catch (err) {
      console.warn('Role change error:', err);
    }
    db.updateUser(id, { role });
    await refreshUsers();
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.id === fundModal.userId);
    if (!targetUser) return;

    try {
      const updates: Record<string, any> = { id: fundModal.userId };
      if (fundModal.type === 'WALLET') {
        updates.walletBalance = targetUser.walletBalance + fundModal.amount;
      } else {
        updates.coinBalance = (targetUser.coinBalance || 0) + fundModal.amount;
      }
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Funds update error:', err);
    }

    if (fundModal.type === 'WALLET') {
      db.updateUser(fundModal.userId, { walletBalance: targetUser.walletBalance + fundModal.amount });
    } else {
      const currentCoins = targetUser.coinBalance || 0;
      db.updateUser(fundModal.userId, { coinBalance: currentCoins + fundModal.amount });
    }

    setFundModal({ ...fundModal, isOpen: false });
    await refreshUsers();
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.freeFireUid && u.freeFireUid.includes(searchQuery)) ||
    (u.accountNumber && u.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/50 text-brand-cyan flex items-center justify-center border border-cyan-800/40 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-white">
              PLAYER DIRECTORY & WALLET MANAGER
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect verified Free Fire accounts, adjust wallet balances, and manage player bans.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            Total Players: <span className="font-black text-white">{users.length}</span>
          </div>
          <button
            onClick={refreshUsers}
            className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by player name, email, Free Fire UID, or BRE-Account ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111827]/80 border border-slate-800/80 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan font-medium shadow-sm"
        />
      </div>

      {/* Users Table */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-brand-cyan">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="font-bold text-slate-200">No Players Found</div>
            <div className="text-xs">No user account matched your search query.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Player & App ID</th>
                  <th className="p-4">Free Fire Identity</th>
                  <th className="p-4">Wallet Balances</th>
                  <th className="p-4">Stats & Win Rate</th>
                  <th className="p-4">Role & Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
                          alt={u.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-slate-700 shadow-sm"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{u.name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                          <div className="text-[10px] font-mono text-brand-cyan font-bold">{u.accountNumber || 'BRE-XXXXXX'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-xs">
                      <div className="font-bold text-slate-200">{u.inGameName || 'No IGN'}</div>
                      <div className="text-slate-400 text-[11px]">UID: {u.freeFireUid || 'Not Set'}</div>
                    </td>

                    <td className="p-4 space-y-0.5">
                      <div className="font-heading font-black text-brand-gold text-base">
                        ৳ {(u.walletBalance || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {u.coinBalance || 0} Coins • Win: ৳{u.winningBalance || 0}
                      </div>
                    </td>

                    <td className="p-4 text-xs font-mono">
                      <div className="text-slate-300">Wins: <strong className="text-emerald-400">{u.totalWins || 0}</strong> • Kills: <strong className="text-brand-red">{u.totalKills || 0}</strong></div>
                      <div className="text-[10px] text-brand-gold">{u.winRate || (u.totalWins > 0 ? Math.min(100, Math.round((u.totalWins / Math.max(1, u.totalWins + 5)) * 100)) : 0)}% Win Rate</div>
                    </td>

                    <td className="p-4 space-y-1">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-300 focus:outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="VENDOR">VENDOR</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>

                      <div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                          u.isBanned ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {u.isBanned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setFundModal({ isOpen: true, userId: u.id, userName: u.name, type: 'WALLET', amount: 100 })}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-gold text-xs font-bold transition-colors flex items-center space-x-1 border border-slate-700"
                          title="Add Funds"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Fund</span>
                        </button>
                        <button
                          onClick={() => handleBanToggle(u.id)}
                          className={`p-1.5 rounded-xl transition-colors ${
                            u.isBanned ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800' : 'bg-red-950 hover:bg-red-900 text-red-400 border border-red-800'
                          }`}
                          title={u.isBanned ? 'Unban Player' : 'Ban Player'}
                        >
                          <Ban className="w-4 h-4" />
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

      {/* Fund Player Modal */}
      {fundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111827] rounded-3xl p-6 max-w-md w-full border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-xl text-white">ADJUST PLAYER BALANCE</h3>
              <button onClick={() => setFundModal({ ...fundModal, isOpen: false })} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleAddFunds} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                Player: <strong className="text-white">{fundModal.userName}</strong>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Currency Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'WALLET' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold ${
                      fundModal.type === 'WALLET' ? 'border-brand-orange bg-brand-orange/10 text-brand-orange' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Wallet (BDT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'COINS' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold ${
                      fundModal.type === 'COINS' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    <span>Coins</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Amount</label>
                <input
                  type="number"
                  value={fundModal.amount}
                  onChange={(e) => setFundModal({ ...fundModal, amount: Number(e.target.value) || 0 })}
                  required
                  min={1}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFundModal({ ...fundModal, isOpen: false })}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold"
                >
                  CONFIRM ADD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
