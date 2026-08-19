'use client';

import React, { useState, useEffect } from 'react';
import { Users, History, Search, RefreshCw, Loader2, UserCheck, Shield, DollarSign, Trophy, Sparkles, AlertCircle } from 'lucide-react';

interface UserLogItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  accountNumber?: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export default function UserActivityLogsPage() {
  const [logs, setLogs] = useState<UserLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const loadUserLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/user-logs', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to load user activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.userName.toLowerCase().includes(q) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
      (log.accountNumber && log.accountNumber.toLowerCase().includes(q)) ||
      log.action.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q));

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  const getActionBadgeColor = (action: string) => {
    if (action.includes('SIGNUP') || action.includes('REGISTER')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (action.includes('DEPOSIT') || action.includes('APPROVED')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('TOURNAMENT') || action.includes('SLOT')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (action.includes('SPIN') || action.includes('CLAIM')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action.includes('BAN') || action.includes('WARN')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
            <Users className="w-6 h-6 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              PLAYER ACTIVITY & USER LOGS
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log of player signups, logins, deposits, slot registrations, and reward claims.
            </p>
          </div>
        </div>

        <button
          onClick={loadUserLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs transition-all flex items-center space-x-1.5 border border-blue-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH PLAYER LOGS</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player name, email, account ID, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium shadow-sm"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-bold shadow-sm focus:outline-none"
        >
          <option value="ALL">All Player Actions ({logs.length})</option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-slate-800 text-base">No Player Logs Found</div>
            <div className="text-xs font-medium text-slate-500">Player activity, slot registrations, and deposits will be recorded here in real-time.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-4">Player / Account</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Activity Details</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-xs">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {log.userEmail || log.accountNumber || 'BRE-PLAYER'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-700 font-medium max-w-md">
                      {log.details || '—'}
                    </td>
                    <td className="p-4 text-right text-xs text-slate-500 font-mono font-medium">
                      {new Date(log.createdAt).toLocaleString()}
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
