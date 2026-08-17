'use client';

import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { ShieldAlert, AlertTriangle, CheckCircle, Ban } from 'lucide-react';

export default function AntiCheatPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-brand-red flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Anti-Cheat & Fair Play Policy</h1>
              <p className="text-xs text-slate-500 font-medium">Protecting fair competition for all esports athletes</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <Ban className="w-5 h-5 text-brand-red" /> Zero Tolerance for Cheating
              </h2>
              <p>
                Black Rock Tournaments maintains a strict zero-tolerance policy against hacking, scripting, memory editing, radar tools, wallhacks, auto-aim, and emulator manipulation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Match Surveillance & Verification
              </h2>
              <p>
                All official matches are observed by live tournament marshals. Match replays, kill logs, damage outputs, and statistical anomaly scores are audited before prize pools are distributed.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Penalties & Consequences
              </h2>
              <p>
                Any player or team found violating fair play guidelines will face immediate match forfeiture, total prize cancellation, wallet forfeiture, and a permanent hardware/account ban from all Black Rock sanctioned events.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
