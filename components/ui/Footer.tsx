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
  return (
    <footer className="w-full bg-[#0D1527] text-white mt-12 relative overflow-hidden font-sans">
      {/* ── Main Footer Content ── */}
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

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
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
            <ul className="space-y-2 text-xs text-slate-300">
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
            <ul className="space-y-2 text-xs text-slate-300">
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
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <a href="mailto:support@esportszonebd.online" className="hover:text-blue-400 transition-colors">
                  support@esportszonebd.online
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
        <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-300">
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
