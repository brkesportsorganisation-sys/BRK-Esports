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
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/db';
import { User, Tournament, Payment } from '@/lib/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
    setTournaments(db.getTournaments());
    setPayments(db.getPayments());
    setUsers(db.getUsers());

    async function loadLiveOverview() {
      try {
        const [ovRes, tRes] = await Promise.all([
          fetch('/api/admin/overview'),
          fetch('/api/tournaments')
        ]);
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          setOverview(ovData);
          if (ovData.recentPayments) setPayments(ovData.recentPayments);
        }
        if (tRes.ok) {
          const tData = await tRes.json();
          if (tData.tournaments) setTournaments(tData.tournaments);
        }
      } catch (err) {
        console.warn('Admin overview fetch error:', err);
      }
    }
    loadLiveOverview();
  }, []);

  const pendingPayments = overview ? overview.pendingPayments : payments.filter(p => p.status === 'PENDING').length;
  const activeTournaments = overview ? overview.activeTournaments : tournaments.filter(t => t.status === 'LIVE' || t.status === 'UPCOMING').length;
  const totalUsersCount = overview ? overview.totalUsers : users.length;
  const totalRevenueAmount = overview ? overview.totalRevenue : payments.filter(p => p.status === 'VERIFIED').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const chartData = [
    { day: 'Mon', revenue: 14000, players: 450 },
    { day: 'Tue', revenue: 21000, players: 680 },
    { day: 'Wed', revenue: 19000, players: 620 },
    { day: 'Thu', revenue: 28000, players: 890 },
    { day: 'Fri', revenue: 36000, players: 1200 },
    { day: 'Sat', revenue: 52000, players: 1650 },
    { day: 'Sun', revenue: 44000, players: 1400 },
  ];

  return (
    <div className="space-y-8">
      
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-brand-red/20 text-brand-red font-mono text-[10px] font-extrabold uppercase tracking-wider">
              Control Deck
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs font-medium">Real-Time Tournament Ecosystem</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white">
            OPERATIONS & REVENUE DASHBOARD
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Live analytics overview of automated Free Fire matches, bKash deposits, winning payouts, and player traffic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          <Link
            href="/admin/tournaments"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-red hover:brightness-110 transition-all flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>CREATE TOURNAMENT</span>
          </Link>
          <Link
            href="/admin/withdrawals"
            className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-brand-gold border border-brand-gold/30 font-heading font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>PAYOUT QUEUE</span>
          </Link>
          <Link
            href="/admin/roles"
            className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 font-heading font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>SUB-ADMINS</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Revenue */}
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl space-y-3 relative overflow-hidden group hover:border-brand-orange/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Net Revenue</span>
            <div className="w-9 h-9 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center border border-brand-orange/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="font-heading font-black text-3xl text-brand-orange drop-shadow-sm">
              ৳ {(totalRevenueAmount || 184000).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
              <TrendingUp className="w-3.5 h-3.5" /> +28.4% vs last week
            </div>
          </div>
        </div>

        {/* Metric 2: Active Competitions */}
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl space-y-3 relative overflow-hidden group hover:border-brand-red/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Tournaments</span>
            <div className="w-9 h-9 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center border border-brand-red/20">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="font-heading font-black text-3xl text-white">
              {activeTournaments || 8}
            </div>
            <div className="text-[11px] text-brand-red font-bold flex items-center gap-1 font-mono">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>{tournaments.filter(t => t.status === 'LIVE').length || 2} Live in Progress</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Pending Approvals */}
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl space-y-3 relative overflow-hidden group hover:border-brand-gold/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Verifications</span>
            <div className="w-9 h-9 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center border border-brand-gold/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="font-heading font-black text-3xl text-brand-gold">
              {pendingPayments}
            </div>
            <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> bKash/Nagad Deposits
            </div>
          </div>
        </div>

        {/* Metric 4: Total Players */}
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl space-y-3 relative overflow-hidden group hover:border-brand-cyan/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Verified Players</span>
            <div className="w-9 h-9 rounded-2xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center border border-brand-cyan/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="font-heading font-black text-3xl text-brand-cyan">
              {totalUsersCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Active Registered Accounts
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revenue Analytics Chart */}
        <div className="lg:col-span-7 bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-orange" />
              <span>Weekly Entry Fee Revenue (BDT)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400 font-bold">7-Day Trend</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0D1322', borderColor: '#334155', color: '#f8fafc', borderRadius: '1rem' }} />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player Activity Bar Chart */}
        <div className="lg:col-span-5 bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-lg text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-red" />
              <span>Daily Active Contestants</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400 font-bold">Peak Evening</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0D1322', borderColor: '#334155', color: '#f8fafc', borderRadius: '1rem' }} />
                <Bar dataKey="players" fill="#FF1E42" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Live Tournaments Running Quick Status */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-black text-xl text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-gold" />
            <span>Active Tournaments Queue</span>
          </h3>
          <Link
            href="/admin/tournaments"
            className="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
          >
            <span>View All Tournaments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.slice(0, 3).map((tour) => (
            <div
              key={tour.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                  {tour.mode} • {tour.format}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tour.status === 'LIVE' ? 'bg-red-900/40 text-red-400 animate-pulse border border-red-500/30' :
                  tour.status === 'UPCOMING' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {tour.status}
                </span>
              </div>

              <div className="font-heading font-black text-base text-white truncate">
                {tour.title}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div>Entry: <strong className="text-white">৳{tour.entryFee}</strong></div>
                <div>Prize: <strong className="text-brand-gold">৳{tour.prizePool}</strong></div>
                <div>Slots: <strong className="text-brand-cyan">{tour.registeredCount}/{tour.maxTeams}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
