'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  Bell, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  X, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function HomeInstallSection() {
  const { isBangla } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode (already added to home screen)
    if (typeof window !== 'undefined') {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      // Check iOS user agent
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIos(isIosDevice);

      // Check if prompt already captured by layout/modal
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }

      const promptHandler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        (window as any).deferredPwaPrompt = e;
      };

      const readyHandler = (e: any) => {
        if (e?.detail) setDeferredPrompt(e.detail);
        else if ((window as any).deferredPwaPrompt) setDeferredPrompt((window as any).deferredPwaPrompt);
      };

      const appInstalledHandler = () => {
        setIsInstalled(true);
        setInstallSuccess(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', promptHandler);
      window.addEventListener('pwa-prompt-ready', readyHandler);
      window.addEventListener('appinstalled', appInstalledHandler);

      return () => {
        window.removeEventListener('beforeinstallprompt', promptHandler);
        window.removeEventListener('pwa-prompt-ready', readyHandler);
        window.removeEventListener('appinstalled', appInstalledHandler);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    // If prompt is ready (Android Chrome / Edge / supported desktop)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setInstallSuccess(true);
          localStorage.setItem('pwa_prompt_dismissed', 'true');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowHelpModal(true);
      }
    } else if (isInstalled) {
      // Already installed
      setInstallSuccess(true);
    } else {
      // iOS or browser without prompt event: show guided walkthrough
      setShowHelpModal(true);
    }
  };

  return (
    <>
      <section className="py-4 sm:py-6 bg-slate-100/70 border-b border-slate-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-orange-500/30 p-5 sm:p-7 shadow-2xl shadow-orange-950/20">
            {/* Background Glow Accents */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Left Column: Icon + Text */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 w-full lg:w-auto">
                {/* App Logo with animated glow */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-tr from-orange-500 via-amber-400 to-brand-red shadow-lg shadow-orange-500/30 flex items-center justify-center">
                    <div className="w-full h-full rounded-[14px] bg-slate-950 overflow-hidden relative">
                      <Image
                        src="/logo.png"
                        alt="ESPORTS ZONE BD"
                        fill
                        sizes="80px"
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-slate-900 shadow">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Info Text */}
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[11px] font-black uppercase tracking-wider">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'মোবাইল হোম স্ক্রিন অ্যাপ' : 'OFFICIAL WEB APP'}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight leading-tight">
                    {isBangla
                      ? 'ফোনের হোম স্ক্রিনে অ্যাপটি ইনস্টল করুন'
                      : 'Add ESPORTS ZONE BD to Home Screen'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {isBangla
                      ? 'ব্রাউজারে লিঙ্ক না খুঁজে সরাসরি ফোনের হোম পেজ থেকে ১ ক্লিকে ওপেন করুন। দ্রুততম লোডিং ও ইনস্ট্যান্ট রুম আইডি নোটিফিকেশন পান!'
                      : 'Install our high-speed web app on your phone home screen for instant match alerts, fast deposits & full-screen gaming.'}
                  </p>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[11px] font-semibold text-slate-300">
                    <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {isBangla ? '১ ক্লিকে ওপেন' : 'Instant Launch'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <Bell className="w-3 h-3 text-orange-400" />
                      {isBangla ? 'রুম নোটিফিকেশন' : 'Room ID Alerts'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      {isBangla ? '১০০% নিরাপদ' : 'Safe & Verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Install Button */}
              <div className="shrink-0 flex flex-col items-center sm:items-end w-full sm:w-auto">
                {isInstalled || installSuccess ? (
                  <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
                    <div className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-heading font-black text-sm uppercase tracking-wider w-full sm:w-auto shadow-lg shadow-emerald-950/40">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>{isBangla ? 'হোম স্ক্রিনে ইনস্টল করা আছে' : 'App Installed'}</span>
                    </div>
                    <span className="text-[11px] text-emerald-400/80 font-medium">
                      {isBangla ? '✓ সরাসরি ফোনের হোম পেজ থেকে চালু করুন' : '✓ Active on your home screen'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      id="home-install-app-btn"
                      onClick={handleInstallClick}
                      className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer w-full sm:w-auto"
                    >
                      <Download className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                      <span>{isBangla ? 'হোম স্ক্রিনে রাখুন' : 'Install App'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-[11px] text-slate-400 hover:text-orange-400 underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      {isBangla ? 'কীভাবে ইনস্টল করবেন? নিয়ম দেখুন' : 'How to install? View steps'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guide / Walkthrough Modal for iOS or manual install */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-orange-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-white">
            {/* Close Button */}
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <div>
                <h4 className="font-heading font-black text-lg text-white">
                  {isBangla ? 'হোম স্ক্রিনে যুক্ত করার নিয়ম' : 'How to Add to Home Screen'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isIos 
                    ? (isBangla ? 'আইফোন / Safari ব্রাউজার ব্যবহারকারীদের জন্য' : 'For iPhone / Safari users')
                    : (isBangla ? 'অ্যান্ড্রয়েড ও ক্রোম ব্রাউজার ব্যবহারকারীদের জন্য' : 'For Android & Chrome users')}
                </p>
              </div>
            </div>

            {/* Step by Step Guide */}
            {isIos ? (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-500/30">
                    ১
                  </div>
                  <div>
                    <p className="text-slate-200">
                      Safari ব্রাউজারের নিচে থাকা <span className="inline-flex items-center font-bold text-sky-400"><Share className="w-3.5 h-3.5 mx-1 inline" /> Share (শেয়ার)</span> বাটনে ট্যাপ করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-500/30">
                    ২
                  </div>
                  <div>
                    <p className="text-slate-200">
                      মেনু স্ক্রল করে <span className="inline-flex items-center font-bold text-orange-400"><PlusSquare className="w-3.5 h-3.5 mx-1 inline" /> Add to Home Screen (হোম স্ক্রিনে যোগ করুন)</span> অপশনটি সিলেক্ট করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-500/30">
                    ৩
                  </div>
                  <div>
                    <p className="text-slate-200">
                      উপরে ডান কোণে থাকা <span className="font-bold text-emerald-400">&ldquo;Add&rdquo;</span> বাটনে ক্লিক করুন। অ্যাপটি সাথে সাথে আপনার হোম স্ক্রিনে চলে আসবে!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-500/30">
                    ১
                  </div>
                  <div>
                    <p className="text-slate-200">
                      Chrome ব্রাউজারের উপরে ডান কোণে থাকা <span className="inline-flex items-center font-bold text-sky-400"><MoreVertical className="w-3.5 h-3.5 mx-0.5 inline" /> ৩-ডট (মেনু)</span> আইকনে চাপ দিন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-500/30">
                    ২
                  </div>
                  <div>
                    <p className="text-slate-200">
                      মেন্যু থেকে <span className="inline-flex items-center font-bold text-orange-400"><Download className="w-3.5 h-3.5 mx-1 inline" /> &ldquo;Install app&rdquo;</span> অথবা <span className="font-bold text-amber-400">&ldquo;Add to Home screen&rdquo;</span> সিলেক্ট করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-500/30">
                    ৩
                  </div>
                  <div>
                    <p className="text-slate-200">
                      পপআপে <span className="font-bold text-emerald-400">&ldquo;Install&rdquo;</span> বাটনে ক্লিক করুন। ব্যাস, আপনার ফোনের অ্যাপ লিস্ট ও হোম পেজে এটি অ্যাপ হিসেবে সেভ হয়ে যাবে!
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all cursor-pointer"
            >
              {isBangla ? 'বুঝেছি, ধন্যবাদ' : 'Got it, Thanks!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
