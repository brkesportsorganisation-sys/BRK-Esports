'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  MapPin, 
  Mail, 
  Phone, 
  Send, 
  Check, 
  MessageCircle,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
      }, 3000);
    }
  };

  return (
    <footer className="w-full bg-[#0D1527] text-white mt-12 relative overflow-hidden font-sans">
      
      {/* ── 1. Top Newsletter Banner (Vibrant Royal Blue Card) ── */}
      <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b border-blue-500/20">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-lg mx-auto leading-relaxed">
            Get the latest updates on new tournaments, diamond top-up offers and upcoming gaming sales.
          </p>

          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white shadow-md font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs sm:text-sm font-black transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
            >
              {subscribed ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-4 h-4" /> Subscribed
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── 2. Main Footer Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 sm:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Info & Socials */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="font-heading font-black text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
                ESPORTS ZONE <span className="text-blue-400">BD</span>
              </span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Your trusted esports tournament & online gaming shop destination in Bangladesh.
            </p>

            {/* Social Icons (Blue, Cyan, Red circle buttons) */}
            <div className="flex items-center gap-2.5 pt-1">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#1877F2] hover:brightness-110 flex items-center justify-center text-white text-xs font-black transition-transform hover:scale-110 shadow-sm"
                title="Facebook"
              >
                f
              </a>

              {/* LinkedIn / Discord */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#0A66C2] hover:brightness-110 flex items-center justify-center text-white text-xs font-black transition-transform hover:scale-110 shadow-sm font-serif"
                title="LinkedIn"
              >
                in
              </a>

              {/* YouTube / Media */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-[#FF0000] hover:brightness-110 flex items-center justify-center text-white text-xs font-black transition-transform hover:scale-110 shadow-sm"
                title="YouTube"
              >
                Y
              </a>
            </div>
          </div>

          {/* Column 1: Quick Links */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm text-white tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/faq" className="hover:text-blue-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-400 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: My Account */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm text-white tracking-wide">
              My Account
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/login" className="hover:text-blue-400 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-blue-400 transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-blue-400 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-blue-400 transition-colors">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Us */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm text-white tracking-wide">
              Contact Us
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <a href="mailto:support@esportszonebd.com" className="hover:text-blue-400 transition-colors">
                  support@esportszonebd.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                <a href="tel:+8801847853867" className="hover:text-blue-400 transition-colors">
                  +880 1847853867
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── 3. Bottom Copyright Bar ── */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ESPORTS ZONE BD. All rights reserved.</p>
        </div>

      </div>

      {/* Floating Chat Support Bubble */}
      <a
        href="/support"
        className="fixed bottom-20 sm:bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 hover:scale-110 active:scale-95 transition-all cursor-pointer"
        title="Live Support Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

    </footer>
  );
}
