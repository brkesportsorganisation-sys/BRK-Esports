'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Check, 
  X, 
  Eye, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  Search,
  Filter,
  Copy,
  AlertCircle
} from 'lucide-react';
import { Payment } from '@/lib/types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  const refreshPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      } else {
        console.warn('Failed to load payments from Supabase');
      }
    } catch (err) {
      console.warn('Payments load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPayments();
  }, []);

  const handleVerify = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentId: id, action }),
      });
      if (res.ok) {
        await refreshPayments();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Action failed.');
      }
    } catch (err) {
      console.error('Verify error:', err);
      alert('Network error while processing deposit.');
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrx(text);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const verifiedCount = payments.filter((p) => p.status === 'VERIFIED').length;
  const totalDepositAmount = payments
    .filter((p) => p.status === 'VERIFIED')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      p.userName?.toLowerCase().includes(search.toLowerCase()) ||
      p.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      p.trxId?.toLowerCase().includes(search.toLowerCase()) ||
      p.method?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header & KPI Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Deposit Verification Queue
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Review and verify manual bKash, Nagad, and Rocket mobile deposits.
          </p>
        </div>

        <button
          onClick={refreshPayments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Pending Verifications</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Approved Deposits</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{verifiedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Verified Volume</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">৳ {totalDepositAmount.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search and Status Filter */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player, TrxID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-slate-500 focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Deposits Table */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#2563EB]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-16 text-center text-[#475569] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-[#0F172A] text-base">No Deposits Found</div>
            <div className="text-xs">No payment records matching the selected filter in Supabase.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Player Details</th>
                  <th className="py-3.5 px-5">Method & Amount</th>
                  <th className="py-3.5 px-5">TrxID</th>
                  <th className="py-3.5 px-5">Receipt Proof</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Submitted At</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#0F172A] text-xs">{p.userName || 'Player'}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{p.userEmail}</div>
                      <div className="text-[10px] font-mono text-slate-500 font-bold">ID: {p.userId}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] font-bold text-[10px] uppercase border border-blue-100">
                          {p.method}
                        </span>
                        <span className="font-bold text-[#0F172A] text-sm">
                          ৳ {Number(p.amount).toLocaleString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded">
                          {p.trxId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(p.trxId)}
                          className="text-slate-500 hover:text-[#2563EB] p-1 transition-colors"
                          title="Copy TrxID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedTrx === p.trxId && (
                          <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {p.screenshot ? (
                        <button
                          onClick={() => setSelectedScreenshot(p.screenshot || null)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#2563EB] text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8] italic">No receipt</span>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'VERIFIED' ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' :
                        p.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-xs text-[#64748B] font-mono">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A'}
                    </td>

                    <td className="py-4 px-5 text-right">
                      {p.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerify(p.id, 'APPROVE')}
                            disabled={processingId === p.id}
                            className="px-3 py-1.5 rounded-[10px] bg-[#059669] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleVerify(p.id, 'REJECT')}
                            disabled={processingId === p.id}
                            className="px-3 py-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#94A3B8] font-mono">
                          {p.status === 'VERIFIED' ? 'Credited' : 'Declined'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Screenshot Viewer Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-lg w-full border border-[#E2E8F0] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0F172A]">Transaction Proof Screenshot</h3>
              <button 
                onClick={() => setSelectedScreenshot(null)} 
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-[16px] overflow-hidden border border-[#E2E8F0] max-h-[65vh] flex items-center justify-center bg-slate-50">
              <img src={selectedScreenshot} alt="Payment Receipt" className="max-w-full max-h-full object-contain" />
            </div>
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="w-full py-2.5 rounded-[12px] bg-[#0F172A] text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
