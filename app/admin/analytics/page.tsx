'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  UserCheck, 
  Calendar, 
  Trophy, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Loader2, 
  Search, 
  Eye, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Gamepad2, 
  Copy, 
  Check, 
  Download,
  Filter,
  Flame,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

type RangePreset = '7D' | '14D' | '30D' | '90D' | 'ALL' | 'CUSTOM';

interface DayUser {
  id: string;
  name: string;
  inGameName: string;
  email: string;
  avatar: string;
  freeFireUid: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

interface DailyRecord {
  date: string;
  formattedDate: string;
  count: number;
  cumulativeCount: number;
  users: DayUser[];
}

interface AnalyticsData {
  summary: {
    totalUsers: number;
    todayCount: number;
    yesterdayCount: number;
    last7DaysCount: number;
    last14DaysCount: number;
    last30DaysCount: number;
    last90DaysCount: number;
    maxJoinDay: { date: string; formattedDate: string; count: number };
    minJoinDay: { date: string; formattedDate: string; count: number };
    averageDaily: number;
    verifiedCount: number;
    uidLinkedCount: number;
    phoneLinkedCount: number;
    verifiedPercentage: number;
    uidLinkedPercentage: number;
  };
  dailySeries: DailyRecord[];
  hourlyDistribution: Array<{ hour: number; label: string; count: number }>;
  recentUsers: DayUser[];
  generatedAt: string;
}

export default function AdminUserAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<RangePreset>('30D');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [chartView, setChartView] = useState<'DAILY' | 'CUMULATIVE'>('DAILY');
  const [tableSearch, setTableSearch] = useState('');
  
  // Modal for inspecting users of a specific day
  const [inspectDay, setInspectDay] = useState<DailyRecord | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const fetchAnalytics = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const url = force ? '/api/admin/analytics/users?refresh=true' : '/api/admin/analytics/users';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load user analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUid(text);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Filter daily series based on selected preset or custom dates
  const filteredDailySeries = useMemo(() => {
    if (!data?.dailySeries || data.dailySeries.length === 0) return [];
    const list = data.dailySeries;
    const total = list.length;

    if (selectedRange === '7D') return list.slice(Math.max(0, total - 7));
    if (selectedRange === '14D') return list.slice(Math.max(0, total - 14));
    if (selectedRange === '30D') return list.slice(Math.max(0, total - 30));
    if (selectedRange === '90D') return list.slice(Math.max(0, total - 90));
    if (selectedRange === 'ALL') return list;

    if (selectedRange === 'CUSTOM') {
      return list.filter((item) => {
        if (customStart && item.date < customStart) return false;
        if (customEnd && item.date > customEnd) return false;
        return true;
      });
    }

    return list;
  }, [data?.dailySeries, selectedRange, customStart, customEnd]);

  // Range specific calculated stats
  const rangeStats = useMemo(() => {
    if (!filteredDailySeries || filteredDailySeries.length === 0) {
      return { totalRangeJoins: 0, rangeAvg: 0, rangeMax: null, rangeMin: null };
    }

    let totalJoins = 0;
    let maxItem: DailyRecord = filteredDailySeries[0];
    let minItem: DailyRecord = filteredDailySeries[0];

    // Find active days for min calculation
    const activeDays = filteredDailySeries.filter((d) => d.count > 0);

    filteredDailySeries.forEach((d) => {
      totalJoins += d.count;
      if (d.count > maxItem.count) maxItem = d;
    });

    if (activeDays.length > 0) {
      minItem = activeDays[0];
      activeDays.forEach((d) => {
        if (d.count < minItem.count) minItem = d;
      });
    }

    const rangeAvg = Number((totalJoins / filteredDailySeries.length).toFixed(1));

    return {
      totalRangeJoins: totalJoins,
      rangeAvg,
      rangeMax: maxItem,
      rangeMin: minItem,
    };
  }, [filteredDailySeries]);

