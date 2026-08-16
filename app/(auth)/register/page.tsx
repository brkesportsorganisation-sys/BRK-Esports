'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Flame, Lock, Mail, User as UserIcon, Gamepad2, ArrowRight, Loader2, CheckCircle2, Sparkles, Search } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ign, setIgn] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Real-time UID Auto IGN Fetch State
  const [isFetchingIgn, setIsFetchingIgn] = useState(false);
  const [ignFetchedSuccess, setIgnFetchedSuccess] = useState(false);

  // Debounced Free Fire UID to IGN Auto-Lookup
  useEffect(() => {
    const cleanUid = ffUid.trim();
    if (cleanUid.length < 8) {
      setIgnFetchedSuccess(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingIgn(true);
      try {
        const res = await fetch(`/api/freefire/lookup?uid=${encodeURIComponent(cleanUid)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.nickname) {
            setIgn(data.nickname);
            setIgnFetchedSuccess(true);
          }
        }
      } catch (err) {
        console.warn('Auto IGN lookup error:', err);
      } finally {
        setIsFetchingIgn(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [ffUid]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, ffUid, ign, refCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Save user in local state & localStorage
      db.setCurrentUser(data.user);
      router.push('/profile');
    } catch {
      setErrorMsg('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 relative overflow-hidden">
        
        {/* Background glow circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-brand-red/15 to-brand-orange/15 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Card Container with High Contrast */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-md w-full border-2 border-slate-200 shadow-2xl space-y-6 relative z-10">
          
          {/* Header Banner with Crystal Clear JOIN ARENA title */}
          <div className="text-center space-y-2 pb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange p-0.5 mx-auto shadow-neon-red">
              <div className="w-full h-full bg-[#0F172A] rounded-[14px] flex items-center justify-center">
                <Flame className="w-7 h-7 text-brand-red animate-pulse" />
              </div>
            </div>
            
            <h1 className="font-heading font-black text-4xl text-slate-900 tracking-wider uppercase drop-shadow-sm">
              JOIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange">ARENA</span>
            </h1>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700">
              <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
              <span>Register & Get ৳100 Free Fire Sign-Up Bonus</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Free Fire UID & Automatic IGN Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase block mb-1">
                  Free Fire UID *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ffUid}
                    onChange={(e) => setFfUid(e.target.value)}
                    placeholder="e.g. 1029384756"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-cyan focus:bg-white transition-all font-mono font-bold"
                  />
                  {isFetchingIgn && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase">In-Game Name (IGN)</label>
                  {ignFetchedSuccess && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Auto-Fetched
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Gamepad2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder={isFetchingIgn ? "Fetching from Free Fire..." : "Auto-fills from UID"}
                    required
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-bold ${
                      ignFetchedSuccess ? 'bg-emerald-50/50 border-emerald-400 text-emerald-900' : 'bg-slate-50 border-slate-300 focus:border-brand-orange focus:bg-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 chars)"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CREATING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <span>CLAIM BONUS & REGISTER</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-orange font-bold hover:underline">
              Sign In
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center text-slate-900 font-bold">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
