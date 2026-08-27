'use client';

import React, { useEffect, useState } from 'react';
import { 
  Server, 
  Cpu, 
  MemoryStick, 
  Clock, 
  Activity, 
  HardDrive, 
  Zap, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Terminal, 
  Network, 
  CheckCircle2,
  Gauge,
  Box
} from 'lucide-react';

export default function ServerUsagePage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/server/usage');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m ${s}s`;
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return { label: 'Optimal Health', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: ShieldCheck };
      case 'GOOD':
        return { label: 'Healthy & Normal', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: CheckCircle2 };
      case 'WARNING':
        return { label: 'Moderate Load', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: AlertTriangle };
      default:
        return { label: 'High Load', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <Server className="w-8 h-8 text-indigo-500" />
            Server Resource Usage & Diagnostics
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time multi-core CPU activity, RAM allocation, V8 heap inspector & Node runtime metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Refresh interval selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <span className="px-2 text-[10px] uppercase text-slate-400">Auto:</span>
            {[
              { label: '5s', val: 5 },
              { label: '10s', val: 10 },
              { label: '30s', val: 30 },
              { label: 'Off', val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setRefreshInterval(opt.val)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  refreshInterval === opt.val ? 'bg-white text-indigo-600 shadow-2xs font-black' : 'hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 border border-indigo-200 shadow-xs cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex flex-col items-center justify-center h-72 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-slate-500">Querying real-time server hardware telemetry…</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Top Health & Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-5 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Server Health</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getHealthBadge(metrics.health.status).color}`}>
                  {metrics.health.status}
                </span>
              </div>
              <div className="my-2">
                <div className="text-4xl font-black font-heading">{metrics.health.healthScore}%</div>
                <p className="text-xs text-indigo-200 mt-0.5">Optimal Operational Status</p>
              </div>
              <div className="text-[10px] text-indigo-300 font-mono">
                Updated {lastRefreshed.toLocaleTimeString()}
              </div>
            </div>

            {/* Total RAM Usage */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <MemoryStick className="w-4 h-4 text-emerald-500" /> System RAM
                </span>
                <span className="text-xs font-black text-emerald-600">{metrics.memory.usagePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    metrics.memory.usagePercentage > 85
                      ? 'bg-red-500'
                      : metrics.memory.usagePercentage > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${metrics.memory.usagePercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Used: <strong>{formatBytes(metrics.memory.used)}</strong></span>
                <span>Total: {formatBytes(metrics.memory.total)}</span>
              </div>
            </div>

            {/* V8 Node Heap */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Node.js V8 Heap
                </span>
                <span className="text-xs font-black text-amber-600">{metrics.process.memoryUsage.heapUsagePct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${metrics.process.memoryUsage.heapUsagePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Used: <strong>{formatBytes(metrics.process.memoryUsage.heapUsed)}</strong></span>
                <span>Heap: {formatBytes(metrics.process.memoryUsage.heapTotal)}</span>
              </div>
            </div>

            {/* System Uptime */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" /> System Uptime
              </span>
              <div className="text-2xl font-black font-heading text-slate-800">
                {formatUptime(metrics.system.uptime)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Process: {formatUptime(metrics.process.uptime)}</span>
                <span>PID: {metrics.process.pid}</span>
              </div>
            </div>
          </div>

          {/* CPU Multi-Core Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-500" />
                  CPU Multi-Core Activity & Load Average
                </h3>
                <p className="text-xs text-slate-500">{metrics.cpu.model} • {metrics.cpu.coresCount} Logical Cores</p>
              </div>

              {/* Load Average badges */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Load Avg:</span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                  1m: {metrics.cpu.loadAvg[0]?.toFixed(2)}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                  5m: {metrics.cpu.loadAvg[1]?.toFixed(2)}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                  15m: {metrics.cpu.loadAvg[2]?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Individual Cores Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {metrics.cpu.cores.map((core: any) => (
                <div key={core.coreIndex} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Core #{core.coreIndex}</div>
                  <div className="text-base font-heading font-black text-slate-800">{core.usagePct}%</div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        core.usagePct > 80 ? 'bg-red-500' : core.usagePct > 50 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${core.usagePct}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">{core.speedMhz} MHz</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column Runtime & Network Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Deep Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-500" />
                V8 Memory Allocation Breakdown
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Resident Set Size (RSS)</span>
                  <span className="font-bold font-mono text-slate-900">{formatBytes(metrics.process.memoryUsage.rss)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Heap Total Allocated</span>
                  <span className="font-bold font-mono text-slate-900">{formatBytes(metrics.process.memoryUsage.heapTotal)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Heap Actual Used</span>
                  <span className="font-bold font-mono text-emerald-600">{formatBytes(metrics.process.memoryUsage.heapUsed)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">External C++ Memory</span>
                  <span className="font-bold font-mono text-slate-900">{formatBytes(metrics.process.memoryUsage.external)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Array Buffers</span>
                  <span className="font-bold font-mono text-slate-900">{formatBytes(metrics.process.memoryUsage.arrayBuffers)}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Free Physical System RAM</span>
                  <span className="font-bold font-mono text-slate-900">{formatBytes(metrics.memory.free)}</span>
                </div>
              </div>
            </div>

            {/* Platform & Environment Specs */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-500" />
                OS & Runtime Environment
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Operating System</p>
                  <p className="font-bold text-slate-800 capitalize mt-0.5">{metrics.system.platform} ({metrics.system.arch})</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Kernel / Release</p>
                  <p className="font-bold text-slate-800 font-mono mt-0.5 truncate">{metrics.system.release}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Node.js Engine</p>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{metrics.process.nodeVersion}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">V8 Engine</p>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{metrics.process.v8Version}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Hostname / Server ID</p>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{metrics.system.hostname}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Interfaces */}
          {metrics.network?.interfaces?.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-500" />
                Network Interfaces & Telemetry
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {metrics.network.interfaces.map((iface: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{iface.name}</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {iface.family}
                      </span>
                    </div>
                    <div className="font-mono text-slate-600 text-[11px] truncate">{iface.address}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{iface.mac || 'Internal Loopback'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load metrics.</div>
      )}
    </div>
  );
}
