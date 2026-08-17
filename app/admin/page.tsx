'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Trophy, 
  DollarSign, 
  Users, 
  CreditCard, 
  PlusCircle, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Flame,
  KeyRound,
  ArrowRight,
  Clock,
  Sparkles,
  ShoppingBag,
  Layers,
  Gamepad2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Tournament, Payment } from '@/lib/types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  const loadLiveOverview = async () => {
    try {
      const [ovRes, tRes] = await Promise.all([
        fetch('/api/admin/overview', { credentials: 'include' }),
        fetch('/api/tournaments', { credentials: 'include' })
      ]);
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.tournaments) setTournaments(tData.tournaments);
      }
    } catch (err) {
      console.warn('Admin overview fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    loadLiveOverview();
    const refreshInterval = setInterval(loadLiveOverview, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  const totalUsersCount = overview?.totalUsers ?? 0;
  const activeTournaments = overview?.activeTournaments ?? 0;
  const pendingPayments = overview?.pendingPayments ?? 0;
  const totalRevenueAmount = overview?.totalRevenue ?? 0;
  const totalCategoriesCount = overview?.categoryStats?.reduce((acc: number, c: any) => acc + (c.count || 0), 0) ?? tournaments.length;

  // Real database monthly sales growth data
  const salesChartData = overview?.monthlySales && overview.monthlySales.length > 0
    ? overview.monthlySales
    : [
        { month: 'Jan', sales: 0 },
        { month: 'Feb', sales: 0 },
        { month: 'Mar', sales: 0 },
        { month: 'Apr', sales: 0 },
        { month: 'May', sales: 0 },
        { month: 'Jun', sales: 0 },
      ];

  // Real database game mode distribution
  const donutData: Array<{ name: string; count: number; color: string }> = overview?.categoryStats && overview.categoryStats.length > 0
    ? overview.categoryStats
    : [
        { name: 'BR Squad 4v4', count: 0, color: '#2563EB' },
        { name: 'BR Duo Battle', count: 0, color: '#10B981' },
        { name: 'CS 4v4 Clash', count: 0, color: '#8B5CF6' },
        { name: 'Solo Survival', count: 0, color: '#EA580C' },
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Page Header (Title + Subtitle + Live Clock) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Dashboard Overview
          </h1>
          <p className="text-[13px] text-slate-600 font-medium mt-1">
            Welcome back! Here's your tournament & operations analytics.
          </p>
        </div>

        {/* Live Clock Badge */}
        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-[#E2E8F0] text-[12px] font-semibold text-[#475569] self-start sm:self-auto shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <RefreshCw className="w-3.5 h-3.5 text-[#3B82F6] animate-spin" />
          <span className="font-semibold text-[#3B82F6]">Live</span>
          <span className="text-[#CBD5E1]">•</span>
          <span className="text-slate-700 font-mono">{currentTime || '4:46:04 PM'}</span>
        </div>
      </div>

      {/* 2. Top 4 KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Verified Players */}
        <div className="bg-white border border-[#E2E8F0]/80 p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-[14px] bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-0.5 text-[12px] font-semibold text-[#10B981]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12%</span>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-600 mt-5">Verified Players</div>
            <div className="text-[36px] font-bold text-[#0F172A] leading-none mt-2 tracking-tight">
              {totalUsersCount}
            </div>
          </div>
        </div>

        {/* Card 2: Active Tournaments */}
        <div className="bg-white border border-[#E2E8F0]/80 p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-[14px] bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-0.5 text-[12px] font-semibold text-[#10B981]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18%</span>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-600 mt-5">Active Tournaments</div>
            <div className="text-[36px] font-bold text-[#0F172A] leading-none mt-2 tracking-tight">
              {activeTournaments}
            </div>
          </div>
        </div>

        {/* Card 3: Categories & Modes */}
        <div className="bg-white border border-[#E2E8F0]/80 p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-[14px] bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-0.5 text-[12px] font-semibold text-[#10B981]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8%</span>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-600 mt-5">Categories & Modes</div>
            <div className="text-[36px] font-bold text-[#0F172A] leading-none mt-2 tracking-tight">
              {totalCategoriesCount}
            </div>
          </div>
        </div>

        {/* Card 4: Orders & Deposits */}
        <div className="bg-white border border-[#E2E8F0]/80 p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-[14px] bg-[#FFF7ED] text-[#F97316] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-0.5 text-[12px] font-semibold text-[#10B981]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+24%</span>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-600 mt-5">Orders & Deposits</div>
            <div className="text-[36px] font-bold text-[#0F172A] leading-none mt-2 tracking-tight">
              {pendingPayments}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Analytics Grid (Sales Analytics + Top Categories Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Card: Sales Analytics (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[#0F172A]">Sales Analytics</h2>
              <p className="text-[13px] text-slate-600 font-medium mt-0.5">Monthly sales growth overview</p>
            </div>
            <span className="bg-[#ECFDF5] text-[#10B981] border border-[#D1FAE5] rounded-[8px] px-2.5 py-0.5 text-[12px] font-semibold">
              0.0%
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="lightBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748B" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => val === 0 ? '0' : `${val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    borderColor: '#E2E8F0', 
                    borderRadius: '1rem',
                    color: '#0F172A',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)'
                  }} 
                  formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, 'Sales']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563EB" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#lightBlueGradient)"
                  dot={{ r: 4, fill: '#FFFFFF', stroke: '#2563EB', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#2563EB' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Card: Top Categories Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 flex flex-col justify-between space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div>
            <h2 className="text-[18px] font-bold text-[#0F172A]">Top Categories</h2>
            <p className="text-[13px] text-[#64748B] font-normal mt-0.5">Highest product count by category</p>
          </div>

          {/* Donut Chart Area */}
          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    borderColor: '#E2E8F0', 
                    borderRadius: '0.75rem',
                    color: '#0F172A',
                    fontSize: '11px',
                    boxShadow: '0 4px 15px -2px rgba(0, 0, 0, 0.08)'
                  }}
                  formatter={(value: any, name: any) => [`${value}`, name]}
                />
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={4}
                  dataKey="count"
                  stroke="none"
                >
                  {donutData.map((entry: { name: string; count: number; color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legends at Bottom matching exact reference screenshot */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#F1F5F9] text-[12px]">
            {donutData.map((item: { name: string; count: number; color: string }) => (
              <div key={item.name} className="flex items-center gap-2 truncate">
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="truncate text-[#475569]">{item.name}</span>
                <span className="font-medium text-[#0F172A]">({item.count})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Quick Action Shortcuts & Live Tournaments Queue */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-[18px] font-bold text-[#0F172A]">Active Tournaments Queue</h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/tournaments"
              className="px-4 py-2 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Tournament</span>
            </Link>
            <Link
              href="/admin/tournaments"
              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.slice(0, 3).map((tour) => (
            <div
              key={tour.id}
              className="p-4 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-100">
                  {tour.mode} • {tour.format}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tour.status === 'LIVE' ? 'bg-red-100 text-red-600' :
                  tour.status === 'UPCOMING' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {tour.status}
                </span>
              </div>

              <div className="font-bold text-[15px] text-[#0F172A] truncate">
                {tour.title}
              </div>

              <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                <div>Entry: <strong className="text-[#0F172A]">৳{tour.entryFee}</strong></div>
                <div>Prize: <strong className="text-amber-600">৳{tour.prizePool}</strong></div>
                <div>Slots: <strong className="text-[#2563EB]">{tour.registeredCount}/{tour.maxTeams}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
