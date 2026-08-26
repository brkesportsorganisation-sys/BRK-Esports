'use client';

import React, { useEffect, useState } from 'react';
import { HardDrive, Loader2, RefreshCw, Folder, FileImage } from 'lucide-react';

export default function StorageMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/server/storage');
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-amber-500" />
            Storage & Media Buckets
          </h1>
          <p className="text-slate-500 mt-1">Live metrics of Supabase storage buckets, files, and space usage.</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh Data
        </button>
      </div>

      {!metrics && loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          
          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-5 -bottom-5 opacity-20">
                <HardDrive className="w-48 h-48" />
              </div>
              <div className="relative z-10 space-y-2">
                <p className="text-amber-100 font-bold uppercase tracking-widest text-sm">Total Space Used</p>
                <h2 className="text-5xl font-black font-heading tracking-tight">{metrics.summary.totalMb} MB</h2>
                <p className="text-amber-50 text-sm">{formatBytes(metrics.summary.totalBytes)}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute -right-5 -bottom-5 opacity-5">
                <FileImage className="w-48 h-48" />
              </div>
              <div className="relative z-10 space-y-2">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Total Files</p>
                <h2 className="text-5xl font-black font-heading tracking-tight text-slate-800">{metrics.summary.totalFiles.toLocaleString()}</h2>
                <p className="text-slate-500 text-sm">Stored across {metrics.buckets.length} buckets.</p>
              </div>
            </div>
          </div>

          {/* Buckets Breakdown */}
          <h3 className="text-lg font-black text-slate-800 pt-4">Bucket Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {metrics.buckets.map((bucket: any, idx: number) => (
              <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-slate-800">{bucket.name}</h4>
                    <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase \${bucket.public ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}\`}>
                      {bucket.public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs text-slate-400 font-bold uppercase">Files</p>
                    <p className="text-xl font-black text-slate-700">{bucket.fileCount.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs text-slate-400 font-bold uppercase">Size</p>
                    <p className="text-xl font-black text-slate-700">{formatBytes(bucket.totalSizeInBytes)}</p>
                  </div>
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
