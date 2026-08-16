'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Coins,
  Loader2,
  Gift,
  Trophy,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User, Payment, PaymentMethod } from '@/lib/types';

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Deposit Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('BKASH');
  const [depositAmount, setDepositAmount] = useState(100);
  const [trxId, setTrxId] = useState('');

  // Withdraw Modal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod>('BKASH');
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [accountNumber, setAccountNumber] = useState('');

  const refreshUserData = async (currentUser: User) => {
    try {
      const [userRes, payRes] = await Promise.all([
        fetch(`/api/auth/me?id=${currentUser.id}`),
        fetch(`/api/wallet/history?userId=${currentUser.id}`)
      ]);

      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.user) {
          setUser(uData.user);
          db.setCurrentUser(uData.user);
        }
      }

      if (payRes.ok) {
        const pData = await payRes.json();
        if (pData.payments) {
          setPayments(pData.payments);
          return;
        }
      }
    } catch (err) {
      console.warn('Wallet refresh error:', err);
    }
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    if (cur) {
      setUser(cur);
      refreshUserData(cur);
    }
    setPayments(db.getPayments());
  }, []);

  const winningBalance = Number(user?.winningBalance ?? 0);
  const promoBalance = Number(user?.promoBalance ?? 0);
  const coinBalance = Number(user?.coinBalance ?? 0);
  const totalBalance = Number(user?.walletBalance ?? (winningBalance + promoBalance));

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in first.');
      return;
    }
    if (!trxId.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          method: depositMethod,
          amount: depositAmount,
          trxId: trxId.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Deposit submission failed.');
        setLoading(false);
        return;
      }

      alert('Deposit request submitted! Admin will verify your transaction.');
      setIsDepositOpen(false);
      setTrxId('');
      await refreshUserData(user);
    } catch {
      alert('Failed to submit deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount > winningBalance) {
      alert(`Insufficient Winning Wallet balance! You can only withdraw from tournament earnings (Available: ৳${winningBalance}). Promo bonus is for tournament slot purchases only.`);
      return;
    }
    if (!accountNumber) return;

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          method: withdrawMethod,
          amount: withdrawAmount,
          accountNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Withdrawal failed.');
        setWithdrawLoading(false);
        return;
      }

      alert(data.message);
      setIsWithdrawOpen(false);
      if (user) await refreshUserData(user);
    } catch {
      alert('Failed to submit withdrawal request.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body pb-20 lg:pb-0">
      <Navbar />

      <div className="bg-white border-b border-slate-200 py-12 sm:py-16 text-center space-y-2 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 mb-1">
          <WalletIcon className="w-3.5 h-3.5 text-amber-600" />
          <span>Dual-Wallet Banking & Payout System</span>
        </span>
        <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
          GAMING WALLET
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Separate balances for Winning Earnings and Promo Tournament Credits
        </p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Dual Wallet Display Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Winning Wallet (Withdrawable) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-slate-900">WINNING WALLET</h3>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Withdrawable via bKash / Nagad
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-heading font-black text-amber-600">
                ৳ {winningBalance.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">
                Prize money won from tournament matches
              </div>
            </div>

            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>WITHDRAW EARNINGS (bKash/Nagad)</span>
            </button>
          </div>

          {/* Promo Wallet (Tournament Slots Only) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center border border-orange-200">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-slate-900">PROMO WALLET</h3>
                  <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">
                    Sign-up & Referral Credits
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-heading font-black text-orange-600">
                ৳ {promoBalance.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">
                Usable exclusively for tournament slot entries
              </div>
            </div>

            <button
              onClick={() => setIsDepositOpen(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-bold text-xs shadow-xs hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>DEPOSIT MONEY (Min ৳20)</span>
            </button>
          </div>

        </div>

        {/* Total Balance Overview Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="font-bold text-slate-700 uppercase">Total Play Balance:</div>
            <div className="font-heading font-black text-xl text-blue-600">৳ {totalBalance.toLocaleString()}</div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-amber-600 font-bold">
              <Coins className="w-4 h-4" />
              <span>{user?.coinBalance?.toLocaleString() || 0} Coins</span>
            </div>
            <div className="text-slate-500">
              Player ID: <span className="text-slate-900 font-mono font-bold">{user?.accountNumber || 'BRK-MEMBER'}</span>
            </div>
          </div>
        </div>

        {/* Transactions Logs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-xl text-slate-900">Recent Transactions</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">TrxID</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Wallet</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">No transactions recorded yet.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600">{p.trxId}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 uppercase text-xs">{p.method}</td>
                      <td className="py-3 px-4 font-heading font-extrabold text-slate-900 text-sm">৳ {p.amount}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{p.walletType || 'WINNING'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-heading font-black text-xl text-slate-900">DEPOSIT MONEY</h3>
            
            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDepositMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                        depositMethod === m ? 'bg-brand-red text-white border-brand-red shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 space-y-1 text-xs">
                <div className="text-slate-600 font-semibold">Send Money (Personal) to Number:</div>
                <div className="font-mono font-bold text-orange-600 text-sm">01712-998877</div>
                <div className="text-[10px] text-slate-500 font-bold">Minimum Deposit: ৳20</div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount (BDT) *</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  required
                  min={20}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  required
                  placeholder="BK9X77A291"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50 shadow-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SUBMIT DEPOSIT</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-heading font-black text-xl text-slate-900">WITHDRAW WINNING EARNINGS</h3>
            
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-amber-700">Available Winning Balance: ৳{winningBalance}</div>
              <div className="text-[11px] text-slate-600">Only match winnings are withdrawable. Minimum payout: ৳100.</div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Payout Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                        withdrawMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">bKash/Nagad Account Number *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="017XXXXXXXX"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Withdraw Amount (BDT)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  required
                  min={100}
                  max={winningBalance}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading || winningBalance < 100}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50 shadow-xs"
                >
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM WITHDRAWAL</span>}
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
