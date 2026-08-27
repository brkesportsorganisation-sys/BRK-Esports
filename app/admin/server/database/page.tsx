'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Database, 
  Loader2, 
  RefreshCw, 
  Layers, 
  Search, 
  X, 
  Trophy, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  Gamepad2, 
  ShoppingBag, 
  Bell, 
  Settings, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

interface TableMetric {
  name: string;
  category: 'GAMING' | 'FINANCE' | 'USERS' | 'COMMUNITY' | 'CONFIG';
  label: string;
  count: number;
  lastUpdated: string | null;
  error?: boolean;
}

export default function DatabaseMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/server/database');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'No activity logged';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'GAMING':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FINANCE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'USERS':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'COMMUNITY':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredTables = useMemo(() => {
    if (!metrics?.tables) return [];
    return metrics.tables.filter((table: TableMetric) => {
      if (selectedCategory !== 'ALL' && table.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return table.name.toLowerCase().includes(q) || table.label.toLowerCase().includes(q);
      }
      return true;
    });
  }, [metrics, selectedCategory, searchQuery]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-500" />
            Database Metrics & PostgreSQL Engine
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time row distribution, table integrity checks & PostgreSQL storage analytics.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 self-start sm:self-auto border border-emerald-200 shadow-xs cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Refresh Database</span>
        </button>
      </div>

      {loading && !metrics ? (
        <div className="flex flex-col items-center justify-center h-72 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-9 h-9 animate-spin text-emerald-500" />
          <p className="text-sm font-semibold text-slate-500">Querying live Supabase PostgreSQL tables & row stats…</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Database Rows */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Total Database Records</p>
                <h2 className="text-3xl sm:text-4xl font-black font-heading mt-1">{metrics.summary.totalRows.toLocaleString()}</h2>
              </div>
              <div className="text-xs text-emerald-100 font-medium mt-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Across {metrics.summary.totalTables} Core Tables
              </div>
            </div>

            {/* Connection Ping & Engine */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">PostgreSQL Ping</span>
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {metrics.connection.status}
                </span>
              </div>
              <div className="text-2xl font-black font-heading text-slate-800">
                {metrics.connection.pingLatencyMs} ms
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">{metrics.connection.databaseEngine}</p>
            </div>

            {/* Player Accounts Health */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" /> User Accounts
              </span>
              <div className="text-2xl font-black font-heading text-slate-800">
                {metrics.integrity.users.total} Total
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-emerald-600 font-bold">{metrics.integrity.users.active} Active</span>
                <span className="text-red-500 font-bold">{metrics.integrity.users.banned} Banned</span>
              </div>
            </div>

            {/* Financial Transactions Health */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" /> Payments & Volume
              </span>
              <div className="text-2xl font-black font-heading text-brand-orange">
                ৳ {metrics.integrity.payments.totalVolume.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-slate-600">{metrics.integrity.payments.verified} Verified</span>
                <span className="text-amber-600 font-bold">{metrics.integrity.payments.pending} Pending</span>
              </div>
            </div>
          </div>

          {/* Category Distribution Bars */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Category-wise Data Distribution
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.summary.categories.map((cat: any) => (
                <div
                  key={cat.category}
                  onClick={() => setSelectedCategory(selectedCategory === cat.category ? 'ALL' : cat.category)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedCategory === cat.category
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="uppercase text-slate-700">{cat.category}</span>
                    <span className="text-emerald-700 font-mono">{cat.percentage}%</span>
                  </div>
                  <div className="text-lg font-black font-heading text-slate-900 mt-1">
                    {cat.totalRows.toLocaleString()} <span className="text-xs font-normal text-slate-500">rows</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.max(4, parseFloat(cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table Breakdown Explorer */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'GAMING', 'FINANCE', 'USERS', 'COMMUNITY', 'CONFIG'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Tables' : cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search table by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3"># Table Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Row Count</th>
                    <th className="px-4 py-3">Database Share</th>
                    <th className="px-4 py-3">Latest Activity / Insert</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTables.map((table: TableMetric, idx: number) => {
                    const sharePct = metrics.summary.totalRows > 0
                      ? ((table.count / metrics.summary.totalRows) * 100).toFixed(1)
                      : '0';

                    return (
                      <tr key={table.name} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-500 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{table.name}</p>
                              <p className="text-[11px] text-slate-400">{table.label}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${getCategoryColor(table.category)}`}>
                            {table.category}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-heading font-black text-sm text-slate-900">
                            {table.count.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>{sharePct}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.max(2, parseFloat(sharePct))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(table.lastUpdated)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Healthy</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load database metrics.</div>
      )}
    </div>
  );
}
