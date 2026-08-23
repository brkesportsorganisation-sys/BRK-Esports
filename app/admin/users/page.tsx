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
  Key,
  Trophy,
  Activity,
  Flame,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  Eye,
  TrendingUp,
  Percent,
  Gamepad2,
  AlertCircle,
  ArrowUpRight,
  User as UserIcon,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { User, Role } from '@/lib/types';

interface EnrichedUser extends User {
  accountNumber?: string;
  tournamentsJoined?: Array<{
    id: string;
    tournamentId: string;
    tournamentTitle: string;
    game: string;
    mode: string;
    entryFee: number;
    prizePool: number;
    tournamentStatus: string;
    squadName: string;
    iglName: string;
    captainWhatsApp?: string;
    status: string;
    joinedAt: string;
  }>;
  totalTournamentsPlayed?: number;
  totalDeposits?: number;
  totalSpent?: number;
  isOnline?: boolean;
  lastActive?: string;
  interactionTier?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ONLINE' | 'ACTIVE_TOURNAMENTS' | 'HIGH_BALANCE' | 'BANNED'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // User Dossier Inspection Modal
  const [inspectUser, setInspectUser] = useState<EnrichedUser | null>(null);
  const [inspectTab, setInspectTab] = useState<'FINANCIALS' | 'TOURNAMENTS' | 'STATS' | 'ADMIN_CONTROLS'>('TOURNAMENTS');

