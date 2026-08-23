'use client';

import React, { useState } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { HelpCircle, ChevronDown, Trophy, Wallet, Shield, Users } from 'lucide-react';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I join a Free Fire tournament on ESPORTS ZONE BD?',
      a: 'Create an account, ensure your Free Fire UID is registered on your profile, deposit entry fees into your wallet via bKash or Nagad, and select any upcoming tournament on the Tournaments page to book your slot.',
    },
    {
      q: 'When and where will I get the Room ID and Password?',
      a: 'The Room ID and Password are automatically revealed on the tournament details page 10-15 minutes before the match start time for all registered and verified players.',
    },
    {
      q: 'How do cash prize payouts work?',
      a: 'Once match results are verified by administrators, kill rewards and placement prizes are credited directly into your Winning Wallet. You can withdraw your winnings to your personal bKash or Nagad account.',
    },
    {
      q: 'What happens if a match is cancelled or delayed?',
      a: 'If a match is cancelled due to technical issues or server downtime, 100% of your entry fee is automatically refunded back to your platform wallet balance.',
    },
    {
      q: 'What are the rules regarding emulator and third-party tools?',
      a: 'Unless explicitly stated in the tournament rules (e.g. PC specific match), emulators, macro scripts, and third-party aim assists are strictly banned. Violators will face immediate permanent bans.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">Frequently Asked Questions</h1>
              <p className="text-xs text-slate-500 font-medium">Find answers to common tournament and platform questions</p>
            </div>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50 hover:bg-white"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full p-5 text-left font-heading font-bold text-slate-900 flex items-center justify-between gap-4 text-sm sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openIndex === idx ? 'rotate-180 text-brand-orange' : ''}`} />
                </button>
                {openIndex === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
