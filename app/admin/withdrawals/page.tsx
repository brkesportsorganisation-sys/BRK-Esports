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
  Search,
  Copy,
  PhoneCall,
  Smartphone
} from 'lucide-react';
import { Payment } from '@/lib/types';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  
  // Approve modal state
  const [approveModalWithdrawal, setApproveModalWithdrawal] = useState<Payment | null>(null);
  const [adminTrxId, setAdminTrxId] = useState('');
  const [adminNote, setAdminNote] = useState('');

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

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const handleAction = async (
    withdrawalId: string, 
    action: 'APPROVE' | 'REJECT', 
    customReason?: string,
    trx?: string,
    note?: string
  ) => {
    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withdrawalId, 
          action, 
          rejectionReason: customReason,
          adminTrxId: trx,
          adminNote: note
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setApproveModalWithdrawal(null);
        setRejectModalWithdrawal(null);
        setAdminTrxId('');
        setAdminNote('');
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
      w.senderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      w.trxId?.toLowerCase().includes(search.toLowerCase()) ||
      w.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const extractPhoneNumber = (w: Payment) => {
    if (w.senderNumber && w.senderNumber.trim().length >= 10) return w.senderNumber.trim();
    const match = (w.notes || '').match(/01[3-9]\d{8}/);
    if (match) return match[0];
    return w.senderNumber || 'N/A';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header & KPI Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Winning Wallet Payout Queue
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Review, copy player bKash/Nagad phone numbers, send money, and approve withdrawal requests.
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

      {/* Operator Workflow Guide Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
            ৳
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">How Withdrawal Processing Works:</div>
            <div className="text-[11px] text-slate-600">
              1. Click the <strong>Copy Phone Number</strong> icon &nbsp;➔&nbsp; 
              2. Open bKash/Nagad app &amp; Send Money &nbsp;➔&nbsp; 
              3. Click <strong>Mark Paid</strong> to approve and notify player.
            </div>
          </div>
        </div>
        <div className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-3 py-1.5 rounded-xl self-end md:self-auto border border-amber-300/50">
          Manual Payout Review System
        </div>
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
            placeholder="Search by player, bKash number, TrxID..."
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
                  <th className="py-3.5 px-5">Payout Method &amp; Number</th>
                  <th className="py-3.5 px-5">Cashout Amount</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredWithdrawals.map((w) => {
                  const phoneNum = extractPhoneNumber(w);
                  return (
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

                        {/* Phone Number with 1-Click Copy Button */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-mono font-bold text-xs text-slate-900">{phoneNum}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(phoneNum)}
                              className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 transition-colors"
                              title="Copy Phone Number to Clipboard"
                            >
                              {copiedPhone === phoneNum ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-600" />
                              )}
                            </button>
                          </div>
                          {copiedPhone === phoneNum && (
                            <span className="text-[10px] text-emerald-600 font-bold animate-fade-in">
                              Copied!
                            </span>
                          )}
                        </div>

                        {w.notes && (
                          <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate">
                            {w.notes}
                          </div>
                        )}
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
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          w.status === 'VERIFIED' ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' :
                          w.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200 animate-pulse' :
                          'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {w.status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                          {w.status === 'PENDING' && <Clock className="w-3 h-3" />}
                          {w.status === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
                          <span>{w.status === 'VERIFIED' ? 'PAID' : w.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        {w.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setApproveModalWithdrawal(w);
                                setAdminTrxId('');
                                setAdminNote('');
                              }}
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
                              <span>Decline &amp; Refund</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-bold font-mono">
                            {w.status === 'VERIFIED' ? 'Completed' : 'Refunded'}
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

      {/* Approve Modal (Confirm Payout with optional TrxID) */}
      {approveModalWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-[#E2E8F0] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Confirm Cashout Payout</span>
              </h3>
              <button 
                onClick={() => setApproveModalWithdrawal(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Player:</span>
                <span className="font-bold text-slate-900">{approveModalWithdrawal.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Payout Method:</span>
                <span className="font-bold text-slate-900 uppercase">{approveModalWithdrawal.method}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Target Phone Number:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-emerald-800">
                  <span>{extractPhoneNumber(approveModalWithdrawal)}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(extractPhoneNumber(approveModalWithdrawal))}
                    className="p-1 rounded hover:bg-emerald-100 text-emerald-700"
                    title="Copy Phone Number"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                <span className="text-slate-700 font-bold">Payout Amount:</span>
                <span className="font-heading font-black text-emerald-700 text-lg">
                  ৳ {Number(approveModalWithdrawal.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Sender Transaction ID / TrxID (Optional):
                </label>
                <input
                  type="text"
                  value={adminTrxId}
                  onChange={(e) => setAdminTrxId(e.target.value)}
                  placeholder="e.g. 9K2839... (bKash/Nagad TrxID)"
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Internal Note (Optional):
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Sent via Personal Agent App"
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalWithdrawal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === approveModalWithdrawal.id}
                onClick={() => handleAction(approveModalWithdrawal.id, 'APPROVE', undefined, adminTrxId, adminNote)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
              >
                {processingId === approveModalWithdrawal.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Mark Paid</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject & Refund Reason Modal */}
      {rejectModalWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full border border-[#E2E8F0] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Decline &amp; Refund Cashout</span>
              </h3>
              <button 
                onClick={() => setRejectModalWithdrawal(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">
                Player: {rejectModalWithdrawal.userName} (৳{rejectModalWithdrawal.amount})
              </div>
              <div className="text-[11px] text-amber-800 font-medium">
                Note: Declining this cashout will <strong>automatically refund ৳{rejectModalWithdrawal.amount}</strong> back into the player's Winning Wallet.
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Select or Enter Reason for Player:</label>
              
              <div className="space-y-1">
                {[
                  'Incorrect or invalid mobile banking account number',
                  'Personal account required / Account limit reached',
                  'Number is not registered on bKash / Nagad',
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