  // Filtered table records
  const tableRecords = useMemo(() => {
    const list = [...filteredDailySeries].reverse();
    if (!tableSearch.trim()) return list;
    const query = tableSearch.toLowerCase();
    return list.filter(
      (r) =>
        r.date.includes(query) ||
        r.formattedDate.toLowerCase().includes(query) ||
        r.users.some(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query) ||
            u.freeFireUid.includes(query)
        )
    );
  }, [filteredDailySeries, tableSearch]);

  const exportCSV = () => {
    if (!filteredDailySeries || filteredDailySeries.length === 0) return;
    const headers = ['Date', 'Day of Week', 'New Users Joined', 'Cumulative Platform Users'];
    const rows = filteredDailySeries.map((r) => [
      r.date,
      `"${r.formattedDate}"`,
      r.count,
      r.cumulativeCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_growth_analytics_${selectedRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Computing User Growth & Registration Analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalUsers: 0,
    todayCount: 0,
    yesterdayCount: 0,
    last7DaysCount: 0,
    last14DaysCount: 0,
    last30DaysCount: 0,
    last90DaysCount: 0,
    maxJoinDay: { date: '', formattedDate: '', count: 0 },
    minJoinDay: { date: '', formattedDate: '', count: 0 },
    averageDaily: 0,
    verifiedCount: 0,
    uidLinkedCount: 0,
    phoneLinkedCount: 0,
    verifiedPercentage: 0,
    uidLinkedPercentage: 0,
  };

  const todayDiff = summary.todayCount - summary.yesterdayCount;

  return (
    <div className="space-y-6 pb-16">
      
      {/* ============================================================== */}
      {/* 1. Header & Range Controls */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-black uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>PLAYER GROWTH INTELLIGENCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>User Growth &amp; Join Analytics</span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
            Track daily player registrations, analyze peak sign-up waves, inspect lowest join days, and audit which members registered on any date.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh analytics from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. Range Filter Bar */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>TIMELINE:</span>
          </span>

          {(['7D', '14D', '30D', '90D', 'ALL', 'CUSTOM'] as RangePreset[]).map((preset) => {
            const labels: Record<RangePreset, string> = {
              '7D': 'Last 7 Days',
              '14D': 'Last 14 Days',
              '30D': 'Last 30 Days',
              '90D': 'Last 90 Days',
              'ALL': 'All Time',
              'CUSTOM': 'Custom Range',
            };
            const active = selectedRange === preset;
            return (
              <button
                key={preset}
                onClick={() => setSelectedRange(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'bg-slate-100/70 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        {/* Custom Date Inputs (shown only if CUSTOM is selected) */}
        {selectedRange === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
            <span>To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. Primary KPI Cards Grid */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Platform Members */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Registered Users</span>
              <div className="text-3xl sm:text-4xl font-heading font-black text-slate-900 tracking-tight">
                {summary.totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{summary.verifiedPercentage}% Verified</span>
            </span>
            <span>{summary.uidLinkedPercentage}% FF UID linked</span>
          </div>
        </div>

        {/* Card 2: Today vs Yesterday Joins */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Joined Today</span>
              <div className="text-3xl sm:text-4xl font-heading font-black text-slate-900 tracking-tight">
                {summary.todayCount}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Yesterday: <strong>{summary.yesterdayCount}</strong></span>
            <span className={`inline-flex items-center gap-0.5 font-bold ${
              todayDiff >= 0 ? 'text-emerald-600' : 'text-rose-500'
            }`}>
              {todayDiff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{Math.abs(todayDiff)} vs yday</span>
            </span>
          </div>
        </div>

        {/* Card 3: 🏆 Record Max Join Day (Highest Daily Influx) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white rounded-3xl p-5 border border-amber-300/80 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                <Trophy className="w-3 h-3 text-amber-600" />
                <span>MAX JOIN PEAK DAY</span>
              </div>
              <div className="text-3xl sm:text-4xl font-heading font-black text-amber-950 tracking-tight">
                {summary.maxJoinDay?.count || 0} <span className="text-sm font-bold text-amber-700 font-body">Users</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-900 font-medium">
            <span className="font-bold">Record Date:</span>
            <span className="font-bold underline decoration-amber-400 underline-offset-2">
              {summary.maxJoinDay?.formattedDate || 'N/A'}
            </span>
          </div>
        </div>

        {/* Card 4: 📉 Lowest Join Day (Minimum recorded on active days) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                <TrendingDown className="w-3 h-3 text-slate-500" />
                <span>MIN ACTIVE JOIN DAY</span>
              </div>
              <div className="text-3xl sm:text-4xl font-heading font-black text-slate-900 tracking-tight">
                {summary.minJoinDay?.count || 0} <span className="text-sm font-bold text-slate-500 font-body">Users</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Date:</span>
            <span className="font-semibold text-slate-800">
              {summary.minJoinDay?.formattedDate || 'N/A'}
            </span>
          </div>
        </div>

      </div>

      {/* Secondary Highlights Row: Range Totals & Velocity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <span className="text-slate-400 uppercase tracking-wider font-black text-[10px]">Joins in Selected Range</span>
          <p className="text-xl font-black text-slate-900 mt-0.5">{rangeStats.totalRangeJoins}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <span className="text-slate-400 uppercase tracking-wider font-black text-[10px]">Daily Average (Timeline)</span>
          <p className="text-xl font-black text-blue-600 mt-0.5">{rangeStats.rangeAvg} <span className="text-xs font-normal text-slate-500">users/day</span></p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <span className="text-slate-400 uppercase tracking-wider font-black text-[10px]">Last 7 Days Total</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">+{summary.last7DaysCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <span className="text-slate-400 uppercase tracking-wider font-black text-[10px]">Last 30 Days Total</span>
          <p className="text-xl font-black text-purple-600 mt-0.5">+{summary.last30DaysCount}</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. Visual Charts Section */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Growth Chart (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Player Registration Trajectory</span>
              </h2>
              <p className="text-xs text-slate-500">
                Visualizing daily user join volume and cumulative community size over time.
              </p>
            </div>

            {/* Toggle Daily vs Cumulative */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setChartView('DAILY')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartView === 'DAILY' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily Influx
              </button>
              <button
                onClick={() => setChartView('CUMULATIVE')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartView === 'CUMULATIVE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cumulative Total
              </button>
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="w-full h-72 sm:h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'DAILY' ? (
                <AreaChart data={filteredDailySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickFormatter={(v) => {
                      const parts = v.split('-');
                      return `${parts[1]}/${parts[2]}`;
                    }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as DailyRecord;
                        return (
                          <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                            <p className="font-bold text-slate-300">{item.formattedDate}</p>
                            <p className="text-sm font-black text-amber-400">
                              +{item.count} New Users
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Total platform members: {item.cumulativeCount}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#userGrowthGradient)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={filteredDailySeries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    tickFormatter={(v) => {
                      const parts = v.split('-');
                      return `${parts[1]}/${parts[2]}`;
                    }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as DailyRecord;
                        return (
                          <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                            <p className="font-bold text-slate-300">{item.formattedDate}</p>
                            <p className="text-sm font-black text-emerald-400">
                              {item.cumulativeCount} Total Members
                            </p>
                            <p className="text-[10px] text-slate-400">
                              +{item.count} registered on this day
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeCount"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Distribution Bar Chart (4 cols on desktop) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-heading font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Peak Registration Hours</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Signups categorized by hour of the day (24h clock).
            </p>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hourlyDistribution || []} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="hour" 
                  tickLine={false} 
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  tickFormatter={(h) => (h % 4 === 0 ? `${h}h` : '')}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs">
                          <p className="font-bold">{item.label}</p>
                          <p className="text-purple-300 font-bold">{item.count} Signups</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-purple-50/60 rounded-2xl p-3 border border-purple-100 text-[11px] text-purple-900 font-medium">
            💡 <strong>Insight:</strong> Tournament announcements scheduled during peak hours yield 3x higher instant registrations.
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 5. Day-by-Day Historical Log & Inspection Table */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Day-by-Day Registration Audit</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;View Users&quot; on any date to inspect the exact player accounts that registered on that day.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search date or member..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 sm:px-6">Date</th>
                <th className="py-3 px-4">New Signups</th>
                <th className="py-3 px-4">Relative Volume</th>
                <th className="py-3 px-4">Cumulative Total</th>
                <th className="py-3 px-4 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tableRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No registration records found for this date range or search query.
                  </td>
                </tr>
              ) : (
                tableRecords.map((row) => {
                  const isMax = summary.maxJoinDay?.date === row.date && row.count > 0;
                  const isMin = summary.minJoinDay?.date === row.date && row.count > 0;
                  const isToday = row.date === new Date().toISOString().split('T')[0];

                  return (
                    <tr 
                      key={row.date} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isMax ? 'bg-amber-50/30' : isToday ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-heading text-sm">
                            {row.date}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({row.formattedDate.split(',')[0]})
                          </span>
                          {isMax && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                              <Trophy className="w-3 h-3 text-amber-600" />
                              <span>RECORD PEAK</span>
                            </span>
                          )}
                          {isMin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                              <span>LOW DAY</span>
                            </span>
                          )}
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase">
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Count */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block font-black text-sm ${
                          row.count > 0 ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                          +{row.count} {row.count === 1 ? 'player' : 'players'}
                        </span>
                      </td>

                      {/* Bar indicator */}
                      <td className="py-3.5 px-4">
                        <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isMax ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                summary.maxJoinDay?.count
                                  ? (row.count / summary.maxJoinDay.count) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Cumulative total */}
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        {row.cumulativeCount.toLocaleString()}
                      </td>

                      {/* Action View */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {row.count > 0 ? (
                          <button
                            onClick={() => setInspectDay(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View {row.count} Users</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs italic">No signups</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. Live Recent Registrations Feed */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Latest Registered Players (Live Feed)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent accounts created across website and web app.
            </p>
          </div>

          <Link
            href="/admin/users"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Accounts</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(data?.recentUsers || []).slice(0, 8).map((user) => (
            <div
              key={user.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-300">
                <Image
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {user.inGameName ? `IGN: ${user.inGameName}` : user.email || 'No email'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {user.freeFireUid ? (
                    <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                      UID: {user.freeFireUid}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400">UID: Unlinked</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. Modal: Day Users Inspection */}
      {/* ============================================================== */}
      {inspectDay && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-heading font-black text-slate-900">
                    {inspectDay.formattedDate}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-xs">
                    {inspectDay.count} Joined
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  All accounts registered on this specific calendar date.
                </p>
              </div>

              <button
                onClick={() => setInspectDay(null)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Users List */}
            <div className="p-5 sm:p-6 overflow-y-auto divide-y divide-slate-100 flex-1 space-y-3">
              {inspectDay.users.map((u) => {
                const regTime = new Date(u.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <div key={u.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-300">
                        <Image
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={u.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {u.name}
                          </span>
                          {u.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 truncate">
                          {u.email}
                        </p>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          {u.inGameName && <span>IGN: <strong>{u.inGameName}</strong></span>}
                          {u.freeFireUid && (
                            <button
                              onClick={() => copyToClipboard(u.freeFireUid)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono"
                              title="Copy UID"
                            >
                              <span>UID: {u.freeFireUid}</span>
                              {copiedUid === u.freeFireUid ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {regTime}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Total {inspectDay.count} players joined on {inspectDay.date}
              </span>
              <button
                onClick={() => setInspectDay(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
