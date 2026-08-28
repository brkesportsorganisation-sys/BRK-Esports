'use client';

import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Mail, MessageSquare, Phone, MapPin, Headphones, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
      <Navbar />

      <div className="bg-white border-b border-slate-200 py-12 sm:py-16 text-center space-y-2 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>
        <span className="text-xs font-bold text-brand-red uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-brand-red/20 mb-1">
          <Headphones className="w-3.5 h-3.5 text-brand-red" />
          <span>24/7 Official Support Helpdesk</span>
        </span>
        <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
          CONTACT & LIVE SUPPORT
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Our support team is available 24/7 on Discord, WhatsApp, and Telegram for any tournament assistance.
        </p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="https://discord.gg/blackrock-esports"
            target="_blank"
            rel="noopener noreferrer"
            className="block group cursor-pointer"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">Discord Community</h3>
              <p className="text-xs text-slate-600 font-medium">Join 10,000+ gamers on our active server for instant support & scrims.</p>
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold font-mono">
                discord.gg/blackrock
              </span>
            </div>
          </a>

          <a
            href="https://wa.me/8801700000000?text=Hello%20Black%20Rock%20Esports%20Support"
            target="_blank"
            rel="noopener noreferrer"
            className="block group cursor-pointer"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 group-hover:text-emerald-600 transition-colors">WhatsApp Helpline</h3>
              <p className="text-xs font-mono font-bold text-emerald-600">+880 1700-000000</p>
              <p className="text-[11px] text-slate-600 font-medium">Instant deposit & room ID live help</p>
            </div>
          </a>

          <a
            href="mailto:support@esportszonebd.online"
            className="block group cursor-pointer"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-500 transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center mx-auto border border-red-100 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 group-hover:text-brand-red transition-colors">Email Support</h3>
              <p className="text-xs font-mono font-bold text-slate-700">support@esportszonebd.online</p>
              <p className="text-[11px] text-slate-600 font-medium">Official business & sponsorship</p>
            </div>
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
