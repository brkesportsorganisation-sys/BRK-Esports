'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Sparkles, ShieldCheck } from 'lucide-react';

export default function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration notice:', err);
      });
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-orange-500/40 rounded-3xl p-5 shadow-2xl shadow-orange-950/40 animate-slideUp">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center border border-orange-500/40 bg-slate-950 p-0.5 shadow-lg shadow-orange-500/20 flex-shrink-0">
            <img src="/logo.png?v=3" alt="ESPORTS ZONE BD" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white flex items-center gap-1.5">
              Install ESPORTS ZONE BD App
            </h4>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
              Install our high-speed mobile app for instant match alerts & fast deposits!
            </p>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
        <button
          onClick={handleDismiss}
          className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          Not Now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Install App
        </button>
      </div>
    </div>
  );
}
