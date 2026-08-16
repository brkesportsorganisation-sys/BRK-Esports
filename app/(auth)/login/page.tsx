'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame, Lock, Mail, ArrowRight, ShieldCheck, Gamepad2 } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@helian.gg');
  const [password, setPassword] = useState('admin123');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = db.loginWithEmailAndPassword(email, password);
    if (found) {
      db.setCurrentUser(found);

      if (found.role === 'ADMIN') {
        router.push('/admin');
        return;
      }

      if (found.role === 'VENDOR') {
        router.push('/vendor');
        return;
      }

      router.push('/profile');
      return;
    }

    alert('Invalid email or password.');
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="glass-card rounded-3xl p-8 max-w-md w-full border-2 border-brand-orange/30 shadow-cyber space-y-6 relative z-10">
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange p-0.5 mx-auto shadow-neon-red">
              <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                <Flame className="w-6 h-6 text-brand-red animate-pulse" />
              </div>
            </div>
            <h2 className="font-heading font-black text-3xl text-white">PLAYER LOGIN</h2>
            <p className="text-xs text-gray-400">Welcome back to Black Rock Championship Arena</p>
          </div>

          {/* Quick Demo Credentials Banner */}
          <div className="p-3 rounded-xl bg-surface-light border border-surface-border text-xs space-y-1 text-gray-300">
            <div className="font-bold text-brand-gold">Demo Quick Login:</div>
            <div>Admin: <code className="text-brand-cyan">admin@helian.gg / admin123</code></div>
            <div>Vendor: <code className="text-brand-cyan">vendor@helian.gg / vendor123</code></div>
            <div>Player: <code className="text-brand-orange">tanvir@gmail.com / player123</code></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-surface-light border border-surface-border rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface-light border border-surface-border rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <span>SIGN IN TO PLAY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-surface-border text-xs text-gray-400">
            Don't have an account?{' '}
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
