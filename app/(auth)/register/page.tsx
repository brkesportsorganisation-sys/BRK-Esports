'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Flame, Lock, Mail, User as UserIcon, Gamepad2, ArrowRight } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User } from '@/lib/types';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [ign, setIgn] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      password,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      role: 'USER',
      freeFireUid: ffUid,
      inGameName: ign,
      walletBalance: 100, // Sign up bonus
      coinBalance: 0,
      totalKills: 0,
      totalWins: 0,
      earnings: 0,
      isBanned: false,
      referralCode: `REF_${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };

    if (refCode) {
      db.incrementReferral(refCode);
    }

    db.getUsers().push(newUser);
    db.setCurrentUser(newUser);
    router.push('/profile');
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16 relative overflow-hidden">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full border-2 border-brand-orange/30 shadow-cyber space-y-6 relative z-10">
          
          <div className="text-center space-y-2">
            <h2 className="font-heading font-black text-3xl text-white">PLAYER REGISTRATION</h2>
            <p className="text-xs text-gray-400">Join Black Rock Tournaments & get ৳100 signup bonus!</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-xs text-white"
                placeholder="e.g. Tanvir Hossain"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-xs text-white"
                placeholder="e.g. player@gmail.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Free Fire UID</label>
                <input
                  type="text"
                  value={ffUid}
                  onChange={(e) => setFfUid(e.target.value)}
                  required
                  className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                  placeholder="1029384756"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">In-Game Name</label>
                <input
                  type="text"
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  required
                  className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-xs text-white"
                  placeholder="VIP_TANVIR_FF"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-xs text-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold text-white font-heading font-black text-sm shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-2"
            >
              <span>CREATE ACCOUNT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-surface-border text-xs text-gray-400">
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
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
