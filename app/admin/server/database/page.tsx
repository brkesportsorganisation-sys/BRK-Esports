'use client';

import React, { useEffect, useState } from 'react';
import { Database, Loader2, RefreshCw, Layers } from 'lucide-react';

export default function DatabaseMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-500" />
            Database Metrics
          </h1>
          <p className="text-slate-500 mt-1">Live data showing total rows and exact counts of core tables in Supabase.</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh Data
        </button>
      </div>

      {!metrics && loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <Database className="w-64 h-64" />
            </div>
            <div className="relative z-10 space-y-2">
              <p className="text-emerald-100 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Total Database Records
              </p>
              <h2 className="text-5xl font-black font-heading tracking-tight">{metrics.totalRows.toLocaleString()} Rows</h2>
              <p className="text-emerald-50 pt-2 text-sm max-w-md">Across {metrics.tables.length} primary tables currently queried for this report.</p>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Tables Breakdown</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {metrics.tables.sort((a: any, b: any) => b.count - a.count).map((table: any, idx: number) => (
                <div key={idx} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                      {idx + 1}
                    </div>
                    <div className="font-bold text-slate-700">{table.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-100 rounded-full h-2 hidden sm:block">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${Math.min((table.count / metrics.totalRows) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="font-black text-slate-900 bg-emerald-50 px-3 py-1 rounded-lg">
                      {table.count.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load metrics.</div>
      )}
    </div>
  );
}
