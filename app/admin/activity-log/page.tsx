'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter, Loader2, RefreshCw, Clock, UserCheck } from 'lucide-react';
import { AdminActivityLog } from '@/lib/types';

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/activity-log');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const username = (log.adminUsername || (log as any).actor || '').toLowerCase();
    const action = (log.action || '').toLowerCase();
    const details = (log.details || '').toLowerCase();
    const targetType = (log.targetType || '').toLowerCase();
    const targetId = (log.targetId || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch =
      username.includes(q) ||
      action.includes(q) ||
      details.includes(q) ||
      targetType.includes(q) ||
      targetId.includes(q);

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              ADMIN ACTIVITY AUDIT LOG
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive audit trail of every write action taken by sub-admin and moderator accounts.
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by admin username, action, or target item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium shadow-sm"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-bold shadow-sm focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Actions ({logs.length})</option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-emerald-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-600 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-slate-900 text-base">No Activity Logs Found</div>
            <div className="text-xs font-medium">All administrative events will be recorded here in real time.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4">Admin Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target Item</th>
                  <th className="p-4">Details</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600 text-xs">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-slate-500" />
                        <span>@{log.adminUsername || (log as any).actor || 'admin'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-800">
                      {log.targetType ? (
                        <span className="font-mono text-slate-700 font-bold">
                          {log.targetType} {log.targetId ? `#${log.targetId}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-700 font-medium max-w-md">
                      {log.details || '—'}
                    </td>
                    <td className="p-4 text-right text-xs text-slate-600 font-mono font-medium">
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
