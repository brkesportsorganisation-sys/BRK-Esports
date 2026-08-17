'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Unlock, 
  RefreshCw, 
  Loader2, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Phone, 
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface UnlockItem {
  id: string;
  conversationId: string;
  buyerId: string;
  sellerId: string;
  buyerName: string;
  sellerName: string;
  amountPaid: number;
  sellerPhone?: string;
  sellerWhatsApp?: string;
  status: string;
  createdAt: string;
  unlockedAt: string;
}

export default function AdminContactUnlocksPage() {
  const [unlocks, setUnlocks] = useState<UnlockItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUnlocks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/messages/unlocks', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnlocks(data.unlocks || []);
        setTotalRevenue(data.totalRevenue || 0);
      }
    } catch (err) {
      console.warn('Failed to load contact unlocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnlocks();
  }, []);

  const filtered = unlocks.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.buyerName?.toLowerCase().includes(q) ||
      u.sellerName?.toLowerCase().includes(q) ||
      u.buyerId?.toLowerCase().includes(q) ||
      u.sellerId?.toLowerCase().includes(q) ||
      u.sellerWhatsApp?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Contact Unlock Monetization Reports
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Log of all paid buyer-seller WhatsApp and phone number unlocks.
          </p>
        </div>

        <button
          onClick={loadUnlocks}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Report</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Unlock Revenue</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">৳ {totalRevenue.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Paid Contacts Unlocked</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">{unlocks.length}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-blue-50 text-blue-600 flex items-center justify-center">
            <Unlock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Average Service Fee</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              ৳ {unlocks.length > 0 ? (totalRevenue / unlocks.length).toFixed(0) : '20'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by buyer, seller, number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 4. Unlocks Table */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-emerald-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-[#475569] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-[#0F172A] text-base">No Unlock Transactions Recorded</div>
            <div className="text-xs">Paid contact unlocks will appear here automatically.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Buyer (Customer)</th>
                  <th className="py-3.5 px-5">Seller (Contact Unlocked)</th>
                  <th className="py-3.5 px-5">Revealed WhatsApp / Phone</th>
                  <th className="py-3.5 px-5">Service Fee Paid</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Unlocked Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#0F172A] text-xs">{u.buyerName}</div>
                      <div className="text-[10px] font-mono text-slate-500">ID: {u.buyerId}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-[#0F172A] text-xs">{u.sellerName}</div>
                      <div className="text-[10px] font-mono text-slate-500">ID: {u.sellerId}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 inline-block">
                        {u.sellerWhatsApp || u.sellerPhone || 'N/A'}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-heading font-extrabold text-slate-900 text-sm">
                        ৳ {Number(u.amountPaid).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                        {u.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right text-xs text-slate-500 font-mono">
                      {new Date(u.unlockedAt || u.createdAt).toLocaleString()}
                    </td>
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
