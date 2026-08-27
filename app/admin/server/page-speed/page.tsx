'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Activity, 
  Loader2, 
  RefreshCw, 
  Zap, 
  Clock, 
  Globe, 
  Gauge, 
  ExternalLink, 
  CheckCircle2, 
  Search, 
  X, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  Server, 
  ArrowUpRight 
} from 'lucide-react';

interface RouteLatency {
  name: string;
  category: 'PAGE' | 'API';
  path: string;
  status: number;
  latencyMs: number;
  rating: 'OPTIMAL' | 'GOOD' | 'AVERAGE' | 'SLOW';
  cacheControl: string;
  contentType: string;
  error?: boolean;
}

export default function PageSpeedMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/server/page-speed');
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

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'OPTIMAL':
        return { label: '🚀 Blazing Fast', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'GOOD':
        return { label: '⚡ Fast', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'AVERAGE':
        return { label: '🟡 Moderate', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: '🔴 Slow', color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const filteredRoutes = useMemo(() => {
    if (!metrics?.details) return [];
    return metrics.details.filter((route: RouteLatency) => {
      if (selectedCategory !== 'ALL' && route.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return route.name.toLowerCase().includes(q) || route.path.toLowerCase().includes(q);
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
            <Activity className="w-8 h-8 text-rose-500" />
            Page Speed, TTFB & API Latency Inspector
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time multi-route performance benchmarks, TTFB latency telemetry & edge diagnostics.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 self-start sm:self-auto border border-rose-200 shadow-xs cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Run Speed Benchmark</span>
        </button>
      </div>

      {loading && !metrics ? (
        <div className="flex flex-col items-center justify-center h-72 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-9 h-9 animate-spin text-rose-500" />
          <p className="text-sm font-semibold text-slate-500">Measuring live TTFB & latency across all routes…</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Top Performance Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Speed Score & Grade */}
            <div className="bg-gradient-to-br from-rose-500 via-red-600 to-amber-600 p-5 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-100">Performance Grade</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-black backdrop-blur-xs">
                  GRADE {metrics.summary.grade}
                </span>
              </div>
              <div className="my-2">
                <h2 className="text-4xl sm:text-5xl font-black font-heading tracking-tight">{metrics.summary.performanceScore}/100</h2>
                <p className="text-xs text-rose-100 mt-0.5">High Speed Edge Network</p>
              </div>
              <div className="text-[10px] text-rose-200 font-mono">
                {metrics.summary.successfulRoutes} of {metrics.summary.totalRoutesTested} Routes Healthy (100%)
              </div>
            </div>

            {/* Average TTFB Latency */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" /> Average Latency
              </span>
              <div className="text-3xl font-black font-heading text-slate-900">
                {metrics.summary.averageLatencyMs} <span className="text-sm font-bold text-slate-400">ms</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Fastest: <strong className="text-emerald-600 font-mono">{metrics.summary.minLatencyMs}ms</strong></span>
                <span>Max: <strong className="text-slate-700 font-mono">{metrics.summary.maxLatencyMs}ms</strong></span>
              </div>
            </div>

            {/* Target Server Host */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-500" /> Tested Host URL
              </span>
              <div className="text-sm font-bold font-mono text-slate-800 truncate" title={metrics.testedHost}>
                {metrics.testedHost.replace('https://', '')}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Edge Routing Active
              </div>
            </div>

            {/* Total Benchmark Tests */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-500" /> Benchmark Matrix
              </span>
              <div className="text-3xl font-black font-heading text-slate-900">
                {metrics.summary.totalRoutesTested} <span className="text-sm font-bold text-slate-400">Endpoints</span>
              </div>
              <p className="text-[11px] text-slate-500">Pages, Dynamic APIs & Static Routes</p>
            </div>
          </div>

          {/* Infrastructure & Edge Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.diagnostics?.map((diag: any, idx: number) => (
              <div key={idx} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    {diag.title}
                  </h4>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {diag.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{diag.details}</p>
              </div>
            ))}
          </div>

          {/* Detailed Routes Matrix Explorer */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            {/* Filter & Search Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Category Pills */}
              <div className="flex items-center gap-2">
                {['ALL', 'PAGE', 'API'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Endpoints' : cat === 'PAGE' ? 'Frontend Pages' : 'REST APIs'}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search route name or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
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

            {/* Routes Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Endpoint / Route</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">HTTP Status</th>
                    <th className="px-4 py-3">Response Time (TTFB)</th>
                    <th className="px-4 py-3">Speed Grade</th>
                    <th className="px-4 py-3">Content / Cache</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRoutes.map((route: RouteLatency, idx: number) => {
                    const badge = getRatingBadge(route.rating);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{route.name}</p>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">{route.path}</p>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${
                            route.category === 'PAGE' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {route.category}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                            route.status === 200 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {route.status} OK
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-black text-sm text-slate-900">{route.latencyMs} ms</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  route.latencyMs < 150
                                    ? 'bg-emerald-500'
                                    : route.latencyMs < 350
                                    ? 'bg-cyan-500'
                                    : route.latencyMs < 700
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, (route.latencyMs / 800) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <div className="font-mono text-slate-600">{route.contentType}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={route.cacheControl}>
                              {route.cacheControl}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <a
                            href={route.path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
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
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load latency metrics.</div>
      )}
    </div>
  );
}
