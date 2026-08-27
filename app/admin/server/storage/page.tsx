'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  HardDrive, 
  Loader2, 
  RefreshCw, 
  Folder, 
  FileImage, 
  File, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  LayoutGrid, 
  List, 
  X, 
  Eye, 
  Calendar,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';

interface StorageFile {
  id: string;
  name: string;
  size: number;
  mimetype: string;
  createdAt: string;
  updatedAt?: string;
  publicUrl: string | null;
  isImage: boolean;
  bucketName: string;
}

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  fileCount: number;
  totalSizeInBytes: number;
  files: StorageFile[];
  error?: boolean;
}

interface StorageMetrics {
  timestamp: string;
  buckets: BucketInfo[];
  summary: {
    totalFiles: number;
    totalBytes: number;
    totalMb: string;
  };
}

export default function StorageMetricsPage() {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'OTHER'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/server/storage');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Failed to fetch storage metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleCopy = (url: string | null, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Aggregate all files across buckets
  const allFiles = useMemo(() => {
    if (!metrics?.buckets) return [];
    return metrics.buckets.flatMap((bucket) =>
      (bucket.files || []).map((file) => ({
        ...file,
        bucketName: bucket.name,
      }))
    );
  }, [metrics]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return allFiles.filter((file) => {
      // Bucket filter
      if (selectedBucket !== 'ALL' && file.bucketName !== selectedBucket) {
        return false;
      }
      // Type filter
      if (filterType === 'IMAGE' && !file.isImage) return false;
      if (filterType === 'OTHER' && file.isImage) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          file.name.toLowerCase().includes(q) ||
          file.bucketName.toLowerCase().includes(q) ||
          file.mimetype.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allFiles, selectedBucket, filterType, searchQuery]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-amber-500" />
            Storage & Media Explorer
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time Supabase storage buckets, visual media gallery & file asset inspector.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 self-start sm:self-auto border border-amber-200 shadow-xs cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Refresh Files</span>
        </button>
      </div>

      {loading && !metrics ? (
        <div className="flex flex-col items-center justify-center h-72 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-9 h-9 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-slate-500">Scanning Supabase storage buckets & files…</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-15">
                <HardDrive className="w-36 h-36" />
              </div>
              <div className="relative z-10 space-y-1">
                <p className="text-amber-100 font-bold uppercase tracking-widest text-[11px]">Total Space Used</p>
                <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight">{metrics.summary.totalMb} MB</h2>
                <p className="text-amber-100 text-xs font-medium">{formatBytes(metrics.summary.totalBytes)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <FileImage className="w-36 h-36" />
              </div>
              <div className="relative z-10 space-y-1">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Total Files & Images</p>
                <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-slate-800">
                  {metrics.summary.totalFiles.toLocaleString()}
                </h2>
                <p className="text-slate-500 text-xs font-medium">Stored across {metrics.buckets.length} buckets</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-1">
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <Folder className="w-36 h-36" />
              </div>
              <div className="relative z-10 space-y-1">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Active Buckets</p>
                <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-slate-800">
                  {metrics.buckets.length}
                </h2>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {metrics.buckets.map((b) => (
                    <span
                      key={b.id}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 truncate max-w-[130px]"
                    >
                      {b.name} ({b.fileCount})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bucket Tabs & Filter Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            {/* Bucket Switcher */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <button
                onClick={() => setSelectedBucket('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedBucket === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Buckets ({allFiles.length})</span>
              </button>

              {metrics.buckets.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBucket(b.name)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedBucket === b.name
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{b.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedBucket === b.name ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {b.fileCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Search, Type Filter & View Mode Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files by name or extension..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
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

              <div className="flex items-center gap-2">
                {/* Type Filter */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({allFiles.length})
                  </button>
                  <button
                    onClick={() => setFilterType('IMAGE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      filterType === 'IMAGE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileImage className="w-3 h-3 text-amber-500" />
                    <span>Images ({allFiles.filter((f) => f.isImage).length})</span>
                  </button>
                  <button
                    onClick={() => setFilterType('OTHER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === 'OTHER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Other
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('GRID')}
                    title="Gallery Grid View"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'GRID' ? 'bg-white text-amber-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('TABLE')}
                    title="List Table View"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'TABLE' ? 'bg-white text-amber-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Showing <strong>{filteredFiles.length}</strong> file{filteredFiles.length === 1 ? '' : 's'}</span>
              {selectedBucket !== 'ALL' && (
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  Bucket: {selectedBucket}
                </span>
              )}
            </div>
          </div>

          {/* Files Content View */}
          {filteredFiles.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
                <File className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800">No files match your search</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No stored files found under the selected bucket and filter criteria.
              </p>
            </div>
          ) : viewMode === 'GRID' ? (
            /* Visual Gallery Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {/* Thumbnail / Image Preview */}
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="relative w-full aspect-square bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer group-hover:brightness-95 transition"
                  >
                    {file.isImage && file.publicUrl ? (
                      <img
                        src={file.publicUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-slate-400">
                        <File className="w-10 h-10 text-slate-500" />
                        <span className="text-[10px] uppercase font-mono mt-1 text-slate-400">
                          {file.name.split('.').pop() || 'FILE'}
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay with Preview Icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="px-2.5 py-1 bg-white/90 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm backdrop-blur-xs">
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </span>
                    </div>

                    {/* Bucket & Size Tag */}
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-mono backdrop-blur-xs">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span className="truncate max-w-[90px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                          {file.bucketName}
                        </span>
                        <span>{formatDate(file.createdAt).split(',')[0]}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      {file.publicUrl && (
                        <>
                          <button
                            onClick={() => handleCopy(file.publicUrl, file.id)}
                            className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Copy Public URL"
                          >
                            {copiedId === file.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>

                          <a
                            href={file.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center cursor-pointer"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table / List View */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Preview / File</th>
                      <th className="px-4 py-3">Bucket</th>
                      <th className="px-4 py-3">File Size</th>
                      <th className="px-4 py-3">MIME Type</th>
                      <th className="px-4 py-3">Uploaded Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setPreviewFile(file)}
                              className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer border border-slate-200"
                            >
                              {file.isImage && file.publicUrl ? (
                                <img src={file.publicUrl} alt={file.name} className="w-full h-full object-cover" />
                              ) : (
                                <File className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-xs">{file.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{file.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            {file.bucketName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {formatBytes(file.size)}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 font-mono">
                          {file.mimetype}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          {formatDate(file.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {file.publicUrl && (
                              <>
                                <button
                                  onClick={() => handleCopy(file.publicUrl, file.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                  title="Copy URL"
                                >
                                  {copiedId === file.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={file.publicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">Failed to load storage metrics.</div>
      )}

      {/* ── HIGH-RESOLUTION PREVIEW MODAL (LIGHTBOX) ── */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden relative text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="font-bold text-slate-900 text-sm truncate">{previewFile.name}</h4>
                <p className="text-[11px] text-slate-500">
                  Bucket: <strong>{previewFile.bucketName}</strong> • Size: <strong>{formatBytes(previewFile.size)}</strong>
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Image / File Container */}
            <div className="bg-slate-950 p-4 flex items-center justify-center max-h-[60vh] min-h-[240px] overflow-hidden">
              {previewFile.isImage && previewFile.publicUrl ? (
                <img
                  src={previewFile.publicUrl}
                  alt={previewFile.name}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-2">
                  <File className="w-16 h-16 text-slate-400 mx-auto" />
                  <p className="font-bold text-sm text-slate-300">File Preview Not Available</p>
                  <p className="text-xs text-slate-500">{previewFile.mimetype}</p>
                </div>
              )}
            </div>

            {/* Modal Footer / Metadata & Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 w-full sm:w-auto">
                <span>Uploaded: <strong>{formatDate(previewFile.createdAt)}</strong></span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {previewFile.publicUrl && (
                  <>
                    <button
                      onClick={() => handleCopy(previewFile.publicUrl, previewFile.id)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {copiedId === previewFile.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Public Link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={previewFile.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Full Size</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
