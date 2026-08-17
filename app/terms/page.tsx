'use client';

import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { FileText, Shield, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-brand-orange flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Terms of Service</h1>
              <p className="text-xs text-slate-500 font-medium">Last updated: August 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Black Rock Tournaments ("Platform"), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">2. Player Eligibility & Accounts</h2>
              <p>
                Players must register with a genuine Free Fire UID and in-game name. Each individual is allowed one primary account. Multi-accounting, account sharing, or fraudulent transaction details will result in immediate disqualification and account suspension.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">3. Tournament Participation & Entry Fees</h2>
              <p>
                Entry fees for paid tournaments are deducted from your platform wallet. Slot bookings are confirmed on a first-come, first-served basis. If a tournament is cancelled by administration, entry fees are fully refunded to the user's wallet.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">4. Match Rules & Fair Play</h2>
              <p>
                All players must adhere to fair play standards. Any third-party software, emulators without permission, aimbots, wallhacks, or network manipulation are strictly prohibited and monitored by our anti-cheat system.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-heading font-bold text-lg text-slate-900">5. Wallet, Deposits & Withdrawals</h2>
              <p>
                Winning wallet balances can be withdrawn to verified bKash or Nagad accounts. Payouts are reviewed and disbursed in accordance with standard verification protocols. Promo wallet funds are strictly non-withdrawable and reserved for entry fee discounts.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
