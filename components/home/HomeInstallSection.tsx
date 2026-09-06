'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  X 
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function HomeInstallSection() {
  const { isBangla } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIos(isIosDevice);

      const win = window as any;
      if (win.__deferredPwaPrompt) {
        setDeferredPrompt(win.__deferredPwaPrompt);
      } else if (win.deferredPwaPrompt) {
        setDeferredPrompt(win.deferredPwaPrompt);
      }

      const promptHandler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        win.__deferredPwaPrompt = e;
      };

      const capturedHandler = (e: any) => {
        if (e?.detail) setDeferredPrompt(e.detail);
        else if (win.__deferredPwaPrompt) setDeferredPrompt(win.__deferredPwaPrompt);
      };

      const appInstalledHandler = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).__deferredPwaPrompt = null;
        }
      };

      window.addEventListener('beforeinstallprompt', promptHandler);
      window.addEventListener('pwa-prompt-captured', capturedHandler);
      window.addEventListener('pwa-prompt-ready', capturedHandler);
      window.addEventListener('appinstalled', appInstalledHandler);

      return () => {
        window.removeEventListener('beforeinstallprompt', promptHandler);
        window.removeEventListener('pwa-prompt-captured', capturedHandler);
        window.removeEventListener('pwa-prompt-ready', capturedHandler);
        window.removeEventListener('appinstalled', appInstalledHandler);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    const win = typeof window !== 'undefined' ? (window as any) : null;
    const prompt = deferredPrompt || win?.__deferredPwaPrompt || win?.deferredPwaPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('pwa_prompt_dismissed', 'true');
        }
        setDeferredPrompt(null);
        if (win) {
          win.__deferredPwaPrompt = null;
          win.deferredPwaPrompt = null;
        }
        return;
      } catch (err) {
        console.warn('Install error:', err);
      }
    }

    if (isInstalled) {
      alert(isBangla ? 'অ্যাপটি আপনার ডিভাইসে অলরেডি ইনস্টল করা আছে!' : 'App is already installed on your device!');
      return;
    }

    // Only if prompt is unavailable (e.g. real iOS Safari)
    setShowHelpModal(true);
  };

  // If already running inside installed standalone app, hide it cleanly
  if (isInstalled && !showHelpModal) return null;

  return (
    <>
      {/* Compact & slim install button bar */}
      <div className="w-full max-w-md mx-auto px-4 py-2">
        <button
          type="button"
          id="home-quick-install-btn"
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-orange-500/40 hover:border-orange-500 shadow-md shadow-orange-950/20 active:scale-[0.98] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-xl p-0.5 bg-gradient-to-tr from-orange-500 to-amber-400 shrink-0">
              <div className="w-full h-full rounded-[9px] bg-slate-950 overflow-hidden relative">
                <Image
                  src="/logo.png"
                  alt="EZBD"
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-heading text-white tracking-wide truncate">
                  {isBangla ? 'অ্যাপ ইনস্টল করুন' : 'Install EZBD App'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  FAST
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {isBangla ? '১-ক্লিকে হোম স্ক্রিনে যোগ করুন' : 'Instant 1-click home screen access'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 group-hover:from-orange-600 group-hover:to-amber-600 text-slate-950 text-xs font-black shadow-sm transition-all">
            <Download className="w-3.5 h-3.5" />
            <span>{isBangla ? 'ইনস্টল' : 'Install'}</span>
          </div>
        </button>
      </div>

      {/* Guide / Walkthrough Modal for iOS or manual install */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-orange-500/40 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 text-white">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 p-0.5 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-orange-400" />
                </div>
              </div>
              <div>
                <h4 className="font-heading font-black text-base text-white">
                  {isBangla ? 'অ্যাপ ইনস্টল করার নিয়ম' : 'How to Install App'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isIos 
                    ? (isBangla ? 'iPhone / Safari ব্রাউজার' : 'For iPhone / Safari')
                    : (isBangla ? 'Android / Chrome ব্রাউজার' : 'For Android / Chrome')}
                </p>
              </div>
            </div>

            {isIos ? (
              <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ১
                  </div>
                  <p className="text-slate-200">
                    সাফারির নিচে থাকা <span className="font-bold text-sky-400"><Share className="w-3 h-3 mx-0.5 inline" /> Share</span> বাটনে ট্যাপ করুন।
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ২
                  </div>
                  <p className="text-slate-200">
                    মেনু স্ক্রল করে <span className="font-bold text-orange-400"><PlusSquare className="w-3 h-3 mx-0.5 inline" /> Add to Home Screen</span> সিলেক্ট করুন।
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ৩
                  </div>
                  <p className="text-slate-200">
                    উপরে ডানে <span className="font-bold text-emerald-400">&ldquo;Add&rdquo;</span> চাপলেই অ্যাপটি আপনার ফোনে চলে আসবে!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ১
                  </div>
                  <p className="text-slate-200">
                    ব্রাউজারের উপরে ডান কোণে <span className="font-bold text-sky-400"><MoreVertical className="w-3 h-3 mx-0.5 inline" /> ৩-ডট</span> মেন্যুতে চাপ দিন।
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ২
                  </div>
                  <p className="text-slate-200">
                    <span className="font-bold text-orange-400"><Download className="w-3 h-3 mx-0.5 inline" /> &ldquo;Install app&rdquo;</span> বা <span className="font-bold text-amber-400">&ldquo;Add to Home screen&rdquo;</span> চাপুন।
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    ৩
                  </div>
                  <p className="text-slate-200">
                    <span className="font-bold text-emerald-400">&ldquo;Install&rdquo;</span> করলেই অ্যাপ হিসেবে ফোনে সেভ হয়ে যাবে!
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all cursor-pointer"
            >
              {isBangla ? 'ঠিক আছে' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
