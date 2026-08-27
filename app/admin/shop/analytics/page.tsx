'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  DollarSign, 
  Coins, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  Calendar,
  CreditCard,
  Percent
} from 'lucide-react';

export default function AdminShopAnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/shop', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.warn('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totalCashRevenue = stats.totalCashRevenue || 0;
  const totalCoinsSpent = stats.totalCoinsSpent || 0;
  const completedCount = stats.completedDeliveries || 0;
  const totalOrders = stats.totalOrders || 0;
  const fulfillmentRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0;

  // Group top products by name
  const productSales: { [name: string]: { count: number; totalCash: number; totalCoins: number } } = {};
  orders.forEach((o) => {
    const itemMatch = (o.notes || '').match(/\[Shop Order\]\s*([^|]+)/i);
    const name = itemMatch ? itemMatch[1].trim() : 'Unknown Product';
    if (!productSales[name]) {
      productSales[name] = { count: 0, totalCash: 0, totalCoins: 0 };
    }
    productSales[name].count += 1;
    if (o.method === 'COINS') {
      productSales[name].totalCoins += Number(o.amount || 0);
    } else {
      productSales[name].totalCash += Number(o.amount || 0);
    }
  });

  const sortedProducts = Object.entries(productSales).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-violet-600" />
            <span>Shop Sales & Revenue Financial Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time breakdown of cash earnings, coin redemptions, fulfillment velocity, and top selling gaming packages.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadAnalytics}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/admin/shop/orders"
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>View Orders Queue</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Cash Revenue</span>
          </span>
          <div className="text-2xl font-heading font-black text-emerald-600">
            ৳ {totalCashRevenue.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500">Collected via Wallet Payments</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Coins Redeemed</span>
          </span>
          <div className="text-2xl font-heading font-black text-amber-600">
            {totalCoinsSpent.toLocaleString()} 🪙
          </div>
          <p className="text-[10px] text-slate-500">Player rewards spent in shop</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Fulfillment Rate</span>
          </span>
          <div className="text-2xl font-heading font-black text-blue-600">
            {fulfillmentRate}%
          </div>
          <p className="text-[10px] text-slate-500">{completedCount} of {totalOrders} orders fulfilled</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
            <span>Total Packages Sold</span>
          </span>
          <div className="text-2xl font-heading font-black text-purple-600">
            {totalOrders}
          </div>
          <p className="text-[10px] text-slate-500">Across all categories</p>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Method Share */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <h3 className="font-heading font-black text-base text-slate-900 border-b border-slate-100 pb-3">
            Payment Method Share
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Wallet Cash (৳ BDT)
                </span>
                <span className="text-emerald-600">৳{totalCashRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${totalOrders > 0 ? (orders.filter(o => o.method !== 'COINS').length / totalOrders) * 100 : 50}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-slate-700 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500" /> BRK Coins (🪙 Redemptions)
                </span>
                <span className="text-amber-600">{totalCoinsSpent.toLocaleString()} 🪙</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${totalOrders > 0 ? (orders.filter(o => o.method === 'COINS').length / totalOrders) * 100 : 50}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment Velocity */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <h3 className="font-heading font-black text-base text-slate-900 border-b border-slate-100 pb-3">
            Fulfillment Queue Breakdown
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
              <span className="font-bold block text-[11px] uppercase">Delivered</span>
              <strong className="text-2xl font-black">{stats.completedDeliveries || 0}</strong>
              <p className="text-[10px] text-emerald-800 mt-1">Verified deliveries</p>
            </div>

            <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950">
              <span className="font-bold block text-[11px] uppercase">Processing</span>
              <strong className="text-2xl font-black">{stats.processingDeliveries || 0}</strong>
              <p className="text-[10px] text-cyan-800 mt-1">Being dispatched</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
              <span className="font-bold block text-[11px] uppercase">Pending</span>
              <strong className="text-2xl font-black">{stats.pendingDeliveries || 0}</strong>
              <p className="text-[10px] text-amber-800 mt-1">Awaiting review</p>
            </div>

            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-950">
              <span className="font-bold block text-[11px] uppercase">Refunded</span>
              <strong className="text-2xl font-black">{stats.rejectedDeliveries || 0}</strong>
              <p className="text-[10px] text-red-800 mt-1">Returned to wallet</p>
            </div>
          </div>
        </div>

      </div>

      {/* Top Selling Products Table */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <h3 className="font-heading font-black text-base text-slate-900 border-b border-slate-100 pb-3">
          Top Selling Gaming Items & Packages
        </h3>

        {sortedProducts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">No product sales data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Units Sold</th>
                  <th className="p-3">Total Cash (৳)</th>
                  <th className="p-3">Total Coins (🪙)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProducts.map(([name, data], idx) => (
                  <tr key={name} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{name}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{data.count} units</td>
                    <td className="p-3 font-mono font-bold text-emerald-600">৳{data.totalCash.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-amber-600">{data.totalCoins.toLocaleString()} 🪙</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
