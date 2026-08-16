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
      console.warn('Using cached wallet data:', err);
    }
    setPayments([...db.getPayments()]);
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    if (cur) {
      setUser(cur);
      refreshUserData(cur);
    }
  }, []);

  if (!user) return null;

  const promoBalance = Number(user.promoBalance || 0);
  const winningBalance = Number(user.winningBalance || 0);
  const totalBalance = Number(user.walletBalance || (promoBalance + winningBalance));

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId) return;

    if (depositAmount < 20) {
      alert('Minimum deposit amount is ৳20.');
      return;
    }

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
          userId: user.id,
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
      await refreshUserData(user);
    } catch {
      alert('Failed to submit withdrawal request.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body pb-20 lg:pb-0">
      <Navbar />

      <div className="bg-surface/60 border-b border-slate-700/60 py-10 text-center">
        <span className="text-xs font-bold text-brand-gold uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
          <WalletIcon className="w-4 h-4 text-brand-gold" />
          <span>Dual-Wallet Banking & Payout System</span>
        </span>
        <h1 className="font-heading font-black text-4xl text-white">GAMING WALLET</h1>
        <p className="text-xs text-gray-400 mt-1">Separate balances for Winning Earnings and Promo Tournament Credits</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        {/* Dual Wallet Display Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Winning Wallet (Withdrawable) */}
          <div className="glass-card rounded-3xl p-6 border-2 border-brand-gold/60 shadow-cyber relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-brand-gold/20 text-brand-gold flex items-center justify-center border border-brand-gold/40">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-white">WINNING WALLET</h3>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Withdrawable via bKash
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-heading font-black text-brand-gold drop-shadow-md">
                ৳ {winningBalance.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Prize money won from tournament matches
              </div>
            </div>

            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-gold to-yellow-500 text-black font-heading font-black text-xs shadow-neon-gold hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>WITHDRAW EARNINGS (bKash/Nagad)</span>
            </button>
          </div>

          {/* Promo Wallet (Tournament Slots Only) */}
          <div className="glass-card rounded-3xl p-6 border-2 border-brand-red/40 shadow-cyber relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-2xl bg-brand-red/20 text-brand-red flex items-center justify-center border border-brand-red/40">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-white">PROMO WALLET</h3>
                  <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">
                    Sign-up & Referral Credits
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-heading font-black text-brand-orange drop-shadow-md">
                ৳ {promoBalance.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Usable exclusively for tournament slot entries (Non-withdrawable)
              </div>
            </div>

            <button
              onClick={() => setIsDepositOpen(true)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>DEPOSIT MONEY (Min ৳20)</span>
            </button>
          </div>

        </div>

        {/* Total Balance Overview Bar */}
        <div className="p-4 rounded-2xl bg-surface-light border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="font-bold text-white uppercase">Total Play Balance:</div>
            <div className="font-heading font-black text-xl text-brand-cyan">৳ {totalBalance.toLocaleString()}</div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-yellow-500 font-bold">
              <Coins className="w-4 h-4" />
              <span>{user.coinBalance?.toLocaleString() || 0} Coins</span>
            </div>
            <div className="text-slate-400">
              Account No: <span className="text-white font-mono font-bold">{user.accountNumber || 'BRE-109283'}</span>
            </div>
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
                  <th className="p-3">Wallet</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">No transactions recorded yet.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-mono text-xs text-brand-cyan">{p.trxId}</td>
                      <td className="p-3 font-bold text-white uppercase">{p.method}</td>
                      <td className="p-3 font-heading font-extrabold text-brand-gold text-base">৳ {p.amount}</td>
                      <td className="p-3 text-xs font-bold text-slate-300 uppercase">{p.walletType || 'WINNING'}</td>
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
                  ))
                )}
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
                <div className="text-slate-400">Send Money (Personal) to Number:</div>
                <div className="font-mono font-bold text-brand-gold text-sm">01712-998877</div>
                <div className="text-[10px] text-brand-orange font-bold">Minimum Deposit: ৳20</div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Amount (BDT) *</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  required
                  min={20}
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
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full border border-slate-700 space-y-4">
            <h3 className="font-heading font-black text-2xl text-white">WITHDRAW WINNING EARNINGS</h3>
            
            <div className="p-3 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-xs space-y-1">
              <div className="font-bold text-brand-gold">Available Winning Balance: ৳{winningBalance}</div>
              <div className="text-[11px] text-gray-300">Only match winnings are withdrawable. Minimum payout: ৳100.</div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Select Payout Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center ${
                        withdrawMethod === m ? 'bg-brand-gold text-black border-brand-gold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">bKash/Nagad Account Number *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="017XXXXXXXX"
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
                  min={100}
                  max={winningBalance}
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
                  disabled={withdrawLoading || winningBalance < 100}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-500 text-black font-bold flex items-center justify-center space-x-1 disabled:opacity-50"
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
