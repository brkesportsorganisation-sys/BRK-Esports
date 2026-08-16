'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Check, 
  Clock, 
  AlertCircle,
  CreditCard,
  Building2,
  DollarSign,
  Coins
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User, Payment, PaymentMethod } from '@/lib/types';

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Deposit Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('BKASH');
  const [depositAmount, setDepositAmount] = useState(200);
  const [trxId, setTrxId] = useState('');

  // Withdraw Modal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod>('BKASH');
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    setUser(db.getCurrentUser());
    setPayments([...db.getPayments()]);
  }, []);

  if (!user) return null;

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId) return;

    db.submitPayment({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      method: depositMethod,
      amount: depositAmount,
      trxId: trxId,
      screenshot: 'https://images.unsplash.com/photo-1556742049-0a67d2685718?w=500',
    });

    setPayments([...db.getPayments()]);
    setIsDepositOpen(false);
    setTrxId('');
    alert('Deposit request submitted! Admin will verify your transaction.');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount > user.walletBalance) {
      alert('Insufficient wallet balance!');
      return;
    }
    if (!accountNumber) return;

    db.updateUser(user.id, {
      walletBalance: user.walletBalance - withdrawAmount,
    });

    setUser({ ...db.getCurrentUser() });
    setIsWithdrawOpen(false);
    alert(`Withdrawal request of ৳${withdrawAmount} via ${withdrawMethod} to ${accountNumber} submitted!`);
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body pb-20 lg:pb-0">
      <Navbar />

      <div className="bg-surface/60 border-b border-slate-700/60 py-10 text-center">
        <span className="text-xs font-bold text-brand-gold uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
          <WalletIcon className="w-4 h-4 text-brand-gold" />
          <span>Mobile Banking & Wallet System</span>
        </span>
        <h1 className="font-heading font-black text-4xl text-white">MY GAMING WALLET</h1>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        {/* Wallet Balance Hero Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border-2 border-brand-gold/40 shadow-cyber relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-brand-gold/20">
            {/* Wallet Section */}
            <div className="space-y-1 py-2">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                <WalletIcon className="w-3.5 h-3.5 text-brand-gold" />
                Wallet Balance (Tk)
              </div>
              <div className="text-4xl sm:text-5xl font-heading font-black text-brand-gold drop-shadow-md">
                ৳ {user.walletBalance.toLocaleString()}
              </div>
              <div className="text-xs text-brand-cyan font-mono pt-1">
                Total Earnings: ৳{user.earnings.toLocaleString()}
              </div>
            </div>

            {/* Coins Section */}
            <div className="space-y-1 py-2">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-yellow-500" />
                Tournament Coins
              </div>
              <div className="text-4xl sm:text-5xl font-heading font-black text-yellow-500 drop-shadow-md">
                {user.coinBalance?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-slate-400 font-mono pt-1">
                Use coins to play tournaments
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="flex-1 max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-sm shadow-neon-red hover:scale-105 transition-all flex items-center justify-center space-x-2"
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>DEPOSIT (bKash/Nagad)</span>
            </button>

            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1 max-w-xs py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-heading font-bold text-sm border border-slate-700 hover:border-brand-gold transition-all flex items-center justify-center space-x-2"
            >
              <ArrowUpRight className="w-5 h-5 text-brand-gold" />
              <span>WITHDRAW EARNINGS</span>
            </button>
          </div>
        </div>

        {/* Transactions Logs */}
        <div className="glass-card rounded-2xl p-6 border border-slate-700/60 space-y-4">
          <h3 className="font-heading font-bold text-xl text-white">Recent Transactions</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th className="p-3">TrxID</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono text-xs text-brand-cyan">{p.trxId}</td>
                    <td className="p-3 font-bold text-white uppercase">{p.method}</td>
                    <td className="p-3 font-heading font-extrabold text-brand-gold text-base">৳ {p.amount}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        p.status === 'VERIFIED' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                        p.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                        'bg-red-900/30 text-red-400 border border-red-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full border border-slate-700 space-y-4">
            <h3 className="font-heading font-black text-2xl text-white">DEPOSIT MONEY</h3>
            
            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Select Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDepositMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center ${
                        depositMethod === m ? 'bg-brand-red text-white border-brand-red' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1 text-xs">
                <div className="text-slate-400">Send Money to Agent No:</div>
                <div className="font-mono font-bold text-brand-gold text-sm">01712-998877</div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  required
                  placeholder="BK9X77A291"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold"
                >
                  SUBMIT DEPOSIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full border border-slate-700 space-y-4">
            <h3 className="font-heading font-black text-2xl text-white">WITHDRAW EARNINGS</h3>
            
            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Select Account Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center ${
                        withdrawMethod === m ? 'bg-brand-orange text-white border-brand-orange' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Mobile Banking Account Number *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="01712345678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Withdraw Amount (BDT)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold text-white font-bold"
                >
                  CONFIRM WITHDRAWAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
