'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  Coins, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Percent, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowUpRight,
  Wallet,
  Sparkles,
  Trophy
} from 'lucide-react';
import { VendorPayoutRequest } from '@/lib/types';

function VendorEarningsContent() {
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [payouts, setPayouts] = useState<VendorPayoutRequest[]>([]);
  
  // Payout Request Form State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'BKASH' | 'NAGAD' | 'ROCKET'>('BKASH');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    try {
      const resE = await fetch('/api/vendor/earnings', { credentials: 'include' });
      if (resE.ok) {
        const dataE = await resE.json();
        setEarningsData(dataE);
      }

      const resP = await fetch('/api/vendor/payouts', { credentials: 'include' });
      if (resP.ok) {
        const dataP = await resP.json();
        setPayouts(dataP.payouts || []);
      }
    } catch (err) {
      console.warn('Failed to load earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Number(amount),
          method,
          accountNumber,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Withdrawal payout request submitted! Admin review in progress.');
        setIsPayoutModalOpen(false);
        setAmount('');
        setAccountNumber('');
        setNotes('');
        await loadData();
      } else {
        setErrorMessage(data.message || 'Failed to submit payout request.');
      }
    } catch {
      setErrorMessage('Network error while requesting payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-emerald-400 font-bold">
              FINANCIAL LEDGER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
            My Tournament Earnings & Cashout
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track gross entry fee collections, net commission split, escrow holdings, and request bKash/Nagad cashout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/vendor"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>REQUEST CASHOUT</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Available Balance */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-[#0C101A] to-[#0C101A] p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Available For Cashout</span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            ৳ {earningsData ? earningsData.availableEarnings.toLocaleString() : '0'}
          </div>
          <p className="text-[10px] text-slate-400">From verified & finished tournaments.</p>
        </div>

        {/* Escrow Balance */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-[#0C101A] to-[#0C101A] p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">In Escrow (Upcoming/Live)</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-200 font-mono">
            ৳ {earningsData ? earningsData.escrowEarnings.toLocaleString() : '0'}
          </div>
          <p className="text-[10px] text-slate-400">Released once match results are finalized.</p>
        </div>

        {/* Commission Rate */}
        <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-[#0C101A] to-[#0C101A] p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Your Commission Split</span>
            <Percent className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-3xl font-black text-violet-200 font-mono">
            {earningsData ? earningsData.commissionRate : '80'}% Cut
          </div>
          <p className="text-[10px] text-slate-400">Platform fee: {100 - (earningsData?.commissionRate || 80)}%</p>
        </div>

      </div>

      {/* Tournament Earnings Breakdown */}
      <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-heading font-black text-base text-white">Tournament Revenue Share Breakdown</h2>
            <p className="text-xs text-slate-400">Detailed itemized list of all your hosted matches.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-violet-400 font-mono text-xs">LOADING EARNINGS LEDGER...</div>
        ) : !earningsData || earningsData.breakdown.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-400">No Tournament Earnings Yet</p>
            <p>Earnings from player entry fees will show up here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Tournament</th>
                  <th className="p-3">Teams Joined</th>
                  <th className="p-3">Gross Fee</th>
                  <th className="p-3">Your Net ({earningsData.commissionRate}%)</th>
                  <th className="p-3">Holding Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {earningsData.breakdown.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-white font-sans">{item.title}</td>
                    <td className="p-3 text-slate-300">{item.registeredCount} Teams</td>
                    <td className="p-3 text-slate-400">৳ {item.grossRevenue}</td>
                    <td className="p-3 font-bold text-emerald-400">৳ {item.vendorEarnings}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'FINISHED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.status === 'FINISHED' ? 'AVAILABLE' : 'IN ESCROW'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Cashout Requests History */}
      <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="font-heading font-black text-base text-white">Cashout Request History</h2>
            <p className="text-xs text-slate-400">Your bKash / Nagad withdrawal transactions.</p>
          </div>
        </div>

        {payouts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No withdrawal requests made yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">TrxID / Note</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-emerald-400">৳ {p.amount.toLocaleString()}</td>
                    <td className="p-3 text-slate-300 font-bold">{p.method}</td>
                    <td className="p-3 text-cyan-400">{p.accountNumber}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{p.trxId || p.notes || '-'}</td>
                    <td className="p-3 text-slate-500 text-[10px]">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0C101A] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-white">Request Earnings Payout</h3>
                <p className="text-xs text-slate-400">Withdraw your completed tournament earnings.</p>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Withdrawal Amount (BDT ৳) *</label>
                <input
                  type="number"
                  min="100"
                  max={earningsData?.availableEarnings || 100000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="e.g. 1500"
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Available: ৳{earningsData?.availableEarnings || 0}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Payment Method *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        method === m
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-[#07090E] text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{method} Number *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="017XXXXXXXX"
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reference Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Week 1 FF Squad share"
                  className="w-full bg-[#07090E] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>SUBMIT CASHOUT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function VendorEarningsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-violet-400 font-mono text-xs">LOADING VENDOR LEDGER...</div>}>
      <VendorEarningsContent />
    </Suspense>
  );
}
