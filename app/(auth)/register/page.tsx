'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Flame, Lock, Mail, User as UserIcon, Gamepad2, ArrowRight, Loader2, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { auth, googleProvider, signInWithPopup } from '@/lib/firebase';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Real-time UID to Player Name Fetch State
  const [isFetchingIgn, setIsFetchingIgn] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'failed'; message?: string }>({ status: 'idle' });
  const ignRef = useRef<HTMLInputElement>(null);

  // Debounced auto-fetch when UID is 8+ digits
  useEffect(() => {
    const cleanUid = ffUid.trim();
    if (cleanUid.length < 8) {
      setFetchStatus({ status: 'idle' });
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingIgn(true);
      setFetchStatus({ status: 'loading', message: 'Loading...' });

      try {
        const res = await fetch(`/api/get-player-name/${encodeURIComponent(cleanUid)}`);
        const data = await res.json();

        if (res.ok && data.success && data.nickname) {
          setIgn(data.nickname);
          setFetchStatus({ status: 'success', message: `✅ Verified IGN: ${data.nickname}` });
        } else if (res.ok && data.success && data.verified) {
          // UID is valid but nickname could not be fetched — focus IGN field
          setFetchStatus({ status: 'success', message: '✅ UID Valid — Please enter your IGN' });
          setTimeout(() => ignRef.current?.focus(), 100);
        } else {
          setFetchStatus({ status: 'failed', message: 'Player UID not found / Enter IGN manually' });
        }
      } catch {
        setFetchStatus({ status: 'failed', message: 'Error fetching player name' });
      } finally {
        setIsFetchingIgn(false);
      }
    }, 500);

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

  // Google Sign-Up / Sign-In Handler
  const handleGoogleSignUp = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        throw new Error('Could not retrieve email from your Google account.');
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName || '',
          avatar: user.photoURL || '',
          googleUid: user.uid,
          refCode: refCode || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Google registration failed on server.');
        setGoogleLoading(false);
        return;
      }

      db.setCurrentUser(data.user);
      router.push('/profile');
    } catch (err: any) {
      console.error('Google Register Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google sign-up was cancelled.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-up popup was blocked by browser. Please allow popups for this site.');
      } else {
        setErrorMsg(err.message || 'Google registration failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
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
            
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              <span>Official Free Fire Esports Arena</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          {/* 1. Google Fast Sign-Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 shadow-xs hover:shadow-sm transition-all flex items-center justify-center space-x-3 disabled:opacity-50 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider absolute">
              OR REGISTER WITH DETAILS
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Free Fire UID & Auto-Fetched IGN */}
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
                    placeholder="e.g. 2172143722"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-mono font-bold"
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
                  <label className="text-xs font-bold text-slate-800 uppercase">In-Game Name (IGN) *</label>
                  {fetchStatus.status === 'success' && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 font-mono">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Gamepad2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={ignRef}
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder={isFetchingIgn ? "Loading..." : "Enter player IGN"}
                    required
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none transition-all font-bold ${
                      fetchStatus.status === 'success' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black' 
                        : 'bg-slate-50 border-slate-300 focus:border-brand-orange focus:bg-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Fetch Status Message Indicator */}
            {fetchStatus.message && (
              <div className={`text-[11px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                fetchStatus.status === 'success' 
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                  : fetchStatus.status === 'loading'
                  ? 'text-orange-700 bg-orange-50 border border-orange-200 animate-pulse'
                  : 'text-slate-700 bg-slate-100 border border-slate-200'
              }`}>
                {fetchStatus.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                {fetchStatus.status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-orange-600 animate-spin flex-shrink-0" />}
                {fetchStatus.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                <span>{fetchStatus.message}</span>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 chars)"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CREATING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <span>CREATE ACCOUNT & JOIN</span>
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
