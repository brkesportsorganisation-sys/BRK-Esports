'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, Check, X, Eye, ExternalLink } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { Payment } from '@/lib/types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const refreshPayments = async () => {
    try {
      const res = await fetch('/api/admin/registrations');
      if (res.ok) {
        const data = await res.json();
        if (data.registrations) {
          setPayments(data.registrations);
          return;
        }
      }
    } catch (err) {
      console.warn('Payments load error:', err);
    }
    setPayments([...db.getPayments()]);
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
    refreshPayments();
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 flex flex-col font-body">
      <Navbar />

      <div className="bg-white border-b border-slate-200 py-8 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading font-black text-3xl text-slate-900">MOBILE PAYMENT VERIFICATION</h1>
          <div className="text-xs text-slate-500 font-medium mt-1">Review bKash, Nagad, and Rocket manual payment deposits</div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
          <Link href="/admin" className="px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition-colors">
            Overview & Analytics
          </Link>
          <Link href="/admin/tournaments" className="px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition-colors">
            Tournament Manager
          </Link>
          <Link href="/admin/payments" className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs shadow-sm transition-colors">
            Payment Verification Queue ({payments.filter(p => p.status === 'PENDING').length})
          </Link>
          <Link href="/admin/users" className="px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition-colors">
            User Manager
          </Link>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Tournament</th>
                  <th className="p-4">Method / Amount</th>
                  <th className="p-4">TrxID</th>
                  <th className="p-4">Screenshot</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{p.userName}</div>
                      <div className="text-xs text-slate-500 font-medium">{p.userEmail}</div>
                    </td>

                    <td className="p-4 max-w-xs">
                      <div className="text-xs text-slate-700 font-semibold truncate">
                        {p.tournamentTitle || 'Wallet Deposit'}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-blue-600 text-xs uppercase">{p.method}</span>
                      <div className="font-heading font-black text-slate-900 text-base">৳ {p.amount}</div>
                    </td>

                    <td className="p-4 font-mono text-xs text-slate-700 font-bold">{p.trxId}</td>

                    <td className="p-4">
                      {p.screenshot ? (
                        <button
                          onClick={() => setSelectedScreenshot(p.screenshot || null)}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold hover:bg-orange-100 flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Pic</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">No Pic</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        p.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {p.status === 'PENDING' && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleVerify(p.id, 'VERIFIED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleVerify(p.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Screenshot Preview Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 text-center">
            <h3 className="font-heading font-bold text-xl text-slate-900">PAYMENT PROOF PREVIEW</h3>
            <img src={selectedScreenshot} alt="Payment Proof" className="w-full h-64 object-cover rounded-2xl border border-slate-200 shadow-sm" />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
