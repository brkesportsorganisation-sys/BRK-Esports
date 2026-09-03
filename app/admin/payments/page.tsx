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

  const [rejectModalPayment, setRejectModalPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid Transaction ID (TrxID) or payment not received');

  const handleVerify = async (id: string, action: 'APPROVE' | 'REJECT', customReason?: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          paymentId: id, 
          action, 
          rejectionReason: customReason 
        }),
      });
      if (res.ok) {
        await refreshPayments();
        setRejectModalPayment(null);
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

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEPOSITS' | 'MATCH_ENTRIES'>('ALL');

  const pendingCount = payments.filter((p) => p.status === 'PENDING' && (p.method === 'BKASH' || p.method === 'NAGAD' || p.method === 'ROCKET')).length;
  const verifiedCount = payments.filter((p) => p.status === 'VERIFIED' && (p.method === 'BKASH' || p.method === 'NAGAD' || p.method === 'ROCKET')).length;
  const totalDepositAmount = payments
    .filter((p) => p.status === 'VERIFIED' && (p.method === 'BKASH' || p.method === 'NAGAD' || p.method === 'ROCKET'))
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      p.userName?.toLowerCase().includes(search.toLowerCase()) ||
      p.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      p.trxId?.toLowerCase().includes(search.toLowerCase()) ||
      (p as any).accountNumber?.toLowerCase().includes(search.toLowerCase()) ||
      (p as any).inGameName?.toLowerCase().includes(search.toLowerCase()) ||
      p.notes?.toLowerCase().includes(search.toLowerCase()) ||
      p.method?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    const isMatchEntry = p.trxId?.startsWith('WAL_') || p.notes?.toLowerCase().includes('squad registration') || p.notes?.toLowerCase().includes('tournament');
    const matchesType = 
      typeFilter === 'ALL' ? true :
      typeFilter === 'DEPOSITS' ? (p.method === 'BKASH' || p.method === 'NAGAD' || p.method === 'ROCKET') && !isMatchEntry :
      typeFilter === 'MATCH_ENTRIES' ? isMatchEntry : true;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header & KPI Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Deposit & Payment Logs
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Review manual mobile deposits (bKash/Nagad) and tournament match fee entry logs.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/admin/settings?tab=PAYMENTS"
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Payment Numbers</span>
          </Link>

          <button
            onClick={refreshPayments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Pending Mobile Deposits</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Approved Mobile Deposits</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{verifiedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Deposit Volume</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">৳ {totalDepositAmount.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search and Multi-Filter Bar */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player, IGN, email, TrxID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-slate-500 focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[12px]">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-[9px] text-[11px] font-bold transition-all cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setTypeFilter('DEPOSITS')}
              className={`px-3 py-1.5 rounded-[9px] text-[11px] font-bold transition-all cursor-pointer ${
                typeFilter === 'DEPOSITS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cash Deposits
            </button>
            <button
              onClick={() => setTypeFilter('MATCH_ENTRIES')}
              className={`px-3 py-1.5 rounded-[9px] text-[11px] font-bold transition-all cursor-pointer ${
                typeFilter === 'MATCH_ENTRIES' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Match Entries (৳0)
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${
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
            <div className="font-bold text-[#0F172A] text-base">No Transactions Found</div>
            <div className="text-xs">No payment records matching the selected filter in Supabase.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Player Profile</th>
                  <th className="py-3.5 px-5">Type / Method & Amount</th>
                  <th className="py-3.5 px-5">Transaction ID & Details</th>
                  <th className="py-3.5 px-5">Receipt Proof</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Submitted At</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredPayments.map((p) => {
                  const isMatchEntry = p.trxId?.startsWith('WAL_') || p.notes?.toLowerCase().includes('squad registration') || p.notes?.toLowerCase().includes('tournament');
                  const pAny = p as any;

                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#0F172A] text-xs flex items-center gap-1.5">
                          <span>{p.userName || 'Player'}</span>
                          {pAny.inGameName && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono font-bold">
                              IGN: {pAny.inGameName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">{p.userEmail || 'No email attached'}</div>
                        <div className="text-[10px] font-mono text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                          <span>{pAny.accountNumber || `ID: ${p.userId}`}</span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                              p.method === 'BKASH' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                              p.method === 'NAGAD' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              p.method === 'ROCKET' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              isMatchEntry ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {isMatchEntry ? 'MATCH ENTRY' : p.method}
                            </span>
                            <span className="font-bold text-[#0F172A] text-sm font-mono">
                              ৳ {Number(p.amount).toLocaleString()}
                            </span>
                          </div>
                          {isMatchEntry && (
                            <div className="text-[10px] text-indigo-600 font-semibold">
                              Tournament Slot Registration
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded">
                              {p.trxId}
                            </span>
                            <button
                              onClick={() => copyToClipboard(p.trxId)}
                              className="text-slate-500 hover:text-[#2563EB] p-1 transition-colors cursor-pointer"
                              title="Copy TrxID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {copiedTrx === p.trxId && (
                              <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                            )}
                          </div>
                          {p.notes && (
                            <div className="text-[10px] text-slate-500 max-w-[220px] truncate" title={p.notes}>
                              {p.notes}
                            </div>
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
                      {p.status === 'PENDING' && (
                        Number(p.amount) >= 500 || p.notes?.includes('NOT Auto-Credited') || p.notes?.includes('Manual Approval') ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                            <span>Pending Approval (&gt;= ৳500 • Not Credited)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            <span>Auto-Credited (&lt; ৳500 • Pending Review)</span>
                          </span>
                        )
                      )}
                      {p.status === 'VERIFIED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] inline-flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified & Credited</span>
                        </span>
                      )}
                      {p.status === 'REJECTED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1 shadow-2xs">
                          <X className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
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
                            className="px-3 py-1.5 rounded-[10px] bg-[#059669] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                            title={Number(p.amount) >= 500 || p.notes?.includes('NOT Auto-Credited') || p.notes?.includes('Manual Approval') ? "Approve deposit and credit balance to player's wallet" : "Confirm payment and keep balance"}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{Number(p.amount) >= 500 || p.notes?.includes('NOT Auto-Credited') || p.notes?.includes('Manual Approval') ? `Approve & Add ৳${p.amount}` : 'Confirm & Keep'}</span>
                          </button>
                          <button
                            onClick={() => setRejectModalPayment(p)}
                            disabled={processingId === p.id}
                            className="px-3 py-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                            title={Number(p.amount) >= 500 || p.notes?.includes('NOT Auto-Credited') || p.notes?.includes('Manual Approval') ? "Reject request without balance deduction" : "Reject fake deposit and deduct balance"}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{Number(p.amount) > 500 || p.notes?.includes('NOT Auto-Credited') ? 'Reject' : 'Reject & Minus'}</span>
                          </button>
                        </div>
                      ) : p.status === 'VERIFIED' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-emerald-600 font-bold font-mono">
                            Credited ✓
                          </span>
                          <button
                            onClick={() => setRejectModalPayment(p)}
                            disabled={processingId === p.id}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="Reverse payment and deduct balance"
                          >
                            Reverse & Deduct
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-red-600 font-medium font-mono">
                          Rejected ✕
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              <h3 className="font-bold text-base text-[#0F172A]">Payment Screenshot Proof</h3>
              <button 
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200">
              <img src={selectedScreenshot} alt="Deposit Receipt Proof" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* 6. Reject Deposit Reason Modal */}
      {rejectModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-[#E2E8F0] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>
                  {Number(rejectModalPayment.amount) > 500 && rejectModalPayment.status === 'PENDING'
                    ? 'Reject Deposit Request'
                    : 'Reject & Deduct Balance'}
                </span>
              </h3>
              <button 
                onClick={() => setRejectModalPayment(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50/80 border border-red-200 text-xs space-y-1">
              <div className="font-bold text-red-950 flex items-center justify-between">
                <span>{rejectModalPayment.userName}</span>
                <span className="text-red-700 font-extrabold font-mono text-sm">
                  {Number(rejectModalPayment.amount) > 500 && rejectModalPayment.status === 'PENDING'
                    ? `Amount: ৳${rejectModalPayment.amount}`
                    : `Deduct: -৳${rejectModalPayment.amount}`}
                </span>
              </div>
              <div className="font-mono text-red-800/80 text-[11px]">TrxID: {rejectModalPayment.trxId} • {rejectModalPayment.method}</div>
              <div className="text-[10px] text-red-600 mt-1 font-medium">
                {Number(rejectModalPayment.amount) > 500 && rejectModalPayment.status === 'PENDING'
                  ? '⚠️ এই ডিপোজিটটি ৫০০ টাকার বেশি হওয়ায় ইউজারের ওয়ালেটে পূর্বে যুক্ত করা হয়নি। তাই কোনো ব্যালেন্স কর্তন হবে না, শুধুমাত্র রিকোয়েস্টটি বাতিল করা হবে।'
                  : `⚠️ এই ট্রানজেকশনটি বাতিল করা হলে ইউজারের ওয়ালেট থেকে স্বয়ংক্রিয়ভাবে ৳${rejectModalPayment.amount} মাইনাস (Deduct) হয়ে যাবে এবং ইউজারকে নোটিফিকেশন পাঠানো হবে।`}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Select or Enter Rejection Reason:</label>
              
              <div className="space-y-1">
                {[
                  'Invalid Transaction ID (TrxID) or payment not received',
                  'Amount mismatch (deposited amount is lower)',
                  'Fake or duplicate receipt submission',
                  'Transaction ID already claimed by another user'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      rejectReason === reason ? 'bg-red-50 text-red-700 border border-red-200 font-bold' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Custom reason..."
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectModalPayment.id}
                onClick={() => handleVerify(rejectModalPayment.id, 'REJECT', rejectReason)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>
                  {Number(rejectModalPayment.amount) > 500 && rejectModalPayment.status === 'PENDING'
                    ? 'Confirm Reject'
                    : 'Confirm & Deduct'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
