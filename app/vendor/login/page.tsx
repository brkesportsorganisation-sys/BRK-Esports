'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Eye, EyeOff, User as UserIcon, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function VendorLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch('/api/vendor/session', { credentials: 'include' });
        if (res.ok) {
          router.replace('/vendor');
        }
      } catch {
        // Allow vendor to login manually
      }
    };

    void verifySession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Login failed. Please verify your vendor credentials.');
        setLoading(false);
        return;
      }

      router.replace('/vendor');
    } catch {
      setError('Network connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d071e] flex flex-col items-center justify-center px-4 py-10 relative font-sans selection:bg-violet-600 selection:text-white">
      
      {/* Background glow accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col relative z-10 border border-violet-900/20">
        
        {/* Header Area */}
        <div className="bg-[#17092b] pt-8 pb-6 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-3 border border-violet-500/40 bg-slate-950 p-0.5 shadow-md">
            <img src="/logo.png" alt="ESPORTS ZONE BD" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1 tracking-wide">Vendor Panel</h1>
          <p className="text-sm font-medium text-violet-200/80 mb-1">ESPORTS ZONE BD</p>
          <p className="text-[10px] text-violet-400 font-medium">Secure Vendor Access</p>
        </div>

        {/* Form Area */}
        <div className="p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Vendor ID or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-violet-600 focus:ring-1 focus:ring-violet-600 placeholder-slate-400 font-medium"
                  type="text"
                  placeholder="Enter your Vendor ID or Email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-violet-600 focus:ring-1 focus:ring-violet-600 placeholder-slate-400 font-medium"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-md bg-red-50 p-2.5 text-center text-xs font-medium text-red-600 border border-red-100">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#17092b] hover:bg-[#251044] py-3 text-sm font-semibold text-white transition disabled:opacity-70 flex justify-center items-center gap-2 mt-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-violet-300" />
                  <span>Login to Vendor Panel</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Area */}
        <div className="border-t border-slate-100 bg-slate-50/70 py-4 px-6 text-center flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Authorized tournament host personnel only</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">For security reasons, you must login fresh each time</p>
        </div>

      </div>

    </div>
  );
}
