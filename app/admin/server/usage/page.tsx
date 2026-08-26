'use client';

import React, { useEffect, useState } from 'react';
import { Server, Cpu, MemoryStick, Clock, Activity, HardDrive, Zap, Loader2 } from 'lucide-react';

export default function ServerUsagePage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/server/usage');
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
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <Server className="w-8 h-8 text-indigo-500" />
            Server Resource Usage
          </h1>
          <p className="text-slate-500 mt-1">Live metrics of CPU, Memory, and System Uptime.</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {!metrics && loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Memory Usage */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <MemoryStick className="w-32 h-32" />
            </div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MemoryStick className="w-4 h-4" />
              </div>
              Memory (RAM)
            </h2>
            
            <div className="relative z-10">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-600">Usage</span>
                <span className="text-emerald-600">{metrics.memory.usagePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${metrics.memory.usagePercentage > 85 ? 'bg-red-500' : metrics.memory.usagePercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${metrics.memory.usagePercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mt-3">
                <span>Used: {formatBytes(metrics.memory.used)}</span>
                <span>Total: {formatBytes(metrics.memory.total)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 relative z-10">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Node Heap Used</p>
                <p className="text-lg font-black text-slate-800">{formatBytes(metrics.process.memoryUsage.heapUsed)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Node Heap Total</p>
                <p className="text-lg font-black text-slate-800">{formatBytes(metrics.process.memoryUsage.heapTotal)}</p>
              </div>
            </div>
          </div>

          {/* CPU & System */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cpu className="w-32 h-32" />
            </div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              CPU & System
            </h2>

            <div className="grid grid-cols-2 gap-6 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">CPU Cores</p>
                <p className="text-2xl font-black text-slate-800">{metrics.cpu.cores} vCPUs</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase">Load Average (1m, 5m, 15m)</p>
                <div className="flex gap-2">
                  {metrics.cpu.loadAvg.map((l: number, i: number) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                      {l.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-slate-400 font-bold uppercase">CPU Model</p>
                <p className="text-sm font-bold text-slate-700">{metrics.cpu.model}</p>
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl text-white space-y-6 relative overflow-hidden lg:col-span-2">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Clock className="w-40 h-40" />
            </div>
            <h2 className="text-xl font-black flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              Uptime & Details
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Server Uptime</p>
                <p className="text-2xl font-black text-emerald-400">{formatUptime(metrics.system.uptime)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Process Uptime</p>
                <p className="text-2xl font-black text-cyan-400">{formatUptime(metrics.process.uptime)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Platform / Host</p>
                <p className="text-lg font-bold text-white capitalize">{metrics.system.platform} ({metrics.system.hostname})</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Node Version</p>
                <p className="text-lg font-bold text-white">{metrics.process.nodeVersion}</p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load metrics.</div>
      )}
    </div>
  );
}
