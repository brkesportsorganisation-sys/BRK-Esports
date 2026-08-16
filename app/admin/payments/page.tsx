'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, Check, X, Eye, ExternalLink, Loader2, CheckCircle2, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { db } from '@/lib/db';
import { Payment } from '@/lib/types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const refreshPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/registrations');
      if (res.ok) {
        const data = await res.json();
        if (data.registrations) {
          setPayments(data.registrations);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Payments load error:', err);
    }
    setPayments([...db.getPayments()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshPayments();
  }, []);

  const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: id, action: status === 'VERIFIED' ? 'APPROVE' : 'REJECT' }),
      });
    } catch (err) {
      console.warn('Verify error:', err);
    }
    db.verifyPayment(id, status);
    await refreshPayments();
  };

  const pendingPayments = payments.filter((p) => p.status === 'PENDING');
  const verifiedPayments = payments.filter((p) => p.status === 'VERIFIED');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center border border-brand-red/20 shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-white">
              MOBILE DEPOSIT VERIFICATION QUEUE
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and approve manual bKash, Nagad, and Rocket TrxID deposits submitted by players.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-xs font-bold text-amber-300">
            Pending: <span className="font-black text-amber-400">{pendingPayments.length}</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-xs font-bold text-emerald-300">
            Verified: <span className="font-black text-emerald-400">{verifiedPayments.length}</span>
          </div>
          <button
            onClick={refreshPayments}
            className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-brand-red">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="font-bold text-slate-200">All Deposits Processed</div>
            <div className="text-xs">No pending deposit verification requests in the queue.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Player Details</th>
                  <th className="p-4">Tournament / Purpose</th>
                  <th className="p-4">Method & Amount</th>
                  <th className="p-4">TrxID</th>
                  <th className="p-4">Screenshot</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white text-xs">{p.userName}</div>
                      <div className="text-[11px] text-slate-400">{p.userEmail}</div>
                      <div className="text-[10px] font-mono text-slate-500">ID: {p.userId}</div>
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="text-xs text-slate-200 font-semibold truncate">
                        {p.tournamentTitle || 'Wallet Top-Up'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] uppercase">
                          {p.method}
                        </span>
                        <span className="font-heading font-black text-brand-gold text-base">
                          ৳ {p.amount}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-xs font-bold text-brand-cyan">
                      {p.trxId}
                    </td>

                    <td className="p-4">
                      {p.screenshot ? (
                        <button
                          onClick={() => setSelectedScreenshot(p.screenshot || null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No receipt</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                        p.status === 'VERIFIED' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40' :
                        p.status === 'PENDING' ? 'bg-amber-950/50 text-amber-400 border border-amber-800/40 animate-pulse' :
                        'bg-red-950/50 text-red-400 border border-red-800/40'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {p.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerify(p.id, 'VERIFIED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleVerify(p.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-xs transition-all flex items-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">
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

      {/* Screenshot Viewer Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111827] rounded-3xl p-6 max-w-lg w-full border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-lg text-white">TRANSACTION PROOF SCREENSHOT</h3>
              <button onClick={() => setSelectedScreenshot(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-[70vh] flex items-center justify-center bg-black">
              <img src={selectedScreenshot} alt="Payment Receipt" className="max-w-full max-h-full object-contain" />
            </div>
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
