'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail } from 'lucide-react';
import { db } from '@/lib/db';

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('vendor@helian.gg');
  const [password, setPassword] = useState('vendor123');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const foundUser = db.loginWithEmailAndPassword(email, password);

    if (!foundUser || foundUser.role !== 'VENDOR') {
      setError('Vendor credentials are invalid.');
      return;
    }

    db.setCurrentUser(foundUser);
    router.push('/vendor');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-violet-500/30 bg-slate-900/90 p-8 shadow-2xl shadow-violet-950/30">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 text-violet-300">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Vendor Access</p>
            <h1 className="text-2xl font-semibold text-white">BLACK ROCK VENDOR</h1>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-slate-200">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-violet-300">Demo vendor login</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-3 py-2">
              <span className="text-slate-400">Email</span>
              <span className="font-semibold text-white">vendor@helian.gg</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/60 px-3 py-2">
              <span className="text-slate-400">Password</span>
              <span className="font-semibold text-white">vendor123</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Vendor Email</label>
            <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
              <Mail className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-white outline-none"
                type="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
              <Lock className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-white outline-none"
                type="password"
                required
              />
            </div>
          </div>

          {error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

          <button type="submit" className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:opacity-90">
            Sign In as Vendor
          </button>
        </form>
      </div>
    </div>
  );
}
