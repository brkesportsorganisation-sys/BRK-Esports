'use client';

import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { Mail, MessageSquare, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      <div className="bg-surface/60 border-b border-surface-border py-12 text-center">
        <h1 className="font-heading font-black text-4xl text-white">CONTACT & LIVE SUPPORT</h1>
        <p className="text-gray-400 text-xs mt-1">Our support team is available 24/7 on Discord & Telegram</p>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-surface-border text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-brand-orange mx-auto" />
            <h3 className="font-heading font-bold text-lg text-white">Discord Community</h3>
            <p className="text-xs text-gray-400">Join 10,000+ gamers on our active server</p>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-surface-border text-center space-y-2">
            <Mail className="w-8 h-8 text-brand-red mx-auto" />
            <h3 className="font-heading font-bold text-lg text-white">Email Support</h3>
            <p className="text-xs text-gray-400">support@helian.gg</p>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-surface-border text-center space-y-2">
            <Phone className="w-8 h-8 text-brand-cyan mx-auto" />
            <h3 className="font-heading font-bold text-lg text-white">Helpline</h3>
            <p className="text-xs text-gray-400">+880 1712-998877</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
