'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';

const DEFAULT_ADMIN_EMAIL = '';
const DEFAULT_ADMIN_PASSWORD = '';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'include' });
        if (res.ok) {
          router.replace('/admin');
        }
      } catch {
        // Ignore and allow the user to log in manually.
      }
    };

    void verifySession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // First check local DB for mock users (Moderator/Admin created in UI)
    const localUser = db.loginWithEmailAndPassword(email, password);
    let requestBody: any = { email, password };
    
    if (localUser && (localUser.role === 'MODERATOR' || localUser.role === 'ADMIN' || localUser.role === 'SUPER_ADMIN')) {
      requestBody = {
        email,
        password,
        clientVerifiedRole: localUser.role,
        clientVerifiedId: localUser.id
      };
      
      // Update the current user in db so AdminShell knows who is logged in
      db.setCurrentUser(localUser);
    }

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.message || 'Authentication failed.');
      return;
    }

    router.replace('/admin');
  };

  return (
    <div className="min-h-screen bg-[#244bb5] flex flex-col items-center justify-center px-4 py-10 relative">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header Area */}
        <div className="bg-[#0b2948] pt-8 pb-6 px-6 flex flex-col items-center justify-center text-center">
          <Shield className="h-6 w-6 text-white mb-3" />
          <h1 className="text-xl font-bold text-white mb-1 tracking-wide">Admin Panel</h1>
          <p className="text-sm font-medium text-slate-300 mb-2">Black Rock</p>
          <p className="text-[10px] text-[#4ea0da]">Secure Administration Access</p>
        </div>

        {/* Form Area */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Username or Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#244bb5] focus:ring-1 focus:ring-[#244bb5]"
                  type="text"
                  placeholder="Enter your username or email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-[#244bb5] focus:ring-1 focus:ring-[#244bb5]"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-md bg-red-50 p-2 text-center text-xs font-medium text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0b2948] py-3 text-sm font-semibold text-white transition hover:bg-[#0a203b] disabled:opacity-70 flex justify-center items-center gap-2 mt-2"
            >
              <Lock className="h-4 w-4" />
              {loading ? 'Authenticating…' : 'Login to Admin Panel'}
            </button>
          </form>
        </div>

        {/* Footer Area */}
        <div className="border-t border-slate-100 bg-slate-50/50 py-4 px-6 text-center flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
            <AlertCircle className="h-3 w-3" />
            <span>Your session will auto-logout after 10 minutes of login</span>
          </div>
          <p className="text-[10px] text-slate-500">For security reasons, you must login fresh each time</p>
        </div>
      </div>
      
      {/* Floating Action Button like in the original image at bottom right */}
      <div className="absolute bottom-6 right-6">
        <div className="h-12 w-12 rounded-full bg-[#1e88e5] flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#1565c0] transition">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