  // Balance Adjustment Modal State
  const [fundModal, setFundModal] = useState<{ 
    isOpen: boolean; 
    userId: string; 
    userName: string; 
    playerUniqueId: string;
    type: 'WALLET' | 'COINS' | 'PROMO' | 'WINNING'; 
    amount: number;
    action: 'ADD' | 'SET';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    playerUniqueId: '',
    type: 'WALLET',
    amount: 100,
    action: 'ADD',
  });
  const [fundProcessing, setFundProcessing] = useState(false);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (inspectUser) {
          const updated = (data.users || []).find((u: EnrichedUser) => u.id === inspectUser.id);
          if (updated) setInspectUser(updated);
        }
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
    const actionName = currentBanned ? 'Unban' : 'Ban';
    if (!confirm(`Are you sure you want to ${actionName.toUpperCase()} this user?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, isBanned: !currentBanned }),
      });
      const data = await res.json();
      if (res.ok) {
        // Immediately update inspect modal state if open
        setInspectUser((prev) => (prev && prev.id === id ? { ...prev, isBanned: !currentBanned } : prev));
        // Immediately update user list in table
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBanned: !currentBanned } : u)));
        alert(`Player account has been ${!currentBanned ? 'BANNED' : 'UNBANNED'} successfully in the database.`);
        await refreshUsers();
      } else {
        alert(data.message || 'Ban toggle failed.');
      }
    } catch (err) {
      console.error('Ban toggle error:', err);
      alert('Network error while toggling ban status.');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundModal.userId || fundModal.amount === undefined) return;

    setFundProcessing(true);
    const targetUser = users.find((u) => u.id === fundModal.userId);
    if (!targetUser) return;

    let updatePayload: Record<string, any> = { id: fundModal.userId };

    const amountNum = Number(fundModal.amount) || 0;

    if (fundModal.type === 'WALLET') {
      const current = Number(targetUser.walletBalance) || 0;
      updatePayload.walletBalance = fundModal.action === 'ADD' ? current + amountNum : amountNum;
    } else if (fundModal.type === 'PROMO') {
      const current = Number(targetUser.promoBalance) || 0;
      updatePayload.promoBalance = fundModal.action === 'ADD' ? current + amountNum : amountNum;
    } else if (fundModal.type === 'WINNING') {
      const current = Number(targetUser.winningBalance) || 0;
      updatePayload.winningBalance = fundModal.action === 'ADD' ? current + amountNum : amountNum;
    } else if (fundModal.type === 'COINS') {
      const current = Number(targetUser.coinBalance) || 0;
      updatePayload.coinBalance = fundModal.action === 'ADD' ? current + amountNum : amountNum;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      });

      if (res.ok) {
        alert('User balance updated successfully!');
        setFundModal((prev) => ({ ...prev, isOpen: false }));
        await refreshUsers();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update balance.');
      }
    } catch {
      alert('Operation failed.');
    } finally {
      setFundProcessing(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.inGameName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.freeFireUid?.toLowerCase().includes(q) ||
      u.accountNumber?.toLowerCase().includes(q);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    if (!matchesSearch || !matchesRole) return false;

    if (filterTab === 'ONLINE') return u.isOnline;
    if (filterTab === 'ACTIVE_TOURNAMENTS') return (u.totalTournamentsPlayed || 0) > 0;
    if (filterTab === 'HIGH_BALANCE') return (u.walletBalance || 0) >= 500 || (u.coinBalance || 0) >= 2000;
    if (filterTab === 'BANNED') return u.isBanned;

    return true;
  });

  const totalUsers = users.length;
  const onlineUsers = users.filter((u) => u.isOnline).length;
  const totalWalletSystem = users.reduce((sum, u) => sum + (Number(u.walletBalance) || 0), 0);
  const totalCoinsSystem = users.reduce((sum, u) => sum + (Number(u.coinBalance) || 0), 0);
  const totalTournamentsJoinedAll = users.reduce((sum, u) => sum + (u.totalTournamentsPlayed || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* 1. Header Banner */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 leading-tight">
                USER ACTIVITY & FINANCIAL AUDIT HUB
              </h1>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE RADAR
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track real-time online players, tournaments played, wallet balances (BDT ৳ / Coins 🪙), and user interaction history.
            </p>
          </div>
        </div>

        <button
          onClick={refreshUsers}
          disabled={loading}
          className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh Live</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Total Registered Players */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Players</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalUsers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Live Online Right Now */}
        <div className="bg-white border border-emerald-200/80 p-5 rounded-[20px] shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Online Now</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{onlineUsers} Active</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Total System Wallet BDT */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Wallet BDT</div>
            <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">৳ {totalWalletSystem.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Coins in Circulation */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coins Circulating</div>
            <div className="text-2xl font-black text-amber-600 mt-1 font-mono">🪙 {totalCoinsSystem.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Filter Bar and Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by IGN, Name, Phone, Free Fire UID, Account ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        {/* Quick Activity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto text-xs font-semibold">
          {[
            { key: 'ALL', label: `All (${users.length})` },
            { key: 'ONLINE', label: `Online (${onlineUsers}) 🟢` },
            { key: 'ACTIVE_TOURNAMENTS', label: `Tournament Players 🎮` },
            { key: 'HIGH_BALANCE', label: `High Balance 💎` },
            { key: 'BANNED', label: `Banned 🚫` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-800 text-base">No Users Found</div>
            <div className="text-xs text-slate-400">Try adjusting your search or filter options.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-4 px-5">Player Profile & Status</th>
                  <th className="py-4 px-5">Free Fire IGN & UID</th>
                  <th className="py-4 px-5">Wallet & Coin Balances</th>
                  <th className="py-4 px-5">Tournaments Played</th>
                  <th className="py-4 px-5">Player Performance</th>
                  <th className="py-4 px-5">Interaction Badge</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const tournamentsCount = u.tournamentsJoined?.length || 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Player Profile & Status */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={u.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                            />
                            {u.isOnline ? (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" title="Online Now" />
                            ) : (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" title="Offline" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.isBanned && (
                                <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <span>{u.accountNumber || u.id}</span>
                              <button
                                onClick={() => handleCopyId(u.accountNumber || u.id)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                title="Copy ID"
                              >
                                {copiedId === (u.accountNumber || u.id) ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.isOnline ? (
                                <span className="text-emerald-600 font-bold">🟢 Active right now</span>
                              ) : (
                                <span>Last seen: {new Date(u.lastActive || u.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IGN & UID */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                            <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{u.inGameName || 'No IGN'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            UID: <strong className="text-slate-700">{u.freeFireUid || '-'}</strong>
                          </div>
                          {u.phone && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Balances */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs font-black text-slate-900 font-mono">
                            <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                            <span>৳ {(u.walletBalance || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 font-mono">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>🪙 {(u.coinBalance || 0).toLocaleString()}</span>
                          </div>
                          {(u.promoBalance || u.winningBalance) ? (
                            <div className="text-[9px] text-slate-400 space-x-1 font-mono">
                              <span>Promo: ৳{u.promoBalance || 0}</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">Win: ৳{u.winningBalance || 0}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Tournaments Played */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <button
                            onClick={() => { setInspectUser(u); setInspectTab('TOURNAMENTS'); }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              tournamentsCount > 0
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <Trophy className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{tournamentsCount} Tournament{tournamentsCount !== 1 ? 's' : ''}</span>
                          </button>
                          
                          {tournamentsCount > 0 && u.tournamentsJoined && u.tournamentsJoined.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                              Latest: <strong>{u.tournamentsJoined[0].tournamentTitle}</strong>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Player Performance */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5 text-xs font-mono">
                          <div className="text-slate-700">
                            Kills: <strong className="text-slate-900 font-bold">{u.totalKills || 0}</strong>
                          </div>
                          <div className="text-slate-700">
                            Wins: <strong className="text-emerald-600 font-bold">{u.totalWins || 0}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Total Earned: ৳{u.earnings || 0}
                          </div>
                        </div>
                      </td>

                      {/* Interaction Badge */}
                      <td className="py-4 px-5">
                        {u.interactionTier === 'PRO_CHAMPION' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase shadow-xs">
                            <Sparkles className="w-3 h-3" />
                            <span>Pro Champion</span>
                          </span>
                        ) : u.interactionTier === 'HIGH_ROLLER' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-100 text-violet-800 text-[10px] font-black uppercase">
                            <DollarSign className="w-3 h-3" />
                            <span>High Roller</span>
                          </span>
                        ) : u.interactionTier === 'ACTIVE_GAMER' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                            <Flame className="w-3 h-3 text-emerald-600" />
                            <span>Active Gamer</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            <span>Casual</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Inspect Full Dossier */}
                          <button
                            onClick={() => { setInspectUser(u); setInspectTab('TOURNAMENTS'); }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Inspect User Activity Dossier"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                          </button>

                          {/* Quick Adjust Balance */}
                          <button
                            onClick={() => setFundModal({
                              isOpen: true,
                              userId: u.id,
                              userName: u.name,
                              playerUniqueId: u.accountNumber || u.id,
                              type: 'WALLET',
                              amount: 100,
                              action: 'ADD',
                            })}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Adjust Balance / Coins"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Direct */}
                          {u.phone && (
                            <a
                              href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                              title="Direct WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                            </a>
                          )}

                          {/* Ban / Unban */}
                          <button
                            onClick={() => handleBanToggle(u.id, u.isBanned)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              u.isBanned
                                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                : 'bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600'
                            }`}
                            title={u.isBanned ? 'Unban Player' : 'Ban Player'}
                          >
                            <Ban className="w-4 h-4" />
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

      {/* 5. User Activity Dossier Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={inspectUser.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'}
                    alt={inspectUser.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                  {inspectUser.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-xl text-slate-900">{inspectUser.name}</h3>
                    {inspectUser.isBanned ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] uppercase border border-red-200 flex items-center gap-1">
                        <Ban className="w-3 h-3" />
                        <span>BANNED FROM PLATFORM</span>
                      </span>
                    ) : inspectUser.isOnline ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                        ONLINE NOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 font-mono">
                    <span>{inspectUser.accountNumber || inspectUser.id}</span>
                    <span>•</span>
                    <span>{inspectUser.email}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
              {[
                { key: 'TOURNAMENTS', label: `Tournaments Played (${inspectUser.tournamentsJoined?.length || 0})` },
                { key: 'FINANCIALS', label: 'Wallet & Balances' },
                { key: 'STATS', label: 'Match Performance & Stats' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setInspectTab(tab.key as any)}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    inspectTab === tab.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Tournaments Played */}
            {inspectTab === 'TOURNAMENTS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-black text-sm text-slate-900">
                    Tournaments History & Squad Matches
                  </h4>
                  <span className="text-xs text-slate-500">{inspectUser.tournamentsJoined?.length || 0} Total Tournaments</span>
                </div>

                {!inspectUser.tournamentsJoined || inspectUser.tournamentsJoined.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs space-y-2 bg-slate-50 rounded-2xl">
                    <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">No Tournaments Played Yet</p>
                    <p>This user has not joined any tournament matches so far.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {inspectUser.tournamentsJoined.map((tour) => (
                      <div
                        key={tour.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{tour.tournamentTitle}</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold">
                              {tour.mode}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            Squad: <strong className="text-slate-800">{tour.squadName}</strong> (IGL: {tour.iglName})
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Joined: {new Date(tour.joinedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between gap-1 text-right">
                          <span className="font-mono font-bold text-indigo-600">Fee: ৳{tour.entryFee}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            {tour.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Financials & Balance Breakdown */}
            {inspectTab === 'FINANCIALS' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1">
                    <div className="text-[10px] font-bold text-indigo-600 uppercase">Total Wallet</div>
                    <div className="text-xl font-black text-indigo-900 font-mono">৳ {(inspectUser.walletBalance || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-1">
                    <div className="text-[10px] font-bold text-amber-600 uppercase">Coins Balance</div>
                    <div className="text-xl font-black text-amber-900 font-mono">🪙 {(inspectUser.coinBalance || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Winning Wallet</div>
                    <div className="text-xl font-black text-emerald-900 font-mono">৳ {(inspectUser.winningBalance || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-1">
                    <div className="text-[10px] font-bold text-purple-600 uppercase">Promo Wallet</div>
                    <div className="text-xl font-black text-purple-900 font-mono">৳ {(inspectUser.promoBalance || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Quick Adjust User Balance</div>
                    <p className="text-[11px] text-slate-500">Credit or debit Wallet BDT / Coins directly.</p>
                  </div>
                  <button
                    onClick={() => setFundModal({
                      isOpen: true,
                      userId: inspectUser.id,
                      userName: inspectUser.name,
                      playerUniqueId: inspectUser.accountNumber || inspectUser.id,
                      type: 'WALLET',
                      amount: 100,
                      action: 'ADD',
                    })}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Adjust Balance
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Match Performance & Stats */}
            {inspectTab === 'STATS' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Kills</div>
                    <div className="text-2xl font-black text-slate-900">{inspectUser.totalKills || 0}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Match Wins</div>
                    <div className="text-2xl font-black text-emerald-600">{inspectUser.totalWins || 0}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Lifetime Earnings</div>
                    <div className="text-2xl font-black text-indigo-600">৳ {inspectUser.earnings || 0}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Tournaments Joined</div>
                    <div className="text-2xl font-black text-amber-600">{inspectUser.totalTournamentsPlayed || 0}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">Gaming Credentials</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Free Fire UID:</span>
                      <strong className="text-slate-900 font-mono text-sm">{inspectUser.freeFireUid || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">In-Game Name (IGN):</span>
                      <strong className="text-slate-900 text-sm">{inspectUser.inGameName || '-'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleBanToggle(inspectUser.id, inspectUser.isBanned)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  inspectUser.isBanned
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                {inspectUser.isBanned ? 'Unban Player Account' : 'Ban Player Account'}
              </button>

              <button
                onClick={() => setInspectUser(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. Balance Adjustment Modal */}
      {fundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">
                  Adjust Balance: {fundModal.userName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{fundModal.playerUniqueId}</p>
              </div>
              <button
                onClick={() => setFundModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-slate-700 font-bold mb-1">Currency Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'WALLET', label: 'Main Wallet (৳)' },
                    { key: 'COINS', label: 'Coins (🪙)' },
                    { key: 'WINNING', label: 'Winning Wallet (৳)' },
                    { key: 'PROMO', label: 'Promo Wallet (৳)' },
                  ].map((cur) => (
                    <button
                      key={cur.key}
                      type="button"
                      onClick={() => setFundModal((prev) => ({ ...prev, type: cur.key as any }))}
                      className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                        fundModal.type === cur.key
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {cur.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Action Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundModal((prev) => ({ ...prev, action: 'ADD' }))}
                    className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      fundModal.action === 'ADD'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    + Add / Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundModal((prev) => ({ ...prev, action: 'SET' }))}
                    className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      fundModal.action === 'SET'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    = Set Exact Value
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount *</label>
                <input
                  type="number"
                  value={fundModal.amount}
                  onChange={(e) => setFundModal((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFundModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fundProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {fundProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  <span>CONFIRM ADJUSTMENT</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
