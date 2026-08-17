'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  DollarSign, 
  ShieldCheck,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { Payment } from '@/lib/types';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  
  // Rejection modal state
  const [rejectModalWithdrawal, setRejectModalWithdrawal] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid account number or payment declined');

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/withdrawals');
      if (res.ok) {
        const data = await res.json();
        if (data.withdrawals) {
          setWithdrawals(data.withdrawals);
        }
      }
    } catch (err) {
      console.warn('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const handleAction = async (withdrawalId: string, action: 'APPROVE' | 'REJECT', customReason?: string) => {
    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withdrawalId, 
          action, 
          rejectionReason: customReason 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Action executed successfully.');
        setRejectModalWithdrawal(null);
        await loadWithdrawals();
      } else {
        alert(data.message || 'Action failed.');
      }
    } catch {
      alert('Failed to process withdrawal.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = withdrawals.filter((w) => w.status === 'PENDING').length;
  const verifiedCount = withdrawals.filter((w) => w.status === 'VERIFIED').length;
  const totalPaid = withdrawals
    .filter((w) => w.status === 'VERIFIED')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const filteredWithdrawals = withdrawals.filter((w) => {
    const matchesSearch = 
      w.userName?.toLowerCase().includes(search.toLowerCase()) ||
      w.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      w.trxId?.toLowerCase().includes(search.toLowerCase()) ||
      w.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header & KPI Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Winning Wallet Payout Queue
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Review, approve, or reject player cashout withdrawals to bKash, Nagad, and Rocket numbers.
          </p>
        </div>

        <button
          onClick={loadWithdrawals}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] text-xs font-semibold shadow-xs self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Pending Cashouts</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Approved Payouts</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{verifiedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0]/80 p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#64748B]">Total Distributed Cash</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-1">৳ {totalPaid.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player, number, TrxID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-amber-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-16 text-center text-[#475569] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-[#0F172A] text-base">No Withdrawal Requests Found</div>
            <div className="text-xs">All player winning payouts are fully settled.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-slate-700 text-[11px] uppercase font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-5">Player Details</th>
                  <th className="py-3.5 px-5">Payout Method & Details</th>
                  <th className="py-3.5 px-5">Cashout Amount</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#0F172A] text-xs">{w.userName || 'Player'}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{w.userEmail}</div>
                      <div className="text-[10px] font-mono text-slate-500 font-bold">ID: {w.userId}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                          w.method === 'BKASH' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                          w.method === 'NAGAD' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          'bg-purple-50 text-purple-600 border-purple-200'
                        }`}>
                          {w.method}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700">{w.trxId}</span>
                      </div>
                      <div className="text-xs text-slate-800 mt-1 font-mono font-bold bg-slate-100 px-2 py-1 rounded inline-block">
                        {w.notes || 'No account notes'}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-heading font-black text-amber-600 text-base">
                        ৳ {Number(w.amount).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono font-medium">
                        {w.createdAt ? new Date(w.createdAt).toLocaleString() : 'N/A'}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        w.status === 'VERIFIED' ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' :
                        w.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {w.status === 'VERIFIED' ? 'PAID' : w.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      {w.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(w.id, 'APPROVE')}
                            disabled={processingId === w.id}
                            className="px-3.5 py-1.5 rounded-[10px] bg-[#059669] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                          <button
                            onClick={() => setRejectModalWithdrawal(w)}
                            disabled={processingId === w.id}
                            className="px-3.5 py-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline & Refund</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold font-mono">
                          {w.status === 'VERIFIED' ? 'Completed' : 'Refunded'}
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

      {/* Reject & Refund Reason Modal */}
      {rejectModalWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-[#E2E8F0] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Decline & Refund Cashout</span>
              </h3>
              <button 
                onClick={() => setRejectModalWithdrawal(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">Player: {rejectModalWithdrawal.userName} (৳{rejectModalWithdrawal.amount})</div>
              <div className="text-[11px] text-amber-800 font-medium">
                Note: Declining this cashout will <strong>automatically refund ৳{rejectModalWithdrawal.amount}</strong> back into the player's Winning Wallet.
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Select or Enter Reason for Player:</label>
              
              <div className="space-y-1">
                {[
                  'Incorrect or invalid mobile banking account number',
                  'Account number limit reached / Personal account required',
                  'Suspicious match activity under review',
                  'Account verification required before cashout'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] font-medium transition-colors ${
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
                onClick={() => setRejectModalWithdrawal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectModalWithdrawal.id}
                onClick={() => handleAction(rejectModalWithdrawal.id, 'REJECT', rejectReason)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
              >
                {processingId === rejectModalWithdrawal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Refund</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
