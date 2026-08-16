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
  AlertTriangle
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
    { day: 'Mon', revenue: 12000, players: 450 },
    { day: 'Tue', revenue: 18000, players: 620 },
    { day: 'Wed', revenue: 15000, players: 590 },
    { day: 'Thu', revenue: 24000, players: 810 },
    { day: 'Fri', revenue: 32000, players: 1100 },
    { day: 'Sat', revenue: 45000, players: 1420 },
    { day: 'Sun', revenue: 38000, players: 1250 },
  ];

  return (
    <div className="flex flex-col font-body w-full">
      {/* Admin Header */}
      <div className="bg-white border-b border-slate-200 py-6 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading font-black text-2xl text-slate-900">ADMIN COMMAND CENTER</h1>
              <div className="text-xs text-slate-500 mt-1">Managing Black Rock Tournament Network</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap justify-end">
            <Link
              href="/admin/tournaments"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-heading font-bold text-xs shadow-sm flex items-center space-x-1.5 hover:opacity-90 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>NEW TOURNAMENT</span>
            </Link>
            <Link
              href="/vendor/login"
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-white font-heading font-bold text-xs shadow-sm flex items-center space-x-1.5 hover:bg-slate-700 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>VENDOR LOGIN</span>
            </Link>
            <Link
              href="/admin/payments"
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-heading font-bold text-xs shadow-sm flex items-center space-x-1.5 border border-slate-200 hover:bg-slate-200 transition"
            >
              <CreditCard className="w-4 h-4" />
              <span>PAYMENT QUEUE ({pendingPayments.length})</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 flex-1 w-full space-y-8">
        
        {/* Top Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Total Weekly Revenue</span>
              <DollarSign className="w-4 h-4 text-orange-500" />
            </div>
            <div className="font-heading font-black text-3xl text-orange-500">৳ 1,84,000</div>
            <div className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +24% vs last week
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Active Competitions</span>
              <Trophy className="w-4 h-4 text-red-500" />
            </div>
            <div className="font-heading font-black text-3xl text-slate-800">{activeTournaments.length}</div>
            <div className="text-[11px] text-red-500 font-semibold">
              {tournaments.filter(t => t.status === 'LIVE').length} Live Right Now
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Pending Payments</span>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="font-heading font-black text-3xl text-indigo-500">{pendingPayments.length}</div>
            <div className="text-[11px] text-orange-500 font-semibold">Requires Verification</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Total Registered Players</span>
              <Users className="w-4 h-4 text-sky-500" />
            </div>
            <div className="font-heading font-black text-3xl text-sky-500">{users.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold">Verified Free Fire UIDs</div>
          </div>

        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Revenue Chart */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-heading font-extrabold text-xl text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" /> Weekly Revenue Trend (BDT)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Player Registrations Chart */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-heading font-extrabold text-xl text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-red-500" /> Daily Active Players
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                  <Bar dataKey="players" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
