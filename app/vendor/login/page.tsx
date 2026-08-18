'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Lock, User, Loader2, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

export default function VendorLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (res.ok && data.vendor) {
        router.push('/vendor');
      } else {
        setError(data.message || 'Vendor credentials are invalid.');
      }
    } catch {
      setError('An error occurred connecting to the vendor authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden font-sans">
      
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/admin/login"
            className="text-[11px] text-violet-400 hover:underline font-semibold"
          >
            Admin Panel Login →
          </Link>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-violet-500/20 bg-[#0C101A]/95 p-6 sm:p-8 shadow-2xl shadow-violet-950/40 backdrop-blur-xl">
          
          {/* Header */}
          <div className="mb-6 flex items-center gap-3.5">
            <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 p-3 text-violet-300 shadow-inner">
              <Store className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-violet-400 font-bold">
                  PORTAL ACCESS
                </span>
                <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[9px] font-mono font-bold">
                  v2.0
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-heading">
                BLACKROCK VENDOR
              </h1>
            </div>
          </div>

          {/* Quick Demo Credentials Pill */}
          <div className="mb-6 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-3.5 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-violet-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Quick Test Logins</span>
              </span>
              <span className="text-slate-500">Click to fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('VND-1001', 'vendor123')}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-violet-900/30 border border-slate-800 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-white text-[11px]">Full Access Vendor</div>
                <div className="text-[10px] font-mono text-violet-300">VND-1001</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('VND-2002', 'vendor123')}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-violet-900/30 border border-slate-800 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-white text-[11px]">Limited Host Vendor</div>
                <div className="text-[10px] font-mono text-amber-300">VND-2002</div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="mb-1.5 block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                Vendor ID or Registered Email
              </label>
              <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-violet-500 transition-colors">
                <User className="mr-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-transparent text-white font-medium outline-none placeholder-slate-500 text-sm"
                  type="text"
                  placeholder="e.g. VND-1001 or vendor@blackrock.gg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                Password
              </label>
              <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-violet-500 transition-colors">
                <Lock className="mr-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-white font-medium outline-none placeholder-slate-500 text-sm font-mono"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 font-medium animate-fadeIn">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 px-4 py-3.5 font-bold text-white transition-all shadow-lg shadow-violet-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  <span>SIGN IN TO VENDOR PORTAL</span>
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>Blackrock Esports Role Guarded Protocol</span>
          </div>

        </div>

      </div>

    </div>
  );
}
