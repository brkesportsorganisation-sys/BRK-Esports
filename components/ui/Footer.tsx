'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, ShieldCheck, Zap, Headphones, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white border-t border-slate-200 mt-8 sm:mt-12 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-30"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-24 lg:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-700/50 bg-slate-950 p-0.5">
                <Image src="/logo.png" alt="ESPORTS ZONE BD" width={40} height={40} className="w-full h-full object-cover rounded-[10px]" />
              </div>
              <span className="font-heading font-extrabold text-2xl tracking-wider text-slate-900">
                ESPORTS ZONE <span className="text-brand-orange">BD</span>
              </span>
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed max-w-sm">
              {t('footer_tagline', 'The ultimate competitive esports platform for Free Fire players in South Asia. Compete in daily BR & CS ranked tournaments and build your legacy.')}
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-brand-cyan">
                <ShieldCheck className="w-4 h-4 text-brand-cyan" />
                <span className="font-semibold text-slate-700">{t('footer_anti_cheat', 'Anti-Cheat Secured')}</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-brand-gold">
                <Zap className="w-4 h-4 text-brand-gold" />
                <span className="font-semibold text-slate-700">{t('footer_instant_payouts', 'Instant Payouts')}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-bold text-lg text-slate-900 mb-4 uppercase tracking-wider border-l-2 border-brand-red pl-3">
              {t('footer_platform', 'Platform')}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link href="/tournaments" className="hover:text-brand-orange transition-colors">BR Tournaments</Link></li>
              <li><Link href="/tournaments" className="hover:text-brand-orange transition-colors">CS 4v4 Knockouts</Link></li>
              <li><Link href="/leaderboard" className="hover:text-brand-orange transition-colors">{t('nav_leaderboard', 'Global Ranking')}</Link></li>
              <li><Link href="/community" className="hover:text-brand-orange transition-colors">{t('nav_community', 'Community')}</Link></li>
            </ul>
          </div>

          {/* Legal & Help */}
          <div>
            <h4 className="font-heading font-bold text-lg text-slate-900 mb-4 uppercase tracking-wider border-l-2 border-brand-orange pl-3">
              {t('footer_support_legal', 'Support & Legal')}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link href="/contact" className="hover:text-brand-orange transition-colors">Contact Support</Link></li>
              <li><Link href="/faq" className="hover:text-brand-orange transition-colors">Rules & FAQ</Link></li>
              <li><Link href="/terms" className="hover:text-brand-orange transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-brand-orange transition-colors">Privacy Policy</Link></li>
              <li><Link href="/anti-cheat" className="hover:text-brand-orange transition-colors">Anti-Cheat Policy</Link></li>
            </ul>
          </div>

          {/* Payment Methods */}
          <div>
            <h4 className="font-heading font-bold text-lg text-slate-900 mb-4 uppercase tracking-wider border-l-2 border-brand-gold pl-3">
              {t('footer_banking', 'Supported Banking')}
            </h4>
            <p className="text-xs text-slate-600 mb-4">{t('footer_banking_desc', 'Instant deposit and fast automated withdrawal via trusted local payment partners.')}</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xs font-bold text-pink-600">
                bKash
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xs font-bold text-orange-600">
                Nagad
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-xs font-bold text-purple-600">
                Rocket
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="pt-10 mt-10 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 text-center md:text-left">
          <div suppressHydrationWarning>
            © {new Date().getFullYear()} ESPORTS ZONE BD. {t('footer_copyright', 'All rights reserved. Not affiliated with Garena Free Fire.')}
          </div>
          <div className="flex items-center space-x-6">
            <span className="hover:text-slate-900 cursor-pointer transition-colors flex items-center gap-1">
              <MessageSquare className="w-4 h-4 text-brand-orange" /> {t('footer_discord', 'Discord Community')}
            </span>
            <span className="hover:text-slate-900 cursor-pointer transition-colors flex items-center gap-1">
              <Headphones className="w-4 h-4 text-brand-cyan" /> {t('footer_live_support', '24/7 Live Support')}
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
