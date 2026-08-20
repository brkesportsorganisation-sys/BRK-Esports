'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Coins,
  Loader2,
  Gift,
  Trophy,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  UploadCloud,
  Image as ImageIcon,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  Clock
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
  const [convertLoading, setConvertLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic Site Settings
  const [bkashNo, setBkashNo] = useState('01712-998877');
  const [nagadNo, setNagadNo] = useState('01812-998877');
  const [rocketNo, setRocketNo] = useState('01912-998877');
  const [minDeposit, setMinDeposit] = useState(20);
  const [minWithdraw, setMinWithdraw] = useState(100);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Deposit Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('BKASH');
  const [depositAmount, setDepositAmount] = useState(100);
  const [trxId, setTrxId] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Withdraw Modal State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod>('BKASH');
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [accountNumber, setAccountNumber] = useState('');

  // Transactions Filter Tab
  const [activeTab, setActiveTab] = useState<'ALL' | 'DEPOSITS' | 'WITHDRAWALS'>('ALL');

  // Load Settings from /api/settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        if (s.bkash_no) setBkashNo(s.bkash_no);
        if (s.nagad_no) setNagadNo(s.nagad_no);
        if (s.rocket_no) setRocketNo(s.rocket_no);
        if (s.min_deposit) setMinDeposit(Number(s.min_deposit) || 20);
        if (s.min_withdraw) setMinWithdraw(Number(s.min_withdraw) || 100);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  };

  const refreshUserData = async (currentUser: User) => {
    setIsRefreshing(true);
    try {
      const [userRes, payRes] = await Promise.all([
        fetch(`/api/auth/me?id=${currentUser.id}`, { cache: 'no-store' }),
        fetch(`/api/wallet/history?userId=${currentUser.id}`, { cache: 'no-store' })
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
        }
      }
    } catch (err) {
      console.warn('Wallet refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
    const cur = db.getCurrentUser();
    if (cur) {
      setUser(cur);
      refreshUserData(cur);
    }
    setPayments(db.getPayments());
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const walletBalance = Number(user?.walletBalance ?? (Number(user?.winningBalance ?? 0) + Number(user?.promoBalance ?? 0)));
  const coinBalance = Number(user?.coinBalance ?? 0);

  const getMethodNumber = (method: PaymentMethod) => {
    switch (method) {
      case 'BKASH': return bkashNo;
      case 'NAGAD': return nagadNo;
      case 'ROCKET': return rocketNo;
      default: return bkashNo;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in first.');
      return;
    }
    if (!trxId.trim()) {
      alert('Please enter your Transaction ID (TrxID).');
      return;
    }
    if (depositAmount < minDeposit) {
      alert(`Minimum deposit amount is ৳${minDeposit}.`);
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
          screenshot: screenshotPreview,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Deposit submission failed.');
        setLoading(false);
        return;
      }

      alert(data.message || `৳${depositAmount} ইনস্ট্যান্ট আপনার ওয়ালেটে যোগ হয়ে গেছে! আপনি এখনই টুর্নামেন্টে জয়েন করতে পারবেন।`);
      setIsDepositOpen(false);
      setTrxId('');
      setScreenshotPreview(null);
      await refreshUserData(user);
    } catch {
      alert('Failed to submit deposit. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (withdrawAmount > walletBalance) {
      alert(`Insufficient Wallet balance! (Available: ৳${walletBalance})`);
      return;
    }
    if (withdrawAmount < minWithdraw) {
      alert(`Minimum withdrawal amount is ৳${minWithdraw}. (ন্যূনতম উইথড্র পরিমাণ ৳${minWithdraw})`);
      return;
    }
    const trimmedAccount = accountNumber.trim();
    if (!trimmedAccount) {
      alert('Please enter your mobile banking account number.');
      return;
    }
    if (trimmedAccount.length < 11 || !/^01[3-9]\d{8}$/.test(trimmedAccount)) {
      alert('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল ব্যাংকিং নাম্বার দিন (যেমন: 017XXXXXXXX)।');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          method: withdrawMethod,
          amount: withdrawAmount,
          accountNumber: trimmedAccount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Withdrawal failed.');
        setWithdrawLoading(false);
        return;
      }

      alert(data.message || `৳${withdrawAmount} উইথড্র রিকোয়েস্ট সফলভাবে জমা হয়েছে! এডমিন যাচাই করে আপনার ${withdrawMethod} নাম্বারে (${trimmedAccount}) টাকা পাঠিয়ে রিকোয়েস্ট Approve করবেন।`);
      setIsWithdrawOpen(false);
      setAccountNumber('');
      await refreshUserData(user);
    } catch {
      alert('Failed to submit withdrawal request.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Filter transactions
  const filteredPayments = payments.filter((p) => {
    if (activeTab === 'DEPOSITS') return !p.trxId.startsWith('WTH-') && p.method !== 'WALLET';
    if (activeTab === 'WITHDRAWALS') return p.trxId.startsWith('WTH-');
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body pb-20 lg:pb-0">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-10 sm:py-14 text-center space-y-2 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <span className="text-xs font-bold text-amber-700 uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 mb-1">
          <Wallet className="w-3.5 h-3.5 text-amber-600" />
          <span>Official Gaming Wallet & Payouts</span>
        </span>
        <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
          PLAYER WALLET & PAYOUTS
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Manage match entry fees, bKash/Nagad deposits & instant cashouts
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Quick Sync & User Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              ID
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-semibold">Player Account Number</div>
              <div className="font-mono font-black text-slate-900 text-sm">{user?.accountNumber || 'BRK-PLAYER'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 font-bold">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{coinBalance.toLocaleString()} Coins</span>
            </div>

            <button
              onClick={() => user && refreshUserData(user)}
              disabled={isRefreshing}
              title="Refresh balances"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Single Unified Wallet Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-orange-200 shadow-sm hover:shadow-md transition-all space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900 tracking-tight">TOTAL WALLET BALANCE</h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Instant bKash, Nagad & Rocket Supported
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                Main Account Wallet
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-4xl sm:text-6xl font-heading font-black text-slate-900 tracking-tight">
              ৳ {walletBalance.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium">
              টুর্নামেন্ট ম্যাচ এন্ট্রি ফি এবং সরাসরি bKash / Nagad / Rocket-এ উইথড্র করার জন্য প্রযোজ্য।
            </div>
          </div>

          {/* Two Prominent Action Buttons: Deposit & Withdraw */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange hover:from-red-600 hover:to-orange-600 text-white font-heading font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>DEPOSIT MONEY (Min ৳{minDeposit})</span>
            </button>

            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <ArrowUpRight className="w-5 h-5 text-amber-400" />
              <span>WITHDRAW / CASHOUT (Min ৳{minWithdraw})</span>
            </button>
          </div>
        </div>

        {/* Live Mobile Banking Agent Numbers Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 text-slate-900 space-y-4 shadow-md border-2 border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-heading font-black text-base sm:text-lg tracking-wide text-slate-900">OFFICIAL PAYMENT NUMBERS (SEND MONEY)</h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              ⚡ Auto-verified within 5-15 minutes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {/* bKash */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-pink-50 to-pink-100/70 border-2 border-pink-300 space-y-2 flex flex-col justify-between shadow-xs hover:border-pink-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-sm text-pink-700 tracking-wide">bKash (Personal)</span>
                <span className="text-[10px] font-bold text-pink-700 bg-pink-200/90 px-2 py-0.5 rounded-md uppercase">Send Money</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border-2 border-pink-200/90 shadow-2xs">
                <span className="font-mono font-black text-sm sm:text-base text-pink-950 tracking-wider">{bkashNo}</span>
                <button
                  onClick={() => copyToClipboard(bkashNo, 'bkash')}
                  className="p-1.5 px-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Copy bKash Number"
                >
                  {copiedText === 'bkash' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'bkash' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Nagad */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-orange-50 to-orange-100/70 border-2 border-orange-300 space-y-2 flex flex-col justify-between shadow-xs hover:border-orange-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-sm text-orange-700 tracking-wide">Nagad (Personal)</span>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-200/90 px-2 py-0.5 rounded-md uppercase">Send Money</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border-2 border-orange-200/90 shadow-2xs">
                <span className="font-mono font-black text-sm sm:text-base text-orange-950 tracking-wider">{nagadNo}</span>
                <button
                  onClick={() => copyToClipboard(nagadNo, 'nagad')}
                  className="p-1.5 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Copy Nagad Number"
                >
                  {copiedText === 'nagad' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'nagad' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Rocket */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50 to-purple-100/70 border-2 border-purple-300 space-y-2 flex flex-col justify-between shadow-xs hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-sm text-purple-700 tracking-wide">Rocket (Personal)</span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-200/90 px-2 py-0.5 rounded-md uppercase">Send Money</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border-2 border-purple-200/90 shadow-2xs">
                <span className="font-mono font-black text-sm sm:text-base text-purple-950 tracking-wider">{rocketNo}</span>
                <button
                  onClick={() => copyToClipboard(rocketNo, 'rocket')}
                  className="p-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Copy Rocket Number"
                >
                  {copiedText === 'rocket' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'rocket' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-heading font-bold text-xl text-slate-900">Transaction History</h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              {(['ALL', 'DEPOSITS', 'WITHDRAWALS'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === tab ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'DEPOSITS' ? 'Deposits' : 'Cashouts'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">TrxID</th>
                  <th className="py-3 px-4">Method / Action</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500 font-medium">
                      No transactions found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isWithdrawal = p.trxId?.startsWith('WTH-') || (p.notes && p.notes.toLowerCase().includes('withdrawal'));
                    const destinationPhone = p.senderNumber || (p.notes ? p.notes.match(/01[3-9]\d{8}/)?.[0] : null);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-blue-600">{p.trxId}</span>
                            <button
                              onClick={() => copyToClipboard(p.trxId, p.trxId)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy TrxID"
                            >
                              {copiedText === p.trxId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              p.method === 'BKASH' ? 'bg-pink-50 text-pink-600 border border-pink-200' :
                              p.method === 'NAGAD' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                              p.method === 'ROCKET' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                              'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}>
                              {p.method}
                            </span>
                            <span className="font-bold text-slate-700">
                              {isWithdrawal ? 'Cashout' : 'Deposit'}
                            </span>
                          </div>
                          {isWithdrawal && destinationPhone && (
                            <div className="text-[11px] font-mono text-slate-500 font-semibold mt-0.5">
                              To: {destinationPhone}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-heading font-extrabold text-sm">
                          <span className={isWithdrawal ? 'text-amber-600' : 'text-emerald-600'}>
                            {isWithdrawal ? `- ৳${p.amount}` : `+ ৳${p.amount}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            p.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {p.status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {p.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                            {p.status === 'REJECTED' && <AlertCircle className="w-3 h-3 text-red-600" />}
                            <span>
                              {p.status === 'VERIFIED' ? (isWithdrawal ? 'Paid / Sent' : 'Verified') : 
                               p.status === 'PENDING' ? (isWithdrawal ? 'Pending Payout' : 'Pending Review') : 
                               'Refunded'}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-medium">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── 1. Deposit Modal ── */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-black text-xl text-slate-900">DEPOSIT MONEY</h3>
              <button 
                onClick={() => setIsDepositOpen(false)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDepositMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                        depositMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Instruction Box */}
              <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="text-slate-700 font-bold">1. Send Money (Personal) To:</div>
                  <span className="text-[10px] font-bold text-orange-700">Min ৳{minDeposit}</span>
                </div>
                
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-orange-300">
                  <span className="font-mono font-black text-orange-600 text-sm sm:text-base">
                    {getMethodNumber(depositMethod)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getMethodNumber(depositMethod), 'modal_num')}
                    className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    {copiedText === 'modal_num' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === 'modal_num' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Go to your <strong>{depositMethod} app</strong> ➡️ Tap <strong>Send Money</strong> ➡️ Enter the number above ➡️ Complete payment and copy the <strong>TrxID</strong>.
                </div>
              </div>

              {/* Deposit Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Deposit Amount (৳ BDT) *</label>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Min: ৳{minDeposit}
                  </span>
                </div>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  required
                  min={minDeposit}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-black text-base focus:outline-none focus:border-brand-orange"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[minDeposit, 50, 100, 200, 500, 1000]
                    .filter((amt, i, arr) => amt >= minDeposit && arr.indexOf(amt) === i)
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(amt)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          depositAmount === amt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                </div>
              </div>

              {/* TrxID */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. BK9X77A291"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Optional Screenshot Attachment */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Payment Receipt Screenshot <span className="text-slate-400 font-normal">(Optional for faster approval)</span>
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />

                {screenshotPreview ? (
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={screenshotPreview} alt="Receipt" className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot attached
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenshotPreview(null)}
                      className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-orange bg-slate-50 text-slate-600 flex items-center justify-center gap-2 transition-all font-semibold"
                  >
                    <UploadCloud className="w-4 h-4 text-brand-orange" />
                    <span>Upload Screenshot / Slip</span>
                  </button>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50 shadow-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SUBMIT DEPOSIT</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. Withdraw Modal ── */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900">WITHDRAW MONEY</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Cashout balance to your bKash, Nagad or Rocket</p>
              </div>
              <button 
                onClick={() => setIsWithdrawOpen(false)}
                className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="font-black text-amber-900 text-sm flex items-center justify-between">
                <span>Available Wallet Balance:</span>
                <span className="text-base text-amber-700">৳{walletBalance.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                আপনার একাউন্ট ওয়ালেট ব্যালেন্স সরাসরি ক্যাশআউট করুন। <strong>ন্যূনতম উইথড্র: ৳{minWithdraw}</strong>
              </div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Select Payout Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BKASH', 'NAGAD', 'ROCKET'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawMethod(m)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                        withdrawMethod === m ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Your {withdrawMethod} Account Number *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="017XXXXXXXX"
                  maxLength={11}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enter your 11-digit Personal {withdrawMethod} number.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Withdraw Amount (৳ BDT) *</label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    Min: ৳{minWithdraw}
                  </span>
                </div>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  required
                  min={minWithdraw}
                  max={walletBalance}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-black text-base focus:outline-none focus:border-amber-500"
                />

                {/* Quick Chips for Withdrawal */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[minWithdraw, 200, 500, 1000]
                    .filter((amt, i, arr) => amt >= minWithdraw && arr.indexOf(amt) === i && amt <= (walletBalance || minWithdraw))
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          withdrawAmount === amt ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                  {walletBalance >= minWithdraw && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(walletBalance)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        withdrawAmount === walletBalance ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      Max (৳{walletBalance})
                    </button>
                  )}
                </div>
              </div>

              {/* Informative Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  <span>ক্যাশআউট প্রসেসিং তথ্য:</span>
                </div>
                <p>
                  উইথড্র রিকোয়েস্ট করার পর অ্যাডমিন আপনার প্রদত্ত <strong>{withdrawMethod}</strong> নাম্বারে টাকা পাঠিয়ে রিকোয়েস্ট Approve করবেন।
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading || walletBalance < minWithdraw}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50 shadow-xs"
                >
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM CASHOUT</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
