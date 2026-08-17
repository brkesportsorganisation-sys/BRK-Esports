'use client';

import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { ShieldCheck, Lock, Eye } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Privacy Policy</h1>
              <p className="text-xs text-slate-500 font-medium">Last updated: August 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">1. Information We Collect</h2>
              <p>
                We collect your email, in-game nickname, Free Fire UID, and transaction identifiers necessary to operate tournament registrations, process payouts, and safeguard platform integrity.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">2. How We Protect Your Data</h2>
              <p>
                Passwords and sensitive account tokens are encrypted using industry-standard hashing. Financial records and payment transaction receipts are strictly isolated and accessible only to authorized administrators.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">3. Third-Party Services</h2>
              <p>
                We utilize Supabase, Firebase Authentication, and trusted payment gateways to provide seamless authentication and transaction services. We do not sell or trade your personal data to external advertisers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">4. Contact & Data Deletion</h2>
              <p>
                Users have the right to request deletion of their account and associated gameplay data by reaching out to our support desk or submitting an account closure request.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
