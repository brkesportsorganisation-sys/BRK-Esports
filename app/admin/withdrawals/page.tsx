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
  CreditCard
} from 'lucide-react';
import { Payment } from '@/lib/types';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadWithdrawals = async () => {
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

  const handleAction = async (withdrawalId: string, action: 'APPROVE' | 'REJECT') => {
    let rejectionReason: string | undefined;
    if (action === 'REJECT') {
      const reason = prompt('Please enter reason for rejecting this payout (funds will be refunded to user):');
      if (!reason) return;
      rejectionReason = reason;
    }

    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action, rejectionReason }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Action executed successfully.');
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
  const totalPaid = withdrawals
    .filter((w) => w.status === 'VERIFIED')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              WINNING WALLET PAYOUT QUEUE
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve player cashout withdrawals to bKash, Nagad, and Rocket numbers.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
            Pending Payouts: <span className="text-amber-700 font-black">{pendingCount}</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-green-50 border border-green-200 text-xs font-bold text-green-900">
            Total Distributed: <span className="text-green-700 font-black">৳{totalPaid.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-amber-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <div className="font-bold text-slate-700">No Withdrawal Requests Pending</div>
            <div className="text-xs">All player winning payouts are fully settled.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Player Details</th>
                  <th className="p-4">Payout Method & Details</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{w.userName}</div>
                      <div className="text-xs text-slate-400">{w.userEmail}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {w.userId}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-xs text-slate-800 uppercase">
                          {w.method}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-700">{w.trxId}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 font-mono font-medium">
                        {w.notes || 'No account notes'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-heading font-black text-amber-600 text-lg">
                        ৳ {w.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(w.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                        w.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        w.status === 'VERIFIED' ? 'bg-green-50 text-green-700 border border-green-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {w.status === 'VERIFIED' ? 'PAID' : w.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {w.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(w.id, 'APPROVE')}
                            disabled={processingId === w.id}
                            className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                          <button
                            onClick={() => handleAction(w.id, 'REJECT')}
                            disabled={processingId === w.id}
                            className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">
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

    </div>
  );
}
