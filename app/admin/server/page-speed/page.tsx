'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, Zap, Clock, Globe } from 'lucide-react';

export default function PageSpeedMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const getLatencyColor = (ms: number) => {
    if (ms < 150) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (ms < 500) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-red-500 bg-red-50 border-red-200';
  };

  const getLatencyStatus = (ms: number) => {
    if (ms < 150) return 'Blazing Fast';
    if (ms < 500) return 'Average';
    return 'Slow';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-rose-500" />
            Page Speed & Latency
          </h1>
          <p className="text-slate-500 mt-1">Real-time TTFB (Time To First Byte) and API latency metrics.</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Run Speed Test
        </button>
      </div>

      {!metrics && loading ? (
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
          <p className="text-slate-500 font-bold animate-pulse">Running live network latency tests...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex items-center justify-between flex-wrap gap-6">
            <div className="absolute -left-10 -bottom-10 opacity-10">
              <Zap className="w-64 h-64" />
            </div>
            <div className="relative z-10 space-y-2">
              <p className="text-rose-100 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Average API Response Time
              </p>
              <h2 className="text-5xl font-black font-heading tracking-tight">{metrics.averageLatencyMs} ms</h2>
              <p className="text-rose-50 text-sm font-medium">Tested across {metrics.details.length} critical endpoints.</p>
            </div>
            <div className="relative z-10 bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center">
              <p className="text-xs uppercase font-bold text-white/80 tracking-wider">Overall Status</p>
              <p className="text-2xl font-black">{getLatencyStatus(metrics.averageLatencyMs)}</p>
            </div>
          </div>

          {/* Detailed Routes Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.details.map((route: any, idx: number) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative hover:shadow-md transition">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <span className={\`text-xs font-bold px-3 py-1 rounded-full border \${route.error ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-600 bg-slate-50 border-slate-200'}\`}>
                    HTTP {route.status}
                  </span>
                </div>
                
                <h3 className="font-black text-lg text-slate-800 mb-1">{route.name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-6">{route.path}</p>

                <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Latency</p>
                    <div className="flex items-center gap-2">
                      <span className={\`text-2xl font-black \${route.error ? 'text-red-500' : 'text-slate-900'}\`}>
                        {route.latencyMs}
                      </span>
                      <span className="text-sm font-bold text-slate-400">ms</span>
                    </div>
                  </div>
                  <span className={\`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border \${getLatencyColor(route.latencyMs)}\`}>
                    {getLatencyStatus(route.latencyMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load metrics.</div>
      )}
    </div>
  );
}
