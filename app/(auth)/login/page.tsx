'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { auth, googleProvider, signInWithPopup, getFirebaseAuth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto redirect already logged-in users to Home page
  useEffect(() => {
    const user = db.getCurrentUser();
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        router.replace('/admin');
      } else if (user.role === 'VENDOR') {
        router.replace('/vendor');
      } else {
        router.replace('/');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Fallback for local mock users if database is in offline mode
        const localFound = db.loginWithEmailAndPassword(email, password);
        if (localFound) {
          db.setCurrentUser(localFound);
          if (localFound.role === 'ADMIN' || localFound.role === 'SUPER_ADMIN') {
            router.push('/admin');
          } else if (localFound.role === 'VENDOR') {
            router.push('/vendor');
          } else {
            router.push('/');
          }
          return;
        }
        setErrorMsg(data.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      // Save user in local state & localStorage
      db.setCurrentUser(data.user);

      if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (data.user.role === 'VENDOR') {
        router.push('/vendor');
      } else {
        router.push('/');
      }
    } catch {
      setErrorMsg('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Firebase Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    try {
      const fb = getFirebaseAuth();
      const targetAuth = fb?.auth || auth;
      const targetProvider = fb?.googleProvider || googleProvider;

      if (!targetAuth) {
        throw new Error('Google Sign-In service could not be initialized. Please sign in with email and password.');
      }
      const result = await signInWithPopup(targetAuth, targetProvider);
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Google sign-in failed on server.');
        setGoogleLoading(false);
        return;
      }

      // Save user in local storage/state
      db.setCurrentUser(data.user);

      if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (data.user.role === 'VENDOR') {
        router.push('/vendor');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google sign-in was cancelled.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('Domain not authorized in Firebase Console. Please add this domain to Firebase Auth Authorized Domains.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In is not enabled in Firebase Console. Please enable Google provider in Firebase.');
      } else {
        setErrorMsg(err.message || 'Google sign-in failed. Please try again or sign in with email.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-6 relative z-10">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange p-0.5 mx-auto shadow-neon-red">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Flame className="w-6 h-6 text-brand-red animate-pulse" />
              </div>
            </div>
            <h2 className="font-heading font-black text-3xl text-slate-900 tracking-wide">PLAYER LOGIN</h2>
            <p className="text-xs text-slate-600 font-medium">Welcome back to Black Rock Championship Arena</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          {/* 1. Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
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
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider absolute">
              OR EMAIL LOGIN
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-brand-orange hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO PLAY</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-brand-orange font-bold hover:underline">
              Create Account
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
