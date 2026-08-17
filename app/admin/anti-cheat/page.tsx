'use client';

import React, { useState, useEffect } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  UserX, 
  Search, 
  Ban, 
  Check, 
  Trash2, 
  RefreshCw,
  Lock,
  Unlock,
  Loader2
} from 'lucide-react';
import { User } from '@/lib/types';

export default function AdminAntiCheatPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [banModalUser, setBanModalUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('Fraudulent transaction submission / Multi-account violation');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.warn('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleBanToggle = async (userId: string, isCurrentlyBanned: boolean) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: isCurrentlyBanned ? 'UNBAN' : 'BAN',
          banReason: isCurrentlyBanned ? null : banReason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setBanModalUser(null);
        loadUsers();
      } else {
        alert(data.message || 'Failed to update ban status.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating user.');
    } finally {
      setIsProcessing(false);
    }
  };

  const bannedUsers = users.filter(u => u.isBanned);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.freeFireUid?.toLowerCase().includes(q) ||
      u.inGameName?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-red-600" />
              Anti-Cheat & Fraud Detection Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Monitor suspicious player behavior, manage account bans, and ensure 100% tournament fairness.
            </p>
          </div>

          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Radar
          </button>
        </div>

        {/* Security Radar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-red-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-600 uppercase">Suspended / Banned Accounts</span>
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-700">{bannedUsers.length}</div>
            <p className="text-[10px] text-slate-400">Total restricted players across platform</p>
          </div>

          <div className="p-5 bg-white border border-emerald-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Active Clean Players</span>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{users.length - bannedUsers.length}</div>
            <p className="text-[10px] text-slate-400">Verified and trusted player accounts</p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">WAF Firewall Status</span>
              <Lock className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-xl font-black text-indigo-600">ONLINE (100%)</div>
            <p className="text-[10px] text-slate-400">SQLi, XSS, and Rate Limit active</p>
          </div>
        </div>

        {/* Players List Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search player by name, email, or FF UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:border-red-500"
              />
            </div>
            <span className="text-xs text-slate-500">Showing {filteredUsers.length} players</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading accounts radar...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Player Account</th>
                    <th className="px-4 py-3">In-Game Name & UID</th>
                    <th className="px-4 py-3">Wallet & Earnings</th>
                    <th className="px-4 py-3">Security Status</th>
                    <th className="px-4 py-3 text-right">Ban / Unban Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{user.inGameName || 'No IGN'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">UID: {user.freeFireUid || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800">Wallet: <strong>৳{user.walletBalance || 0}</strong></div>
                        <div className="text-[10px] text-emerald-600 font-bold">Earned: ৳{user.earnings || 0}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        {user.isBanned ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <Ban className="w-3 h-3" />
                            BANNED: {user.banReason || 'Suspended'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3 h-3" />
                            CLEAN
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {user.isBanned ? (
                          <button
                            onClick={() => handleBanToggle(user.id, true)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
                          >
                            Unban Account
                          </button>
                        ) : (
                          <button
                            onClick={() => setBanModalUser(user)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all"
                          >
                            Ban Account
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

      {/* Ban Reason Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Ban Player: {banModalUser.name}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Reason for Suspension</label>
              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleBanToggle(banModalUser.id, false)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
